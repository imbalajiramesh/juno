import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenant } from '@/lib/get-tenant';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { tenant } = await getCurrentTenant();
    const supabase = await createClient();

    // Get compliance status for the phone number
    const { data: compliance, error } = await supabase
      .from('phone_number_compliance')
      .select(`
        *,
        tenant_phone_numbers(phone_number, status)
      `)
      .eq('phone_number_id', params.id)
      .eq('tenant_id', tenant.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching compliance data:', error);
      return NextResponse.json({ error: 'Failed to fetch compliance data' }, { status: 500 });
    }

    // If no compliance record exists, return default state
    if (!compliance) {
      return NextResponse.json({
        phone_number_id: params.id,
        dlc_brand_registered: false,
        dlc_campaign_registered: false,
        phone_verified: false,
        carrier_verified: false,
        services_available: {
          dlc_brand_registration: { cost: 400, description: 'Required for business SMS in US' },
          dlc_campaign_registration: { cost: 1000, description: 'Required per SMS use case' },
          phone_verification: { cost: 200, description: 'Basic phone number verification' },
          carrier_verification: { cost: 300, description: 'Enhanced carrier-level verification' }
        }
      });
    }

    return NextResponse.json(compliance);
  } catch (error) {
    console.error('Error in phone compliance GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { tenant } = await getCurrentTenant();
    const supabase = await createClient();
    const { service_type, ...serviceData } = await request.json();

    // Verify phone number belongs to tenant
    const { data: phoneNumber, error: phoneError } = await supabase
      .from('tenant_phone_numbers')
      .select('*')
      .eq('id', params.id)
      .eq('tenant_id', tenant.id)
      .single();

    if (phoneError || !phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

    let result;

    switch (service_type) {
      case 'dlc_brand_registration':
        let { business_name, business_website, business_type } = serviceData;
        
        // Auto-fill from organization data if auto_submit is true
        if (serviceData.auto_submit || serviceData.use_organization_docs) {
          const { data: orgData } = await (supabase as any)
            .from('tenants')
            .select('name, website, business_type')
            .eq('id', tenant.id)
            .single();

          if (orgData) {
            business_name = business_name || orgData.name;
            business_website = business_website || orgData.website || `https://${orgData.name.toLowerCase().replace(/\s+/g, '')}.com`;
            business_type = business_type || orgData.business_type || 'corporation';
          }
        }
        
        if (!business_name || !business_website || !business_type) {
          return NextResponse.json({ 
            error: 'Missing required fields: business_name, business_website, business_type' 
          }, { status: 400 });
        }

        // Call database function to initiate brand registration
        const { data: brandResult, error: brandError } = await supabase
          .rpc('initiate_dlc_brand_registration', {
            phone_number_id_param: params.id,
            business_name_param: business_name,
            business_website_param: business_website,
            business_type_param: business_type
          });

        if (brandError) {
          console.error('DLC brand registration error:', brandError);
          return NextResponse.json({ error: 'Failed to initiate brand registration' }, { status: 500 });
        }

        result = brandResult;

        // If successful, make actual Twilio API call
        if (result.success) {
          try {
            const twilioResponse = await fetch(`https://messaging.twilio.com/v1/Services/${process.env.TWILIO_MESSAGING_SERVICE_SID}/ComplianceProfiles`, {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: new URLSearchParams({
                BusinessName: business_name,
                BusinessWebsite: business_website,
                BusinessType: business_type,
                BusinessIndustry: 'technology', // Could be made configurable
                PhoneNumber: phoneNumber.phone_number
              })
            });

            if (twilioResponse.ok) {
              const twilioData = await twilioResponse.json();
              
              // Update compliance record with Twilio IDs
              await supabase
                .from('phone_number_compliance')
                .update({
                  dlc_brand_id: twilioData.sid,
                  dlc_brand_registered: true
                })
                .eq('id', result.compliance_id);
            }
          } catch (twilioError) {
            console.error('Twilio API error:', twilioError);
            // Credits already deducted, but Twilio call failed
            // Could implement refund logic here
          }
        }
        break;

      case 'phone_verification':
      case 'carrier_verification':
        const verificationType = service_type === 'carrier_verification' ? 'carrier' : 'basic';

        // Call database function to initiate verification
        const { data: verifyResult, error: verifyError } = await supabase
          .rpc('initiate_phone_verification', {
            phone_number_id_param: params.id,
            verification_type_param: verificationType
          });

        if (verifyError) {
          console.error('Phone verification error:', verifyError);
          return NextResponse.json({ error: 'Failed to initiate verification' }, { status: 500 });
        }

        result = verifyResult;

        // If successful, make actual Twilio API call
        if (result.success) {
          try {
            const twilioResponse = await fetch(`https://verify.twilio.com/v2/Services`, {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: new URLSearchParams({
                FriendlyName: `Verification for ${phoneNumber.phone_number}`,
                CodeLength: '6'
              })
            });

            if (twilioResponse.ok) {
              const twilioData = await twilioResponse.json();
              
              // Update compliance record with verification ID
              const updateField = verificationType === 'carrier' ? 'carrier_verification_id' : 'phone_verification_id';
              await supabase
                .from('phone_number_compliance')
                .update({ [updateField]: twilioData.sid })
                .eq('id', result.compliance_id);
            }
          } catch (twilioError) {
            console.error('Twilio verification API error:', twilioError);
          }
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid service type' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in phone compliance POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 