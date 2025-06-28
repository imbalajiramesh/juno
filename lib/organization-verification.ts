import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export interface OrganizationStatus {
  approval_status: string;
  rejection_reason?: string;
  additional_info_requested?: string;
}

/**
 * Checks if the current user's organization is approved for communication features
 * Returns error response if not approved, null if approved
 */
export async function checkOrganizationApproval(): Promise<NextResponse | null> {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Find the tenant for this user
    const { data: userAccount, error: userAccountError } = await supabase
      .from('user_accounts')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (userAccountError || !userAccount) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      );
    }

    // Get organization approval status
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', userAccount.tenant_id)
      .single();

    if (tenantError) {
      console.error('Error fetching tenant:', tenantError);
      return NextResponse.json(
        { error: 'Failed to fetch organization status' },
        { status: 500 }
      );
    }

    const tenantData = tenant as any;
    const approvalStatus = tenantData.approval_status || 'pending';

    // Block access if not approved
    if (approvalStatus !== 'approved') {
      const statusMessages = {
        pending: 'Your organization is pending verification. Please complete document upload and wait for approval before using communication features.',
        rejected: `Your organization application has been rejected. Reason: ${tenantData.rejection_reason || 'Please contact support for details.'}`,
        requires_more_info: `Additional information is required for your organization. Details: ${tenantData.additional_info_requested || 'Please check your documents page.'}`
      };

      return NextResponse.json({
        error: 'Organization verification required',
        message: statusMessages[approvalStatus as keyof typeof statusMessages] || statusMessages.pending,
        approval_status: approvalStatus,
        action: 'complete_verification',
        verification_url: '/settings/documents'
      }, { status: 403 });
    }

    // Organization is approved
    return null;
  } catch (error) {
    console.error('Error checking organization approval:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Higher-order function that wraps API handlers to require organization approval
 */
export function requireOrganizationApproval<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const verificationError = await checkOrganizationApproval();
    if (verificationError) {
      return verificationError;
    }
    return handler(...args);
  };
}

/**
 * Gets the organization approval status for the current user
 */
export async function getOrganizationStatus(): Promise<OrganizationStatus | null> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return null;

    const { data: userAccount, error: userAccountError } = await supabase
      .from('user_accounts')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (userAccountError || !userAccount) return null;

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', userAccount.tenant_id)
      .single();

    if (tenantError) return null;

    const tenantData = tenant as any;
    return {
      approval_status: tenantData.approval_status || 'pending',
      rejection_reason: tenantData.rejection_reason,
      additional_info_requested: tenantData.additional_info_requested
    };
  } catch (error) {
    console.error('Error getting organization status:', error);
    return null;
  }
} 