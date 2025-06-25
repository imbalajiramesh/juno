// - All database operations now use the Supabase client.
// - RLS is now supported if enabled in Supabase.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withTenant } from '@/lib/get-tenant';
import { parse } from 'json2csv';

type CustomFields = {
  notes?: string;
  [key: string]: any;
};

export const GET = withTenant(async (tenantId: string) => {
  const supabase = await createClient();
  try {
    // Get all customers for the tenant
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform data for CSV export
    const csvData = (customers || []).map(customer => {
      const customFields = customer.custom_fields as CustomFields || {};
      
      return {
        First_Name: customer.first_name,
        Last_Name: customer.last_name,
        Email: customer.email,
        Phone_Number: customer.phone_number,
        Status: customer.status,
        Notes: customFields.notes || '',
        // Add any other custom fields
        ...Object.fromEntries(
          Object.entries(customFields).filter(([key]) => key !== 'notes')
        )
      };
    });

    // Convert to CSV
    const csv = parse(csvData);

    // Return CSV as downloadable file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=customers.csv',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export customers' },
      { status: 500 }
    );
  }
}); 