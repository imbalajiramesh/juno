import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCurrentTenant } from '@/lib/get-tenant';
import twilio from 'twilio';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Check organization approval before allowing SMS sending
    const { checkOrganizationApproval } = await import('@/lib/organization-verification');
    const verificationError = await checkOrganizationApproval();
    if (verificationError) {
      return verificationError;
    }

    const supabase = await createClient();
    const { tenant } = await getCurrentTenant();
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const { to, message, from } = await request.json();

    // Validate input
    if (!to || !message) {
      return NextResponse.json({ 
        error: 'Missing required fields: to, message' 
      }, { status: 400 });
    }

    // Get SMS pricing
    const { data: pricing, error: pricingError } = await (supabase as any)
      .from('pricing_config')
      .select('credits_per_unit')
      .eq('service_type', 'sms_send')
      .eq('is_active', true)
      .single();

    if (pricingError) {
      console.error('Error fetching SMS pricing:', pricingError);
      return NextResponse.json({ error: 'Failed to fetch pricing' }, { status: 500 });
    }

    const smsCredits = pricing?.credits_per_unit || 5;

    // Check credit balance
    const { data: currentBalance, error: balanceError } = await (supabase as any)
      .rpc('get_tenant_credit_balance', { tenant_id_param: tenant.id });

    if (balanceError) {
      console.error('Error checking balance:', balanceError);
      return NextResponse.json({ error: 'Failed to check balance' }, { status: 500 });
    }

    const balance = currentBalance || 0;
    if (balance < smsCredits) {
      return NextResponse.json({ 
        error: 'Insufficient credits',
        required: smsCredits,
        available: balance
      }, { status: 402 });
    }

    // Get tenant's Twilio credentials or phone number
    const { data: tenantData, error: tenantError } = await (supabase as any)
      .from('tenants')
      .select('twilio_subaccount_sid')
      .eq('id', tenant.id)
      .single();

    if (tenantError) {
      console.error('Error fetching tenant data:', tenantError);
      return NextResponse.json({ error: 'Failed to fetch tenant data' }, { status: 500 });
    }

    // Determine which Twilio account to use
    const twilioAccountSid = tenantData?.twilio_subaccount_sid || process.env.TWILIO_ACCOUNT_SID;
    const twilioClient = twilio(twilioAccountSid, process.env.TWILIO_AUTH_TOKEN);

    // Get a 'from' number if not provided
    let fromNumber = from;
    if (!fromNumber) {
      // Try to get tenant's first active phone number
      const { data: phoneNumbers } = await (supabase as any)
        .from('tenant_phone_numbers')
        .select('phone_number')
        .eq('tenant_id', tenant.id)
        .eq('status', 'active')
        .limit(1);

      if (phoneNumbers && phoneNumbers.length > 0) {
        fromNumber = phoneNumbers[0].phone_number;
      } else {
        return NextResponse.json({ 
          error: 'No active phone number found. Please acquire a phone number first.' 
        }, { status: 400 });
      }
    }

    try {
      // Send SMS via Twilio
      const message_result = await twilioClient.messages.create({
        body: message,
        from: fromNumber,
        to: to
      });

      // Deduct credits on successful send
      const { data: creditUpdateSuccess, error: creditError } = await (supabase as any)
        .rpc('update_credits', {
          tenant_id_param: tenant.id,
          amount_param: -smsCredits,
          transaction_type_param: 'sms_charge',
          description_param: `SMS sent to ${to}`,
          reference_id_param: message_result.sid
        });

      if (creditError || !creditUpdateSuccess) {
        console.error('Error deducting SMS credits:', creditError);
        // Note: SMS was sent but credits weren't deducted - log this for manual review
        console.error(`CRITICAL: SMS sent (SID: ${message_result.sid}) but credits not deducted for tenant ${tenant.id}`);
      }

      // Log the SMS in database (optional - create sms_logs table if needed)
      await (supabase as any)
        .from('sms_logs')
        .insert({
          tenant_id: tenant.id,
          twilio_sid: message_result.sid,
          from_number: fromNumber,
          to_number: to,
          message_body: message,
          status: message_result.status,
          credits_charged: smsCredits,
          sent_at: new Date().toISOString()
        })
                 .then(({ error }: { error: any }) => {
           if (error) console.error('Error logging SMS:', error);
         });

      return NextResponse.json({
        success: true,
        messageSid: message_result.sid,
        status: message_result.status,
        creditsDeducted: smsCredits,
        from: fromNumber,
        to: to
      });

    } catch (twilioError: any) {
      console.error('Twilio SMS error:', twilioError);
      
      // Check if it's a specific Twilio error
      if (twilioError.code) {
        return NextResponse.json({ 
          error: `SMS delivery failed: ${twilioError.message}`,
          twilioErrorCode: twilioError.code
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to send SMS',
        details: twilioError.message || 'Unknown Twilio error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in SMS send:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 