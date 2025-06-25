import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCurrentTenant } from '@/lib/get-tenant';
import { stripe, formatAmountForStripe } from '@/lib/stripe';
import { calculateTax } from '@/lib/tax-calculator';

// GET - Get auto-recharge settings
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenant } = await getCurrentTenant();
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const { data: settings, error } = await supabase
      .from('auto_recharge_settings')
      .select(`
        *,
        payment_methods (
          id,
          card_brand,
          card_last4,
          card_exp_month,
          card_exp_year
        )
      `)
      .eq('tenant_id', tenant.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching auto-recharge settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    return NextResponse.json({ settings: settings || null });
  } catch (error) {
    console.error('Error in auto-recharge GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Update auto-recharge settings
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenant } = await getCurrentTenant();
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const { 
      isEnabled, 
      minimumBalance, 
      rechargeAmount, 
      paymentMethodId,
      triggerNow 
    } = await req.json();

    if (triggerNow) {
      // Trigger auto-recharge immediately
      return await triggerAutoRecharge(tenant.id, supabase);
    }

    // Validate inputs
    if (isEnabled && (!minimumBalance || !rechargeAmount || !paymentMethodId)) {
      return NextResponse.json({ 
        error: 'Minimum balance, recharge amount, and payment method are required when enabling auto-recharge' 
      }, { status: 400 });
    }

    // Upsert auto-recharge settings
    const { data: settings, error } = await supabase
      .from('auto_recharge_settings')
      .upsert({
        tenant_id: tenant.id,
        is_enabled: isEnabled,
        minimum_balance: minimumBalance || 100,
        recharge_amount: rechargeAmount || 1000,
        payment_method_id: paymentMethodId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating auto-recharge settings:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json({ settings, success: true });
  } catch (error) {
    console.error('Error in auto-recharge POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Function to trigger auto-recharge
async function triggerAutoRecharge(tenantId: string, supabase: any) {
  try {
    // Get current balance
    const { data: currentBalance, error: balanceError } = await supabase
      .rpc('get_tenant_credit_balance', { tenant_id_param: tenantId });

    if (balanceError) {
      console.error('Error getting balance:', balanceError);
      return NextResponse.json({ error: 'Failed to get balance' }, { status: 500 });
    }

    // Get auto-recharge settings
    const { data: settings, error: settingsError } = await supabase
      .from('auto_recharge_settings')
      .select(`
        *,
        payment_methods (
          stripe_payment_method_id,
          stripe_customer_id
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('is_enabled', true)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json({ error: 'Auto-recharge not enabled or configured' }, { status: 400 });
    }

    // Check if recharge is needed
    if (currentBalance > settings.minimum_balance) {
      return NextResponse.json({ 
        message: 'Auto-recharge not needed', 
        currentBalance,
        minimumBalance: settings.minimum_balance 
      });
    }

    // Get credit package that matches the recharge amount (or closest)
    const { data: creditPackage, error: packageError } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('is_active', true)
      .gte('credits', settings.recharge_amount)
      .order('credits', { ascending: true })
      .limit(1)
      .single();

    if (packageError || !creditPackage) {
      console.error('Error finding suitable credit package:', packageError);
      return NextResponse.json({ error: 'No suitable credit package found' }, { status: 400 });
    }

    // Calculate tax for auto-recharge
    const taxCalculation = calculateTax(creditPackage.price_usd_cents);
    const totalAmountWithTax = creditPackage.price_usd_cents + taxCalculation.taxAmount;

    // Create payment intent for auto-recharge
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountWithTax,
      currency: 'usd',
      customer: settings.payment_methods.stripe_customer_id,
      payment_method: settings.payment_methods.stripe_payment_method_id,
      confirmation_method: 'automatic',
      confirm: true,
      off_session: true, // This indicates it's for a saved card
      metadata: {
        tenant_id: tenantId,
        credits: creditPackage.credits.toString(),
        description: `Auto-recharge: ${creditPackage.name} - ${creditPackage.credits} credits`,
        is_auto_recharge: 'true',
        subtotal_usd_cents: creditPackage.price_usd_cents.toString(),
        tax_amount_usd_cents: Math.round(taxCalculation.taxAmount * 100).toString(),
        tax_rate: taxCalculation.taxRate.toString(),
        tax_name: taxCalculation.taxName,
        tax_description: taxCalculation.taxDescription,
        total_amount_usd_cents: totalAmountWithTax.toString(),
      },
    });

    // Save payment record
    await supabase
      .from('payment_history')
      .insert({
        tenant_id: tenantId,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: settings.payment_methods.stripe_customer_id,
        payment_method_id: settings.payment_method_id,
        amount_usd_cents: totalAmountWithTax,
        subtotal_usd_cents: creditPackage.price_usd_cents,
        tax_amount_usd_cents: Math.round(taxCalculation.taxAmount * 100),
        tax_rate: taxCalculation.taxRate,
        credits_purchased: creditPackage.credits,
        status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'pending',
        is_auto_recharge: true,
        stripe_metadata: paymentIntent.metadata,
      });

    // Update last triggered timestamp
    await supabase
      .from('auto_recharge_settings')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('tenant_id', tenantId);

    // If payment succeeded immediately, add credits
    if (paymentIntent.status === 'succeeded') {
      const { data: success, error: creditError } = await supabase
        .rpc('update_credits', {
          tenant_id_param: tenantId,
          amount_param: creditPackage.credits,
          transaction_type_param: 'purchase',
          description_param: `Auto-recharge: ${creditPackage.name} - ${creditPackage.credits} credits`,
          reference_id_param: paymentIntent.id
        });

      if (creditError || !success) {
        console.error('Error adding auto-recharge credits:', creditError);
      }
    }

    return NextResponse.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      creditsAdded: paymentIntent.status === 'succeeded' ? creditPackage.credits : 0,
      subtotal: creditPackage.price_usd_cents / 100,
      taxAmount: taxCalculation.taxAmount / 100,
      totalAmount: totalAmountWithTax / 100,
      taxName: taxCalculation.taxName,
      taxRate: taxCalculation.taxRate,
    });

  } catch (error) {
    console.error('Error triggering auto-recharge:', error);
    
    // Handle specific Stripe errors
    if (error instanceof Error && 'type' in error) {
      const stripeError = error as any;
      if (stripeError.type === 'StripeCardError') {
        return NextResponse.json({ 
          error: 'Card payment failed', 
          details: stripeError.message 
        }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Auto-recharge failed' }, { status: 500 });
  }
} 