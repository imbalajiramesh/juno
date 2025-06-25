import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCurrentTenant } from '@/lib/get-tenant';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenant } = await getCurrentTenant();
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get tenant's phone numbers
    const { data: phoneNumbers, error } = await supabase
      .from('tenant_phone_numbers')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching phone numbers:', error);
      return NextResponse.json({ error: 'Failed to fetch phone numbers' }, { status: 500 });
    }

    return NextResponse.json({ phoneNumbers: phoneNumbers || [] });
  } catch (error) {
    console.error('Error in phone numbers GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenant } = await getCurrentTenant();
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const { phoneNumber: selectedPhoneNumber, area_code, country = 'US' } = await req.json();

    // Support both new (selectedPhoneNumber) and legacy (area_code) formats
    if (!selectedPhoneNumber && !area_code) {
      return NextResponse.json({ error: 'Phone number or area code is required' }, { status: 400 });
    }

    // Get pricing info
    const { data: pricing, error: pricingError } = await supabase
      .from('pricing_config')
      .select('*')
      .in('service_type', ['phone_number_setup', 'phone_number_monthly'])
      .eq('is_active', true);

    if (pricingError || !pricing) {
      console.error('Error fetching pricing:', pricingError);
      return NextResponse.json({ error: 'Failed to fetch pricing' }, { status: 500 });
    }

    const setupCost = pricing.find((p: any) => p.service_type === 'phone_number_setup')?.credits_per_unit || 500;
    const monthlyCost = pricing.find((p: any) => p.service_type === 'phone_number_monthly')?.credits_per_unit || 100;

    // Check if tenant has enough credits
    const { data: currentBalance } = await supabase
      .rpc('get_tenant_credit_balance', { tenant_id_param: tenant.id });

    if ((currentBalance || 0) < setupCost) {
      return NextResponse.json({ 
        error: `Insufficient credits. Need ${setupCost} credits for setup.`,
        required: setupCost,
        available: currentBalance || 0
      }, { status: 402 });
    }

    // Get tenant's Twilio subaccount SID and VAPI org ID
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('twilio_subaccount_sid, vapi_org_id')
      .eq('id', tenant.id)
      .single();

    const twilioAccountSid = tenantData?.twilio_subaccount_sid || process.env.TWILIO_ACCOUNT_SID;
    const vapiOrgId = tenantData?.vapi_org_id;

    let numberToPurchase;

    if (selectedPhoneNumber) {
      // Use the pre-selected phone number
      numberToPurchase = selectedPhoneNumber;
    } else {
      // Legacy behavior: search for available numbers by area code
      const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/AvailablePhoneNumbers/${country}/Local.json?AreaCode=${area_code}&Limit=1`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`
        }
      });

      if (!twilioResponse.ok) {
        console.error('Twilio API error:', await twilioResponse.text());
        return NextResponse.json({ error: 'Failed to search for available phone numbers' }, { status: 500 });
      }

      const twilioData = await twilioResponse.json();
      
      if (!twilioData.available_phone_numbers || twilioData.available_phone_numbers.length === 0) {
        return NextResponse.json({ error: 'No phone numbers available in this area code' }, { status: 404 });
      }

      numberToPurchase = twilioData.available_phone_numbers[0].phone_number;
    }

    // Purchase the phone number (using tenant's subaccount)
    const purchaseResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        PhoneNumber: numberToPurchase,
        VoiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/voice`,
        StatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/status`
      })
    });

    if (!purchaseResponse.ok) {
      console.error('Twilio purchase error:', await purchaseResponse.text());
      return NextResponse.json({ error: 'Failed to purchase phone number' }, { status: 500 });
    }

    const purchasedNumber = await purchaseResponse.json();

    // Create corresponding VAPI phone number if VAPI is configured
    let vapiPhoneNumberId = null;
    try {
      if (process.env.VAPI_API_KEY && vapiOrgId) {
        vapiPhoneNumberId = await createVapiPhoneNumber(numberToPurchase, vapiOrgId);
      }
    } catch (vapiError) {
      console.warn('VAPI phone number creation failed:', vapiError);
      // Continue without VAPI integration - user can manually configure later
    }

    // Store in database
    const { data: phoneNumber, error: dbError } = await supabase
      .from('tenant_phone_numbers')
      .insert({
        tenant_id: tenant.id,
        phone_number: purchasedNumber.phone_number,
        twilio_sid: purchasedNumber.sid,
        twilio_account_sid: twilioAccountSid,
        vapi_phone_number_id: vapiPhoneNumberId, // Store VAPI phone number ID
        monthly_cost_credits: monthlyCost,
        setup_cost_credits: setupCost,
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to save phone number' }, { status: 500 });
    }

    // Deduct setup credits
    const { error: creditError } = await supabase
      .rpc('update_credits', {
        tenant_id_param: tenant.id,
        amount_param: -setupCost,
        transaction_type_param: 'phone_number_charge',
        description_param: `Phone number setup: ${purchasedNumber.phone_number}`,
        reference_id_param: phoneNumber.id
      });

    if (creditError) {
      console.error('Credit deduction error:', creditError);
      // Note: We don't fail here since the number was already purchased
    }

    return NextResponse.json({
      phoneNumber,
      creditsDeducted: setupCost,
      vapiIntegrated: !!vapiPhoneNumberId,
      message: vapiPhoneNumberId 
        ? 'Phone number purchased and automatically configured for voice agents!'
        : 'Phone number purchased. Voice agent configuration available manually.'
    });
  } catch (error) {
    console.error('Error in phone numbers POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to create VAPI phone number
async function createVapiPhoneNumber(phoneNumber: string, vapiOrgId: string): Promise<string | null> {
  const vapiToken = process.env.VAPI_API_KEY;
  if (!vapiToken) {
    throw new Error('VAPI API key not configured');
  }

  const vapiPayload = {
    provider: 'twilio',
    number: phoneNumber,
    name: `Phone Number ${phoneNumber}`,
  };

  const response = await fetch('https://api.vapi.ai/phone-number', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vapiToken}`,
      'Content-Type': 'application/json',
      'X-Vapi-Org-Id': vapiOrgId,
    },
    body: JSON.stringify(vapiPayload),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`VAPI API error: ${response.status} - ${errorData}`);
  }

  const result = await response.json();
  return result.id;
} 