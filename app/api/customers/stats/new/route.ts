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

    // Get new customers for current month
    const { count: currentMonthNew, error: currentError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', currentMonth.toISOString())
      .lt('created_at', now.toISOString());

    if (currentError) throw currentError;

    // Get new customers for last month
    const { count: lastMonthNew, error: lastError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', lastMonth.toISOString())
      .lt('created_at', currentMonth.toISOString());

    if (lastError) throw lastError;

    // Calculate percentage change
    const percentageChange = (lastMonthNew || 0) === 0
      ? 100 // If last month was 0, treat as 100% increase
      : (((currentMonthNew || 0) - (lastMonthNew || 0)) / (lastMonthNew || 0)) * 100;

    return NextResponse.json({
      total: currentMonthNew || 0,
      percentageChange,
    });
  } catch (error) {
    console.error('Error fetching new customer stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch new customer statistics' },
      { status: 500 }
    );
  }
}); 