import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCurrentTenant } from '@/lib/get-tenant';
import { stripe, formatAmountForStripe } from '@/lib/stripe';
import { calculateTax, shouldApplyTax, formatTaxDisplay } from '@/lib/tax-calculator';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenant } = await getCurrentTenant();
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const { packageId, useCustomAmount, customAmount, customCredits } = await req.json();

    let subtotal: number;
    let credits: number;
    let description: string;

    if (useCustomAmount && customAmount && customCredits) {
      // Custom amount
      subtotal = customAmount;
      credits = customCredits;
      description = `Custom credit purchase: ${credits} credits`;
    } else if (packageId) {
      // Predefined package
      const { data: creditPackage, error } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('id', packageId)
        .eq('is_active', true)
        .single();

      if (error || !creditPackage) {
        return NextResponse.json({ error: 'Invalid credit package' }, { status: 400 });
      }

      subtotal = creditPackage.price_usd_cents / 100;
      credits = creditPackage.credits;
      description = `${creditPackage.name} - ${credits} credits`;
    } else {
      return NextResponse.json({ error: 'Missing package or custom amount' }, { status: 400 });
    }

    // Calculate tax (Ontario HST) - keeping USD pricing
    const taxCalculation = calculateTax(subtotal);
    const totalAmount = taxCalculation.total;
    const taxDisplay = formatTaxDisplay(taxCalculation, 'USD'); // Keep USD display

    // Get or create Stripe customer
    let { data: stripeCustomer, error: customerError } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('tenant_id', tenant.id)
      .single();

    let stripeCustomerId: string;

    if (customerError || !stripeCustomer) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        metadata: {
          tenant_id: tenant.id,
          tenant_name: tenant.name || '',
        },
      });

      // Save to database
      const { error: insertError } = await supabase
        .from('stripe_customers')
        .insert({
          tenant_id: tenant.id,
          stripe_customer_id: customer.id,
        });

      if (insertError) {
        console.error('Error saving Stripe customer:', insertError);
        return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
      }

      stripeCustomerId = customer.id;
    } else {
      stripeCustomerId = stripeCustomer.stripe_customer_id;
    }

    // Create payment intent with manual tax calculation (USD pricing)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: formatAmountForStripe(totalAmount),
      currency: 'usd', // Keep USD for international pricing
      customer: stripeCustomerId,
      setup_future_usage: 'off_session', // Save payment method for future use
      metadata: {
        tenant_id: tenant.id,
        credits: credits.toString(),
        description,
        subtotal_usd: subtotal.toString(),
        tax_amount_usd: taxCalculation.taxAmount.toString(),
        tax_rate: taxCalculation.taxRate.toString(),
        tax_name: taxCalculation.taxName,
        currency: 'USD',
        tax_jurisdiction: 'Ontario, Canada',
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Save payment record with tax information
    await supabase
      .from('payment_history')
      .insert({
        tenant_id: tenant.id,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: stripeCustomerId,
        amount_usd_cents: formatAmountForStripe(totalAmount), // Total including tax
        credits_purchased: credits,
        status: 'pending',
        is_auto_recharge: false,
        stripe_metadata: {
          ...paymentIntent.metadata,
          subtotal_usd: subtotal.toString(),
          tax_amount_usd: taxCalculation.taxAmount.toString(),
          currency: 'USD',
        },
      });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      taxCalculation: {
        subtotal: taxCalculation.subtotal,
        taxAmount: taxCalculation.taxAmount,
        total: taxCalculation.total,
        taxRate: taxCalculation.taxRate,
        taxName: taxCalculation.taxName,
        currency: 'USD',
      },
      display: taxDisplay,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 