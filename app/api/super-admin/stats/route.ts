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

    // Get organization stats - using current table structure
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, created_at');

    if (tenantsError) {
      console.error('Error fetching tenant stats:', tenantsError);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    // Show current database state - orgs are pending due to migration bug
    const totalOrgs = tenants?.length || 0;

    const stats = {
      pending_approvals: totalOrgs, // All existing orgs are currently pending
      info_required: 0, // No info required
      approved_orgs: 0, // None approved yet due to migration bug
      rejected_orgs: 0, // No rejected orgs
      total_organizations: totalOrgs,
      avg_approval_days: 0 // No approval process completed yet
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Super admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 