import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user and verify super admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify super admin role
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

    // Parse request body
    const body = await request.json();
    const { tenant_id, status, reason } = body;

    if (!tenant_id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['approve', 'reject', 'request_info'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Map status values
    const statusMap = {
      approve: 'approved',
      reject: 'rejected',
      request_info: 'requires_more_info'
    };

    const newStatus = statusMap[status as keyof typeof statusMap];

    try {
      // Call the database function to update organization status
      const { data: result, error: updateError } = await (supabase as any).rpc('update_organization_approval_status', {
        p_tenant_id: tenant_id,
        p_new_status: newStatus,
        p_reason: reason,
        p_additional_info: status === 'request_info' ? reason : null
      });

      if (updateError) {
        console.error('Error updating organization status:', updateError);
        return NextResponse.json({ error: 'Failed to update organization status' }, { status: 500 });
      }

      // Provision external accounts if organization is approved
      let provisioningResult = null;
      if (newStatus === 'approved') {
        try {
          const { provisionExternalAccounts } = await import('@/lib/external-account-provisioning');
          provisioningResult = await provisionExternalAccounts(tenant_id);
          
          if (!provisioningResult.success) {
            console.warn('External account provisioning had errors:', provisioningResult.errors);
            // Log the errors but don't fail the approval
            await (supabase as any).rpc('log_super_admin_action', {
              p_action: 'external_account_provisioning_errors',
              p_resource_type: 'organization',
              p_resource_id: tenant_id,
              p_details: { errors: provisioningResult.errors }
            });
          } else {
            console.log('✅ External accounts provisioned successfully:', {
              vapiOrg: !!provisioningResult.vapiOrgId,
              twilioSubaccount: !!provisioningResult.twilioSubaccountSid,
              resendDomain: !!provisioningResult.resendDomainId
            });
          }
        } catch (provisioningError) {
          console.error('❌ External account provisioning failed:', provisioningError);
          // Log the error but don't fail the approval
          await (supabase as any).rpc('log_super_admin_action', {
            p_action: 'external_account_provisioning_failed',
            p_resource_type: 'organization',
            p_resource_id: tenant_id,
            p_details: { error: provisioningError instanceof Error ? provisioningError.message : 'Unknown error' }
          });
        }
      }

      // Log super admin action
      await (supabase as any).rpc('log_super_admin_action', {
        p_action: `update_organization_status_to_${newStatus}`,
        p_resource_type: 'organization',
        p_resource_id: tenant_id,
        p_details: { 
          reason, 
          new_status: newStatus,
          provisioning_result: provisioningResult ? {
            success: provisioningResult.success,
            accounts_created: {
              vapi: !!provisioningResult.vapiOrgId,
              twilio: !!provisioningResult.twilioSubaccountSid,
              resend: !!provisioningResult.resendDomainId
            },
            errors: provisioningResult.errors
          } : null
        }
      });

      const message = newStatus === 'approved' 
        ? provisioningResult?.success 
          ? 'Organization approved and communication features activated successfully!'
          : 'Organization approved! Some communication features may need manual configuration.'
        : 'Status updated successfully';

      return NextResponse.json({ 
        success: true, 
        message,
        provisioning_result: provisioningResult
      });
    } catch (funcError) {
      console.error('Function call error:', funcError);
      return NextResponse.json({ error: 'Failed to process status update' }, { status: 500 });
    }
  } catch (error) {
    console.error('Super admin status update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 