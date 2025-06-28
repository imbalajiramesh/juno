import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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

    const { account_type } = await request.json();
    const tenantId = params.id;

    if (!account_type || !['vapi', 'twilio', 'resend'].includes(account_type)) {
      return NextResponse.json({ error: 'Invalid account_type. Must be: vapi, twilio, or resend' }, { status: 400 });
    }

    // Get tenant data
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const tenantData = tenant as any;
    let deletionResult: { success: boolean; message: string; accountId: string | null } = { success: false, message: '', accountId: null };

    try {
      switch (account_type) {
        case 'vapi':
          if (tenantData.vapi_org_id) {
            deletionResult = await deleteVapiOrganization(tenantData.vapi_org_id);
            if (deletionResult.success) {
              await (supabase as any)
                .from('tenants')
                .update({ vapi_org_id: null })
                .eq('id', tenantId);
            }
          } else {
            deletionResult = { success: true, message: 'No VAPI organization to delete', accountId: null };
          }
          break;

        case 'twilio':
          if (tenantData.twilio_subaccount_sid) {
            deletionResult = await deleteTwilioSubaccount(tenantData.twilio_subaccount_sid);
            if (deletionResult.success) {
              await (supabase as any)
                .from('tenants')
                .update({ twilio_subaccount_sid: null })
                .eq('id', tenantId);
            }
          } else {
            deletionResult = { success: true, message: 'No Twilio subaccount to delete', accountId: null };
          }
          break;

        case 'resend':
          if (tenantData.resend_domain_id) {
            deletionResult = await deleteResendDomain(tenantData.resend_domain_id);
            if (deletionResult.success) {
              await (supabase as any)
                .from('tenants')
                .update({ resend_domain_id: null })
                .eq('id', tenantId);
            }
          } else {
            deletionResult = { success: true, message: 'No Resend domain to delete', accountId: null };
          }
          break;
      }
    } catch (error) {
      console.error(`Error deleting ${account_type} account:`, error);
      deletionResult = {
        success: false,
        message: `Failed to delete ${account_type} account: ${error instanceof Error ? error.message : 'Unknown error'}`,
        accountId: null
      };
    }

    // Log the action
    await (supabase as any).rpc('log_super_admin_action', {
      p_action: `delete_${account_type}_account`,
      p_resource_type: 'organization',
      p_resource_id: tenantId,
      p_details: {
        account_type,
        success: deletionResult.success,
        message: deletionResult.message,
        account_id: deletionResult.accountId
      }
    });

    return NextResponse.json({
      success: deletionResult.success,
      message: deletionResult.message,
      account_type,
      account_id: deletionResult.accountId
    });

  } catch (error) {
    console.error('External account deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function deleteVapiOrganization(vapiOrgId: string) {
  const vapiToken = process.env.VAPI_API_KEY;
  if (!vapiToken) {
    throw new Error('VAPI API key not configured');
  }

  try {
    const response = await fetch(`https://api.vapi.ai/org/${vapiOrgId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${vapiToken}`,
      },
    });

    if (response.ok) {
      return { success: true, message: 'VAPI organization deleted successfully', accountId: vapiOrgId };
    } else {
      const errorData = await response.text();
      return { success: false, message: `VAPI deletion failed: ${response.status} - ${errorData}`, accountId: vapiOrgId };
    }
  } catch (error) {
    throw new Error(`VAPI deletion error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function deleteTwilioSubaccount(subaccountSid: string) {
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

  if (!twilioAccountSid || !twilioAuthToken) {
    throw new Error('Twilio credentials not configured');
  }

  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${subaccountSid}.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        Status: 'closed'
      })
    });

    if (response.ok) {
      return { success: true, message: 'Twilio subaccount closed successfully', accountId: subaccountSid };
    } else {
      const errorData = await response.text();
      return { success: false, message: `Twilio deletion failed: ${response.status} - ${errorData}`, accountId: subaccountSid };
    }
  } catch (error) {
    throw new Error(`Twilio deletion error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function deleteResendDomain(domainId: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error('Resend API key not configured');
  }

  try {
    const response = await fetch(`https://api.resend.com/domains/${domainId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
      },
    });

    if (response.ok) {
      return { success: true, message: 'Resend domain deleted successfully', accountId: domainId };
    } else {
      const errorData = await response.text();
      return { success: false, message: `Resend deletion failed: ${response.status} - ${errorData}`, accountId: domainId };
    }
  } catch (error) {
    throw new Error(`Resend deletion error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 