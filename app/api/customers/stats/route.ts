// - All database operations now use the Supabase client.
// - RLS is now supported if enabled in Supabase.

import { NextRequest, NextResponse } from 'next/server';
import { withTenant } from '@/lib/get-tenant';
import { createClient } from '@/utils/supabase/server';

export const GET = withTenant(async (tenantId: string) => {
  const supabase = await createClient();
  try {
    // Get total customers count
    const { count: totalCustomers, error: totalError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (totalError) throw totalError;

    // Get active customers count
    const { count: activeCustomers, error: activeError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['active', 'ACTIVE', 'new', 'NEW']);

    if (activeError) throw activeError;

    // Get new customers this month
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const { count: newCustomers, error: newError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', currentMonth.toISOString());

    if (newError) throw newError;

    return NextResponse.json({
      total: totalCustomers || 0,
      active: activeCustomers || 0,
      new: newCustomers || 0,
    });
  } catch (error) {
    console.error('Error fetching customer stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer statistics' },
      { status: 500 }
    );
  }
}); 