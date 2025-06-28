import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
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

    // Fetch all organizations with admin details
    const { data: organizations, error: orgsError } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        created_at,
        user_accounts!user_accounts_tenant_id_fkey!inner(
          id,
          first_name,
          last_name,
          email,
          role:roles(
            role_name
          )
        )
      `)
      .eq('user_accounts.role.role_name', 'admin')
      .order('created_at', { ascending: false });

    if (orgsError) {
      console.error('Error fetching organizations:', orgsError);
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
    }

    // Transform the data with external account status
    const transformedOrgs = organizations?.map(org => ({
      id: org.id,
      name: org.name,
      approval_status: (org as any).approval_status || 'pending',
      created_at: org.created_at,
      business_use_case: (org as any).business_use_case,
      messaging_volume_monthly: (org as any).messaging_volume_monthly,
      rejection_reason: (org as any).rejection_reason,
      additional_info_requested: (org as any).additional_info_requested,
      approved_at: (org as any).approved_at,
      admin_email: org.user_accounts[0]?.email || 'N/A',
      admin_name: `${org.user_accounts[0]?.first_name || ''} ${org.user_accounts[0]?.last_name || ''}`.trim() || 'N/A',
      document_count: 0,
      // External account status
      external_accounts: {
        vapi_org_id: (org as any).vapi_org_id,
        twilio_subaccount_sid: (org as any).twilio_subaccount_sid,
        resend_domain_id: (org as any).resend_domain_id
      },
      // Credit balance (we'll fetch this)
      credit_balance: 0
    })) || [];

    // Fetch credit balances for each organization
    const orgsWithCredits = await Promise.all(
      transformedOrgs.map(async (org) => {
        try {
          const { data: balance } = await (supabase as any)
            .rpc('get_tenant_credit_balance', { tenant_id_param: org.id });
          return { ...org, credit_balance: balance || 0 };
        } catch (error) {
          console.error(`Error fetching credits for ${org.id}:`, error);
          return org;
        }
      })
    );

    // TODO: Log super admin action after migration
    // await supabase.rpc('log_super_admin_action', {...})

    return NextResponse.json(orgsWithCredits);
  } catch (error) {
    console.error('Super admin organizations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 