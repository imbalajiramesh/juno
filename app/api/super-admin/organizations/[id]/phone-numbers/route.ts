import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Verify super admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userAccount, error: userError } = await supabase
      .from('user_accounts')
      .select(`
        id,
        role:roles(
          role_name
        )
      `)
      .eq('auth_id', user.id)
      .single();

    if (userError || !userAccount || userAccount.role?.role_name !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const tenantId = params.id;

    // Get phone numbers for the organization
    const { data: phoneNumbers, error: phoneError } = await (supabase as any)
      .from('tenant_phone_numbers')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (phoneError) {
      console.error('Error fetching phone numbers:', phoneError);
      return NextResponse.json({ error: 'Failed to fetch phone numbers' }, { status: 500 });
    }

    return NextResponse.json({
      phone_numbers: phoneNumbers || []
    });

  } catch (error) {
    console.error('Phone numbers GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Verify super admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userAccount, error: userError } = await supabase
      .from('user_accounts')
      .select(`
        id,
        role:roles(
          role_name
        )
      `)
      .eq('auth_id', user.id)
      .single();

    if (userError || !userAccount || userAccount.role?.role_name !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const { phone_number_id } = await request.json();
    const tenantId = params.id;

    if (!phone_number_id) {
      return NextResponse.json({ error: 'phone_number_id is required' }, { status: 400 });
    }

    // Get phone number details before deletion
    const { data: phoneNumber, error: phoneError } = await (supabase as any)
      .from('tenant_phone_numbers')
      .select('*')
      .eq('id', phone_number_id)
      .eq('tenant_id', tenantId)
      .single();

    if (phoneError || !phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

    const phoneData = phoneNumber as any;
    let deletionResults = {
      database: false,
      twilio: false,
      vapi: false,
      errors: [] as string[]
    };

    try {
      // 1. Release phone number from Twilio
      if (phoneData.twilio_sid) {
        try {
          const twilioAccountSid = phoneData.twilio_account_sid || process.env.TWILIO_ACCOUNT_SID;
          const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers/${phoneData.twilio_sid}.json`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`
            }
          });

          if (response.ok) {
            deletionResults.twilio = true;
          } else {
            const errorData = await response.text();
            deletionResults.errors.push(`Twilio deletion failed: ${response.status} - ${errorData}`);
          }
        } catch (twilioError) {
          deletionResults.errors.push(`Twilio error: ${twilioError instanceof Error ? twilioError.message : 'Unknown error'}`);
        }
      }

      // 2. Delete phone number from VAPI
      if (phoneData.vapi_phone_number_id) {
        try {
          // Get tenant's VAPI org ID
          const { data: tenant } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', tenantId)
            .single();

          const vapiOrgId = (tenant as any)?.vapi_org_id;

          const vapiHeaders: Record<string, string> = {
            'Authorization': `Bearer ${process.env.VAPI_API_KEY}`
          };

          if (vapiOrgId) {
            vapiHeaders['X-Vapi-Org-Id'] = vapiOrgId;
          }

          const response = await fetch(`https://api.vapi.ai/phone-number/${phoneData.vapi_phone_number_id}`, {
            method: 'DELETE',
            headers: vapiHeaders
          });

          if (response.ok) {
            deletionResults.vapi = true;
          } else {
            const errorData = await response.text();
            deletionResults.errors.push(`VAPI deletion failed: ${response.status} - ${errorData}`);
          }
        } catch (vapiError) {
          deletionResults.errors.push(`VAPI error: ${vapiError instanceof Error ? vapiError.message : 'Unknown error'}`);
        }
      }

      // 3. Delete from database
      const { error: dbError } = await (supabase as any)
        .from('tenant_phone_numbers')
        .delete()
        .eq('id', phone_number_id)
        .eq('tenant_id', tenantId);

      if (dbError) {
        deletionResults.errors.push(`Database deletion failed: ${dbError.message}`);
      } else {
        deletionResults.database = true;
      }

    } catch (error) {
      deletionResults.errors.push(`System error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Log the super admin action
    await (supabase as any).rpc('log_super_admin_action', {
      p_action: 'delete_phone_number',
      p_resource_type: 'organization',
      p_resource_id: tenantId,
      p_details: {
        phone_number_id,
        phone_number: phoneData.phone_number,
        deletion_results: deletionResults
      }
    });

    const success = deletionResults.database;
    const message = success 
      ? `Phone number ${phoneData.phone_number} deleted successfully`
      : 'Failed to delete phone number from database';

    return NextResponse.json({
      success,
      message,
      phone_number: phoneData.phone_number,
      deletion_results: deletionResults
    });

  } catch (error) {
    console.error('Phone number deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 