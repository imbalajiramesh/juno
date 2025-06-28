import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Webhook handler for Twilio verification status updates
 * Handles brand registration, campaign approval, and other verification events
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.text();
    const data = new URLSearchParams(body);
    
    // Get webhook data
    const eventType = data.get('StatusCallbackEvent');
    const resourceSid = data.get('ResourceSid');
    const status = data.get('Status');
    const resourceType = data.get('ResourceType');

    console.log('Twilio verification webhook:', {
      eventType,
      resourceSid,
      status,
      resourceType
    });

    // Validate required data
    if (!resourceSid || !status || !resourceType) {
      console.log('Missing required webhook data');
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Handle different verification types
    switch (resourceType) {
      case 'brand_registration':
        await handleBrandRegistrationUpdate(supabase, resourceSid, status);
        break;
      
      case 'campaign':
        await handleCampaignUpdate(supabase, resourceSid, status);
        break;
      
      case 'phone_verification':
        await handlePhoneVerificationUpdate(supabase, resourceSid, status);
        break;
      
      case 'carrier_verification':
        await handleCarrierVerificationUpdate(supabase, resourceSid, status);
        break;
      
      default:
        console.log('Unknown resource type:', resourceType);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Verification webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleBrandRegistrationUpdate(supabase: any, brandSid: string, status: string) {
  try {
    // Update compliance record
    const { data: compliance } = await (supabase as any)
      .from('phone_number_compliance')
      .update({
        dlc_brand_registered: status === 'approved',
        dlc_brand_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('dlc_brand_id', brandSid)
      .select('phone_number_id, tenant_id')
      .single();

    if (compliance && status === 'approved') {
      // Auto-advance to campaign registration
      await autoSubmitCampaignRegistration(supabase, compliance.tenant_id, brandSid, compliance.phone_number_id);
    }

    // Log the status change
    await logVerificationEvent(supabase, {
      type: 'brand_registration_update',
      resource_sid: brandSid,
      status,
      phone_number_id: compliance?.phone_number_id,
      tenant_id: compliance?.tenant_id
    });

  } catch (error) {
    console.error('Brand registration update error:', error);
  }
}

async function handleCampaignUpdate(supabase: any, campaignSid: string, status: string) {
  try {
    // Update compliance record
    const { data: compliance } = await (supabase as any)
      .from('phone_number_compliance')
      .update({
        dlc_campaign_registered: status === 'approved',
        dlc_campaign_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('dlc_campaign_id', campaignSid)
      .select('phone_number_id, tenant_id')
      .single();

    // Log the status change
    await logVerificationEvent(supabase, {
      type: 'campaign_update',
      resource_sid: campaignSid,
      status,
      phone_number_id: compliance?.phone_number_id,
      tenant_id: compliance?.tenant_id
    });

    // Notify user of campaign approval/rejection
    if (status === 'approved') {
      await queueNotification(supabase, {
        tenant_id: compliance?.tenant_id,
        type: 'campaign_approved',
        message: 'Your SMS campaign has been approved and is now active!'
      });
    } else if (status === 'rejected') {
      await queueNotification(supabase, {
        tenant_id: compliance?.tenant_id,
        type: 'campaign_rejected',
        message: 'Your SMS campaign was rejected. Please review and resubmit.'
      });
    }

  } catch (error) {
    console.error('Campaign update error:', error);
  }
}

async function handlePhoneVerificationUpdate(supabase: any, verificationSid: string, status: string) {
  try {
    // Update compliance record
    const { data: compliance } = await (supabase as any)
      .from('phone_number_compliance')
      .update({
        phone_verified: status === 'verified',
        phone_verification_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('phone_verification_id', verificationSid)
      .select('phone_number_id, tenant_id')
      .single();

    // Log the status change
    await logVerificationEvent(supabase, {
      type: 'phone_verification_update',
      resource_sid: verificationSid,
      status,
      phone_number_id: compliance?.phone_number_id,
      tenant_id: compliance?.tenant_id
    });

  } catch (error) {
    console.error('Phone verification update error:', error);
  }
}

async function handleCarrierVerificationUpdate(supabase: any, verificationSid: string, status: string) {
  try {
    // Update compliance record
    const { data: compliance } = await (supabase as any)
      .from('phone_number_compliance')
      .update({
        carrier_verified: status === 'verified',
        carrier_verification_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('carrier_verification_id', verificationSid)
      .select('phone_number_id, tenant_id')
      .single();

    // Log the status change
    await logVerificationEvent(supabase, {
      type: 'carrier_verification_update',
      resource_sid: verificationSid,
      status,
      phone_number_id: compliance?.phone_number_id,
      tenant_id: compliance?.tenant_id
    });

  } catch (error) {
    console.error('Carrier verification update error:', error);
  }
}

async function autoSubmitCampaignRegistration(supabase: any, tenantId: string, brandSid: string, phoneNumberId: string) {
  try {
    // Get tenant information for campaign setup
    const { data: tenant } = await (supabase as any)
      .from('tenants')
      .select('name, business_type')
      .eq('id', tenantId)
      .single();

    if (!tenant) return;

    // Auto-generate campaign data based on business type
    const campaignData = {
      useCase: 'MIXED', // Most flexible option
      description: `${tenant.name} uses SMS for customer notifications, account updates, and important business communications.`,
      sampleMessages: [
        "Your appointment is confirmed for tomorrow at 2:00 PM. Reply STOP to opt out.",
        "Account alert: Your payment was processed successfully. Questions? Reply HELP.",
        "Welcome to our service! You'll receive important updates here. Reply STOP to unsubscribe."
      ],
      optInWorkflow: "Customers opt-in by providing their phone number through our website or application with explicit consent.",
      optOutWorkflow: "Customers can opt-out by replying STOP to any message. We immediately remove them from all messaging.",
      helpWorkflow: "Customers can reply HELP to receive support information and contact details."
    };

    // Submit campaign to Twilio
    const response = await fetch(`https://messaging.twilio.com/v1/a2p/BrandRegistrations/${brandSid}/Campaigns`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        CampaignUseCase: campaignData.useCase,
        Description: campaignData.description,
        MessageSamples: campaignData.sampleMessages.join('\n'),
        HasEmbeddedLinks: 'false',
        HasEmbeddedPhone: 'false',
        CampaignAttributions: 'DIRECT',
        SubscriberOptIn: campaignData.optInWorkflow,
        SubscriberOptOut: campaignData.optOutWorkflow,
        SubscriberHelp: campaignData.helpWorkflow,
        AgeGated: 'false',
        DirectLending: 'false',
        Mock: process.env.NODE_ENV === 'development' ? 'true' : 'false'
      })
    });

    if (response.ok) {
      const result = await response.json();
      
      // Update compliance record with campaign ID
      await (supabase as any)
        .from('phone_number_compliance')
        .update({
          dlc_campaign_id: result.sid,
          dlc_campaign_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('phone_number_id', phoneNumberId);

      // Log auto-submission
      await logVerificationEvent(supabase, {
        type: 'auto_campaign_submission',
        resource_sid: result.sid,
        status: 'submitted',
        phone_number_id: phoneNumberId,
        tenant_id: tenantId
      });

      console.log('Auto-submitted campaign registration:', result.sid);
    } else {
      console.error('Campaign auto-submission failed:', await response.text());
    }

  } catch (error) {
    console.error('Auto campaign submission error:', error);
  }
}

async function logVerificationEvent(supabase: any, eventData: any) {
  try {
    await (supabase as any)
      .from('verification_events_log')
      .insert({
        ...eventData,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log verification event:', error);
  }
}

async function queueNotification(supabase: any, notificationData: any) {
  try {
    await (supabase as any)
      .from('notification_queue')
      .insert({
        ...notificationData,
        status: 'pending',
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to queue notification:', error);
  }
}

// GET method for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Twilio verification webhook endpoint' });
} 