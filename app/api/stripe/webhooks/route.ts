import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get('stripe-signature');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object, supabase);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object, supabase);
        break;
      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object, supabase);
        break;
      case 'customer.updated':
        await handleCustomerUpdated(event.data.object, supabase);
        break;
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object, supabase);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, supabase: any) {
  try {
    const tenantId = paymentIntent.metadata.tenant_id;
    const credits = parseInt(paymentIntent.metadata.credits);
    const description = paymentIntent.metadata.description;

    // Prepare tax data from metadata (if available)
    const taxData: any = {};
    if (paymentIntent.metadata.subtotal_usd_cents) {
      taxData.subtotal_usd_cents = parseInt(paymentIntent.metadata.subtotal_usd_cents);
    }
    if (paymentIntent.metadata.tax_amount_usd_cents) {
      taxData.tax_amount_usd_cents = parseInt(paymentIntent.metadata.tax_amount_usd_cents);
    }
    if (paymentIntent.metadata.tax_rate) {
      taxData.tax_rate = parseFloat(paymentIntent.metadata.tax_rate);
    }

    // Update payment history
    const { error: paymentError } = await supabase
      .from('payment_history')
      .update({ 
        status: 'succeeded',
        ...taxData
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (paymentError) {
      console.error('Error updating payment history:', paymentError);
      throw paymentError;
    }

    // Add credits to tenant's account
    const { data: success, error: creditError } = await supabase
      .rpc('update_credits', {
        tenant_id_param: tenantId,
        amount_param: credits,
        transaction_type_param: 'purchase',
        description_param: description,
        reference_id_param: paymentIntent.id
      });

    if (creditError || !success) {
      console.error('Error adding credits:', creditError);
      throw creditError;
    }

    // If payment method was attached, save it
    if (paymentIntent.payment_method) {
      const paymentMethodId = typeof paymentIntent.payment_method === 'string' 
        ? paymentIntent.payment_method 
        : paymentIntent.payment_method.id;
      await savePaymentMethod(paymentMethodId, tenantId, supabase);
    }

    console.log(`Credits added successfully for tenant ${tenantId}: ${credits} credits`);
  } catch (error) {
    console.error('Error in handlePaymentIntentSucceeded:', error);
    throw error;
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent, supabase: any) {
  try {
    // Update payment history
    const { error } = await supabase
      .from('payment_history')
      .update({ status: 'failed' })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (error) {
      console.error('Error updating failed payment:', error);
      throw error;
    }

    console.log(`Payment failed for intent: ${paymentIntent.id}`);
  } catch (error) {
    console.error('Error in handlePaymentIntentFailed:', error);
    throw error;
  }
}

async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod, supabase: any) {
  try {
    if (paymentMethod.customer && paymentMethod.card) {
      // Get tenant ID from customer
      const { data: customer, error: customerError } = await supabase
        .from('stripe_customers')
        .select('tenant_id')
        .eq('stripe_customer_id', paymentMethod.customer)
        .single();

      if (customerError || !customer) {
        console.error('Error finding customer:', customerError);
        return;
      }

      await savePaymentMethod(paymentMethod.id, customer.tenant_id, supabase);
    }
  } catch (error) {
    console.error('Error in handlePaymentMethodAttached:', error);
    throw error;
  }
}

async function handleCustomerUpdated(customer: Stripe.Customer, supabase: any) {
  try {
    // Update customer information if needed
    console.log(`Customer updated: ${customer.id}`);
  } catch (error) {
    console.error('Error in handleCustomerUpdated:', error);
    throw error;
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, supabase: any) {
  try {
    const tenantId = session.metadata?.tenant_id;
    const credits = parseInt(session.metadata?.credits || '0');
    const description = session.metadata?.description || 'Credit purchase';

    if (!tenantId || !credits) {
      console.error('Missing metadata in checkout session:', session.id);
      return;
    }

    // Update payment history
    if (session.payment_intent) {
      const paymentIntentId = typeof session.payment_intent === 'string' 
        ? session.payment_intent 
        : session.payment_intent.id;

      // Prepare tax data from metadata (if available)
      const taxData: any = {};
      if (session.metadata?.subtotal_usd_cents) {
        taxData.subtotal_usd_cents = parseInt(session.metadata.subtotal_usd_cents);
      }
      if (session.metadata?.tax_amount_usd_cents) {
        taxData.tax_amount_usd_cents = parseInt(session.metadata.tax_amount_usd_cents);
      }
      if (session.metadata?.tax_rate) {
        taxData.tax_rate = parseFloat(session.metadata.tax_rate);
      }

      const { error: paymentError } = await supabase
        .from('payment_history')
        .update({ 
          status: 'succeeded',
          ...taxData,
          stripe_metadata: {
            ...session.metadata,
            session_id: session.id,
            amount_total: session.amount_total,
            amount_subtotal: session.amount_subtotal,
            total_details: session.total_details,
          }
        })
        .eq('stripe_payment_intent_id', paymentIntentId);

      if (paymentError) {
        console.error('Error updating payment history:', paymentError);
      }
    }

    // Add credits to tenant's account
    const { data: success, error: creditError } = await supabase
      .rpc('update_credits', {
        tenant_id_param: tenantId,
        amount_param: credits,
        transaction_type_param: 'purchase',
        description_param: description,
        reference_id_param: session.id
      });

    if (creditError || !success) {
      console.error('Error adding credits:', creditError);
      throw creditError;
    }

    // If payment method was attached, save it
    if (session.payment_intent) {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        typeof session.payment_intent === 'string' 
          ? session.payment_intent 
          : session.payment_intent.id
      );

      if (paymentIntent.payment_method) {
        const paymentMethodId = typeof paymentIntent.payment_method === 'string' 
          ? paymentIntent.payment_method 
          : paymentIntent.payment_method.id;
        await savePaymentMethod(paymentMethodId, tenantId, supabase);
      }
    }

    console.log(`Checkout session completed for tenant ${tenantId}: ${credits} credits, total: ${session.amount_total} cents`);
  } catch (error) {
    console.error('Error in handleCheckoutSessionCompleted:', error);
    throw error;
  }
}

async function savePaymentMethod(paymentMethodId: string, tenantId: string, supabase: any) {
  try {
    // Get payment method details from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    if (!paymentMethod.card) {
      console.log('Payment method is not a card, skipping save');
      return;
    }

    // Check if payment method already exists
    const { data: existing } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('stripe_payment_method_id', paymentMethodId)
      .single();

    if (existing) {
      console.log('Payment method already exists, skipping save');
      return;
    }

    // Check if this should be the default payment method
    const { data: existingMethods } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    const isDefault = !existingMethods || existingMethods.length === 0;

    // Save payment method
    const { error: saveError } = await supabase
      .from('payment_methods')
      .insert({
        tenant_id: tenantId,
        stripe_payment_method_id: paymentMethodId,
        stripe_customer_id: paymentMethod.customer,
        card_brand: paymentMethod.card.brand,
        card_last4: paymentMethod.card.last4,
        card_exp_month: paymentMethod.card.exp_month,
        card_exp_year: paymentMethod.card.exp_year,
        is_default: isDefault,
        is_active: true,
      });

    if (saveError) {
      console.error('Error saving payment method:', saveError);
      throw saveError;
    }

    console.log(`Payment method saved for tenant ${tenantId}: ${paymentMethod.card.brand} ****${paymentMethod.card.last4}`);
  } catch (error) {
    console.error('Error in savePaymentMethod:', error);
    throw error;
  }
} 