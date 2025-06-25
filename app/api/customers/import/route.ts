// - All database operations now use the Supabase client.
// - RLS is now supported if enabled in Supabase.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withTenant } from '@/lib/get-tenant';
import { parse as csvParse } from 'csv-parse/sync';

type CustomFields = {
  notes?: string;
  [key: string]: any;
};

export const POST = withTenant(async (tenantId: string, req: NextRequest) => {
  const supabase = await createClient();
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const csvContent = await file.text();
    const records = csvParse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });

    const createdCustomers = await Promise.all(
      records.map(async (record: any) => {
        // Extract standard fields
        const standardFields = {
          first_name: record.First_Name,
          last_name: record.Last_Name,
          email: record.Email,
          phone_number: record.Phone_Number,
          status: record.Status || 'New',
        };

        // Extract custom fields (including notes)
        const customFields: CustomFields = {};
        if (record.Notes) {
          customFields.notes = record.Notes;
        }

        // Add any additional custom fields from the CSV
        Object.entries(record).forEach(([key, value]) => {
          if (!['First_Name', 'Last_Name', 'Email', 'Phone_Number', 'Status', 'Notes'].includes(key) && value) {
            customFields[key] = value;
          }
        });

        // Find existing customer by email to avoid duplicates
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('email', record.Email)
          .single();

        if (existingCustomer) {
          // Update existing customer
          const currentCustomFields = existingCustomer.custom_fields as CustomFields || {};
          const { data, error } = await supabase
            .from('customers')
            .update({
              ...standardFields,
              custom_fields: {
                ...currentCustomFields,
                ...customFields
              }
            })
            .eq('id', existingCustomer.id)
            .select()
            .single();
          if (error) throw error;
          return data;
        } else {
          // Create new customer
          const { data, error } = await supabase
            .from('customers')
            .insert({
              id: crypto.randomUUID(),
              ...standardFields,
              tenant_id: tenantId,
              custom_fields: Object.keys(customFields).length > 0 ? customFields : null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          if (error) throw error;
          return data;
        }
      })
    );

    return NextResponse.json({
      message: 'Customers imported successfully',
      count: createdCustomers.length
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import customers' },
      { status: 500 }
    );
  }
}); 