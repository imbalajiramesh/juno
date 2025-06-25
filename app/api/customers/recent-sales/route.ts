// - All database operations now use the Supabase client.
// - RLS is now supported if enabled in Supabase.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withTenant } from '@/lib/get-tenant';

export const GET = withTenant(async (tenantId: string) => {
  const supabase = await createClient();
  try {
    const { data: recentSales, error } = await supabase
      .from('customers')
      .select('id, first_name, last_name, updated_at, custom_fields, user_accounts!customers_user_account_id_fkey(id, first_name, last_name)')
      .eq('tenant_id', tenantId)
      .eq('status', 'closed_won')
      .not('user_account_id', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    // Transform the data to include the required fields
    const formattedSales = (recentSales || []).map(sale => {
      const customFields = sale.custom_fields as Record<string, any> || {};
      const assignedUser = sale.user_accounts as any;
      
      return {
        id: sale.id,
        customer_name: `${sale.first_name} ${sale.last_name}`,
        agent_name: assignedUser ? 
          `${assignedUser.first_name} ${assignedUser.last_name}` : 
          'Unassigned',
        agent_id: assignedUser?.id || '',
        closed_at: new Date(sale.updated_at).toISOString(),
        // You might want to adjust this based on where you store the sale amount
        amount: customFields.sale_amount || 0,
      };
    });

    return NextResponse.json(formattedSales);
  } catch (error) {
    console.error('Error fetching recent sales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent sales' },
      { status: 500 }
    );
  }
}); 