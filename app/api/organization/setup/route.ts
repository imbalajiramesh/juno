import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCurrentTenant } from '@/lib/get-tenant';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenant } = await getCurrentTenant();
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const { industry, description, size, location } = await req.json();

    // Validate required fields
    if (!industry || !description || !size || !location) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Create Vapi organization for this tenant
    let vapiOrgId = null;
    try {
      const vapiResponse = await fetch('https://api.vapi.ai/org', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${tenant.name} Organization`,
          plan: 'starter'
        }),
      });

      if (vapiResponse.ok) {
        const vapiData = await vapiResponse.json();
        vapiOrgId = vapiData.id;
        console.log('Created Vapi organization:', vapiOrgId);
      } else {
        console.error('Failed to create Vapi organization:', await vapiResponse.text());
      }
    } catch (error) {
      console.error('Error creating Vapi organization:', error);
    }

    // Create Twilio subaccount for this tenant
    let twilioSubaccountSid = null;
    try {
      const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Accounts.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          FriendlyName: `${tenant.name} Subaccount`
        })
      });

      if (twilioResponse.ok) {
        const twilioData = await twilioResponse.json();
        twilioSubaccountSid = twilioData.sid;
        console.log('Created Twilio subaccount:', twilioSubaccountSid);
      } else {
        console.error('Failed to create Twilio subaccount:', await twilioResponse.text());
      }
    } catch (error) {
      console.error('Error creating Twilio subaccount:', error);
    }

    // Update tenant with setup information and organization IDs
    const { data: updatedTenant, error: updateError } = await supabase
      .from('tenants')
      .update({
        industry,
        description,
        size,
        location,
        setup_completed: true,
        vapi_org_id: vapiOrgId,
        twilio_subaccount_sid: twilioSubaccountSid,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenant.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating tenant:', updateError);
      return NextResponse.json({ error: 'Failed to complete setup' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      tenant: updatedTenant,
      vapiOrgCreated: !!vapiOrgId,
      twilioSubaccountCreated: !!twilioSubaccountSid
    });
  } catch (error) {
    console.error('Error in organization setup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 