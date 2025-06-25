import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  // Verify this is a cron request
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  
  try {
    console.log('Starting auto-recharge check process...');
    
    // Get all tenants with auto-recharge enabled
    const { data: autoRechargeSettings, error: fetchError } = await supabase
      .from('auto_recharge_settings')
      .select(`
        *,
        payment_methods (
          stripe_payment_method_id,
          stripe_customer_id,
          card_brand,
          card_last4
        )
      `)
      .eq('is_enabled', true);

    if (fetchError) {
      console.error('Error fetching auto-recharge settings:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch auto-recharge settings' }, { status: 500 });
    }

    if (!autoRechargeSettings || autoRechargeSettings.length === 0) {
      console.log('No tenants with auto-recharge enabled');
      return NextResponse.json({ 
        message: 'No tenants with auto-recharge enabled',
        processed: 0 
      });
    }

    console.log(`Found ${autoRechargeSettings.length} tenants with auto-recharge enabled`);

    const results = {
      processed: 0,
      recharged: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each tenant
    for (const settings of autoRechargeSettings) {
      try {
        // Get current credit balance
        const { data: currentBalance, error: balanceError } = await supabase
          .rpc('get_tenant_credit_balance', { 
            tenant_id_param: settings.tenant_id 
          });

        if (balanceError) {
          console.error(`Error checking balance for tenant ${settings.tenant_id}:`, balanceError);
          results.failed++;
          results.errors.push(`Balance check failed for tenant ${settings.tenant_id}`);
          continue;
        }

        const balance = currentBalance || 0;
        results.processed++;

        // Check if recharge is needed
        if (balance > settings.minimum_balance) {
          console.log(`Tenant ${settings.tenant_id}: Balance ${balance} > threshold ${settings.minimum_balance}, skipping`);
          results.skipped++;
          continue;
        }

        // Check if payment method is available
        if (!settings.payment_methods || !settings.payment_methods.stripe_payment_method_id) {
          console.error(`Tenant ${settings.tenant_id}: No valid payment method`);
          results.failed++;
          results.errors.push(`No payment method for tenant ${settings.tenant_id}`);
          continue;
        }

        // Check last triggered time to avoid too frequent recharges (minimum 1 hour apart)
        if (settings.last_triggered_at) {
          const lastTriggered = new Date(settings.last_triggered_at);
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          
          if (lastTriggered > oneHourAgo) {
            console.log(`Tenant ${settings.tenant_id}: Auto-recharge triggered less than 1 hour ago, skipping`);
            results.skipped++;
            continue;
          }
        }

        console.log(`Triggering auto-recharge for tenant ${settings.tenant_id}: Balance ${balance} <= threshold ${settings.minimum_balance}`);

        // Trigger auto-recharge
        const rechargeResult = await triggerAutoRecharge(settings, supabase);
        
        if (rechargeResult.success) {
          results.recharged++;
          console.log(`Auto-recharge successful for tenant ${settings.tenant_id}: ${rechargeResult.creditsAdded} credits added`);
        } else {
          results.failed++;
          results.errors.push(`Auto-recharge failed for tenant ${settings.tenant_id}: ${rechargeResult.error}`);
        }

      } catch (error) {
        console.error(`Unexpected error processing tenant ${settings.tenant_id}:`, error);
        results.failed++;
        results.errors.push(`Unexpected error for tenant ${settings.tenant_id}`);
      }
    }

    console.log('Auto-recharge check completed:', results);

    return NextResponse.json({
      message: 'Auto-recharge check completed',
      ...results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Fatal error in auto-recharge check:', error);
    return NextResponse.json({ 
      error: 'Auto-recharge check process failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function triggerAutoRecharge(settings: any, supabase: any) {
  try {
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
      return { success: false, error: 'No suitable credit package found' };
    }

    // Create payment intent for auto-recharge
    const paymentIntent = await stripe.paymentIntents.create({
      amount: creditPackage.price_usd_cents,
      currency: 'usd',
      customer: settings.payment_methods.stripe_customer_id,
      payment_method: settings.payment_methods.stripe_payment_method_id,
      confirmation_method: 'automatic',
      confirm: true,
      off_session: true, // This indicates it's for a saved card
      metadata: {
        tenant_id: settings.tenant_id,
        credits: creditPackage.credits.toString(),
        description: `Auto-recharge: ${creditPackage.name} - ${creditPackage.credits} credits`,
        is_auto_recharge: 'true',
        triggered_by: 'cron_job'
      },
    });

    // Save payment record
    await supabase
      .from('payment_history')
      .insert({
        tenant_id: settings.tenant_id,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: settings.payment_methods.stripe_customer_id,
        payment_method_id: settings.payment_method_id,
        amount_usd_cents: creditPackage.price_usd_cents,
        credits_purchased: creditPackage.credits,
        status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'pending',
        is_auto_recharge: true,
        stripe_metadata: paymentIntent.metadata,
      });

    // Update last triggered timestamp
    await supabase
      .from('auto_recharge_settings')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('tenant_id', settings.tenant_id);

    // If payment succeeded immediately, add credits
    if (paymentIntent.status === 'succeeded') {
      const { data: success, error: creditError } = await supabase
        .rpc('update_credits', {
          tenant_id_param: settings.tenant_id,
          amount_param: creditPackage.credits,
          transaction_type_param: 'purchase',
          description_param: `Auto-recharge: ${creditPackage.name} - ${creditPackage.credits} credits`,
          reference_id_param: paymentIntent.id
        });

      if (creditError || !success) {
        console.error('Error adding auto-recharge credits:', creditError);
        return { success: false, error: 'Failed to add credits after successful payment' };
      }

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        creditsAdded: creditPackage.credits,
        amount: creditPackage.price_usd_cents / 100,
      };
    } else {
      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        creditsAdded: 0, // Will be added when webhook confirms
        amount: creditPackage.price_usd_cents / 100,
        status: paymentIntent.status
      };
    }

  } catch (error) {
    console.error('Error in triggerAutoRecharge:', error);
    
    // Handle specific Stripe errors
    if (error instanceof Error && 'type' in error) {
      const stripeError = error as any;
      if (stripeError.type === 'StripeCardError') {
        return { 
          success: false, 
          error: `Card payment failed: ${stripeError.message}` 
        };
      }
    }

    return { success: false, error: 'Auto-recharge processing failed' };
  }
} 