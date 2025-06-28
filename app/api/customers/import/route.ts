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
          address: record.Address,
          zip_code: record.ZIP_Code,
          status: record.Status || 'New',
          // Agent interaction fields
                total_juno_calls: record.Total_Juno_Calls ? parseInt(record.Total_Juno_Calls) || 0 : 0,
      total_juno_emails: record.Total_Juno_Emails ? parseInt(record.Total_Juno_Emails) || 0 : 0,
      total_juno_sms: record.Total_Juno_SMS ? parseInt(record.Total_Juno_SMS) || 0 : 0,
      juno_call_duration_total: record.Juno_Call_Duration_Total ? parseInt(record.Juno_Call_Duration_Total) || 0 : 0,
      last_juno_call_date: record.Last_Juno_Call_Date ? new Date(record.Last_Juno_Call_Date).toISOString() : null,
      last_juno_interaction_type: record.Last_Juno_Interaction_Type || null,
      last_juno_interaction_date: record.Last_Juno_Interaction_Date ? new Date(record.Last_Juno_Interaction_Date).toISOString() : null,
        };

        // Extract custom fields (including notes)
        const customFields: CustomFields = {};
        if (record.Notes) {
          customFields.notes = record.Notes;
        }

        // Add any additional custom fields from the CSV
        const excludedColumns = [
          'First_Name', 'Last_Name', 'Email', 'Phone_Number', 'Address', 'ZIP_Code', 'Status', 'Notes',
                'Total_Juno_Calls', 'Total_Juno_Emails', 'Total_Juno_SMS', 'Juno_Call_Duration_Total',
      'Last_Juno_Call_Date', 'Last_Juno_Interaction_Type', 'Last_Juno_Interaction_Date'
        ];
        
        Object.entries(record).forEach(([key, value]) => {
          if (!excludedColumns.includes(key) && value) {
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