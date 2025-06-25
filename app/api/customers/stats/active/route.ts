// - All database operations now use the Supabase client.
// - RLS is now supported if enabled in Supabase.

import { NextRequest, NextResponse } from 'next/server';
import { withTenant } from '@/lib/get-tenant';
import { createClient } from '@/utils/supabase/server';

export const GET = withTenant(async (tenantId: string) => {
  const supabase = await createClient();
  try {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Get active customers for current month
    const { count: currentMonthActive, error: currentError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['active', 'ACTIVE', 'new', 'NEW'])
      .lt('created_at', now.toISOString());

    if (currentError) throw currentError;

    // Get active customers for last month
    const { count: lastMonthActive, error: lastError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['active', 'ACTIVE', 'new', 'NEW'])
      .lt('created_at', currentMonth.toISOString());

    if (lastError) throw lastError;

    // Calculate percentage change
    const percentageChange = (lastMonthActive || 0) === 0
      ? 100 // If last month was 0, treat as 100% increase
      : (((currentMonthActive || 0) - (lastMonthActive || 0)) / (lastMonthActive || 0)) * 100;

    return NextResponse.json({
      total: currentMonthActive || 0,
      percentageChange,
    });
  } catch (error) {
    console.error('Error fetching active customer stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active customer statistics' },
      { status: 500 }
    );
  }
}); 