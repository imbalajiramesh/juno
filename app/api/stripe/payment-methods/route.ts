import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCurrentTenant } from '@/lib/get-tenant';
import { stripe } from '@/lib/stripe';

// GET - List payment methods
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenant } = await getCurrentTenant();
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const { data: paymentMethods, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment methods:', error);
      return NextResponse.json({ error: 'Failed to fetch payment methods' }, { status: 500 });
    }

    return NextResponse.json({ paymentMethods: paymentMethods || [] });
  } catch (error) {
    console.error('Error in payment methods GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Set default payment method or create setup intent
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenant } = await getCurrentTenant();
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const { action, paymentMethodId } = await req.json();

    if (action === 'set_default') {
      // Set a payment method as default
      if (!paymentMethodId) {
        return NextResponse.json({ error: 'Payment method ID required' }, { status: 400 });
      }

      // First, remove default from all other payment methods
      const { error: removeDefaultError } = await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('tenant_id', tenant.id);

      if (removeDefaultError) {
        console.error('Error removing default status:', removeDefaultError);
        return NextResponse.json({ error: 'Failed to update default' }, { status: 500 });
      }

      // Set the new default
      const { error: setDefaultError } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', paymentMethodId)
        .eq('tenant_id', tenant.id);

      if (setDefaultError) {
        console.error('Error setting default payment method:', setDefaultError);
        return NextResponse.json({ error: 'Failed to set default' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    } else if (action === 'create_setup_intent') {
      // Create setup intent for saving a new payment method
      
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

      // Create setup intent
      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomerId,
        usage: 'off_session', // For future payments
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return NextResponse.json({
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in payment methods POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a payment method
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenant } = await getCurrentTenant();
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const paymentMethodId = searchParams.get('id');

    if (!paymentMethodId) {
      return NextResponse.json({ error: 'Payment method ID required' }, { status: 400 });
    }

    // Get payment method details
    const { data: paymentMethod, error: fetchError } = await supabase
      .from('payment_methods')
      .select('stripe_payment_method_id')
      .eq('id', paymentMethodId)
      .eq('tenant_id', tenant.id)
      .single();

    if (fetchError || !paymentMethod) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
    }

    // Detach from Stripe
    await stripe.paymentMethods.detach(paymentMethod.stripe_payment_method_id);

    // Mark as inactive in database
    const { error: deleteError } = await supabase
      .from('payment_methods')
      .update({ is_active: false, is_default: false })
      .eq('id', paymentMethodId)
      .eq('tenant_id', tenant.id);

    if (deleteError) {
      console.error('Error deleting payment method:', deleteError);
      return NextResponse.json({ error: 'Failed to delete payment method' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in payment methods DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 