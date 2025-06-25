// - All database operations now use the Supabase client.
// - RLS is now supported if enabled in Supabase.

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { Customer } from '@/types/customer';

export async function GET() {
  const supabase = await createClient();
  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*, assigned_to(id, first_name, last_name), interactions(id, interaction_type, interaction_date)')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    // Sort customers by their latest interaction date (manual sorting since we can't order by related fields in Supabase)
    const customersWithLatestInteraction = (customers || []).map((customer: any) => {
      const latestInteraction = customer.interactions?.sort((a: any, b: any) => {
        const dateA = a.interaction_date ? new Date(a.interaction_date).getTime() : 0;
        const dateB = b.interaction_date ? new Date(b.interaction_date).getTime() : 0;
        return dateB - dateA;
      })[0];
      
      return {
        ...customer,
        interactions: latestInteraction ? [latestInteraction] : []
      };
    }).sort((a: any, b: any) => {
      const aDate = a.interactions[0]?.interaction_date ? new Date(a.interactions[0].interaction_date).getTime() : 0;
      const bDate = b.interactions[0]?.interaction_date ? new Date(b.interactions[0].interaction_date).getTime() : 0;
      return bDate - aDate;
    }).slice(0, 5);

    return NextResponse.json(customersWithLatestInteraction);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
} 