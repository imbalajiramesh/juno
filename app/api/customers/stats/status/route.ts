// - All database operations now use the Supabase client.
// - RLS is now supported if enabled in Supabase.

import { NextRequest, NextResponse } from 'next/server';
import { withTenant } from '@/lib/get-tenant';
import { createClient } from '@/utils/supabase/server';

export const GET = withTenant(async (tenantId: string, req: NextRequest) => {
  const supabase = await createClient();
  try {
    // Get all customers with their status
    const { data: customers, error } = await supabase
      .from('customers')
      .select('status')
      .eq('tenant_id', tenantId);

    if (error) throw error;

    // Group by status and count
    const statusCounts = (customers || []).reduce((acc: Record<string, number>, customer) => {
      const status = customer.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Transform the data into the required format
    const formattedData = Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count,
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching customer status stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer status stats' },
      { status: 500 }
    );
  }
}); 