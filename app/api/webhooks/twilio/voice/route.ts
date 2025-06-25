import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  
  try {
    const formData = await req.formData();
    const from = formData.get('From')?.toString();
    const to = formData.get('To')?.toString();
    const callSid = formData.get('CallSid')?.toString();
    const accountSid = formData.get('AccountSid')?.toString();

    console.log('Twilio voice webhook:', { from, to, callSid, accountSid });

    // Find the tenant by phone number and subaccount
    const { data: phoneNumber } = await supabase
      .from('tenant_phone_numbers')
      .select(`
        *,
        tenants:tenant_id (
          id,
          name,
          vapi_org_id
        )
      `)
      .eq('phone_number', to)
      .eq('twilio_account_sid', accountSid)
      .eq('status', 'active')
      .single();

    if (!phoneNumber || !phoneNumber.tenants) {
      console.error('Phone number not found or inactive:', to);
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>This number is not configured for voice calls.</Say>
          <Hangup/>
        </Response>`,
        {
          headers: { 'Content-Type': 'application/xml' },
        }
      );
    }

    // Get an active voice agent for this tenant
    const { data: agent } = await supabase
      .from('voice_agents')
      .select('*')
      .eq('tenant_id', phoneNumber.tenants.id)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (!agent) {
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>No voice agent is currently available. Please try again later.</Say>
          <Hangup/>
        </Response>`,
        {
          headers: { 'Content-Type': 'application/xml' },
        }
      );
    }

    // Check if tenant has sufficient credits (minimum 15 for 1 minute)
    const { data: balance } = await supabase
      .rpc('get_tenant_credit_balance', { tenant_id_param: phoneNumber.tenants.id });

    if ((balance || 0) < 15) {
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>Insufficient credits for voice calls. Please contact support.</Say>
          <Hangup/>
        </Response>`,
        {
          headers: { 'Content-Type': 'application/xml' },
        }
      );
    }

    // Create a call log entry
    await supabase
      .from('alex_call_logs')
      .insert({
        id: crypto.randomUUID(),
        tenant_id: phoneNumber.tenants.id,
        customer_id: null, // Could be enhanced to lookup customer by phone number
        voice_agent_id: agent.id,
        call_recording_url: null,
        call_transcript: null,
        call_summary: `Incoming call from ${from} to voice agent ${agent.name}`,
        duration_minutes: 0,
        vapi_call_id: null, // Will be updated when Vapi call is created
        twilio_call_sid: callSid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    // Forward to Vapi for AI handling
    const vapiOrgId = phoneNumber.tenants.vapi_org_id;
    const vapiHeaders: Record<string, string> = {
      'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    };

    if (vapiOrgId) {
      vapiHeaders['X-Vapi-Org-Id'] = vapiOrgId;
    }

    // Initiate Vapi call
    try {
      const vapiResponse = await fetch('https://api.vapi.ai/call/phone', {
        method: 'POST',
        headers: vapiHeaders,
        body: JSON.stringify({
          phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
          customer: {
            number: from,
          },
          assistant: {
            id: agent.vapi_agent_id,
          },
        }),
      });

      if (vapiResponse.ok) {
        const vapiData = await vapiResponse.json();
        
        // Update call log with Vapi call ID
        await supabase
          .from('alex_call_logs')
          .update({ vapi_call_id: vapiData.id })
          .eq('twilio_call_sid', callSid);

        console.log('Vapi call initiated:', vapiData.id);
      }
    } catch (error) {
      console.error('Failed to initiate Vapi call:', error);
    }

    // Return TwiML to connect the call
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>Please hold while we connect you to our AI assistant.</Say>
        <Pause length="1"/>
        <Redirect>${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/connect?agent=${agent.id}&call=${callSid}</Redirect>
      </Response>`,
      {
        headers: { 'Content-Type': 'application/xml' },
      }
    );
  } catch (error) {
    console.error('Twilio voice webhook error:', error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>We're experiencing technical difficulties. Please try again later.</Say>
        <Hangup/>
      </Response>`,
      {
        headers: { 'Content-Type': 'application/xml' },
      }
    );
  }
} 