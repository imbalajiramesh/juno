import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCurrentTenant } from '@/lib/get-tenant';
import { stripe, formatAmountForStripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenant } = await getCurrentTenant();
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const { packageId, useCustomAmount, customAmount, customCredits } = await req.json();

    let amount: number;
    let credits: number;
    let description: string;

    if (useCustomAmount && customAmount && customCredits) {
      // Custom amount
      amount = customAmount;
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

      amount = creditPackage.price_usd_cents / 100;
      credits = creditPackage.credits;
      description = `${creditPackage.name} - ${credits} credits`;
    } else {
      return NextResponse.json({ error: 'Missing package or custom amount' }, { status: 400 });
    }

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

    // Check if tax should be enabled based on configuration
    const taxEnabledCountries = process.env.TAX_ENABLED_COUNTRIES?.split(',') || [];
    const enableTaxCalculation = taxEnabledCountries.length > 0;

    // Create checkout session with conditional tax calculation
    const sessionConfig: any = {
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: description,
              description: `${credits} communication credits for your account`,
              metadata: {
                tenant_id: tenant.id,
                credits: credits.toString(),
              },
            },
            unit_amount: formatAmountForStripe(amount),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/credits?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/credits?canceled=true`,
      
      // Store metadata for webhook processing
      metadata: {
        tenant_id: tenant.id,
        credits: credits.toString(),
        description,
        package_id: packageId || '',
      },
      
      // Payment method options
      payment_method_types: ['card'],
      
      // Customer can save payment method for future use
      payment_intent_data: {
        setup_future_usage: 'off_session',
        metadata: {
          tenant_id: tenant.id,
          credits: credits.toString(),
          description,
        },
      },
    };

    // Only add tax configuration if enabled
    if (enableTaxCalculation) {
      sessionConfig.automatic_tax = {
        enabled: true,
      };
      // Collect customer address for tax calculation
      sessionConfig.billing_address_collection = 'required';
      // Allow business customers to provide tax IDs
      sessionConfig.tax_id_collection = {
        enabled: true,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Save payment record with session ID
    await supabase
      .from('payment_history')
      .insert({
        tenant_id: tenant.id,
        stripe_payment_intent_id: session.payment_intent as string,
        stripe_customer_id: stripeCustomerId,
        amount_usd_cents: formatAmountForStripe(amount),
        credits_purchased: credits,
        status: 'pending',
        is_auto_recharge: false,
        stripe_metadata: session.metadata,
      });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 