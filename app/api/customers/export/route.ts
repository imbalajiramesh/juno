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

export const GET = withTenant(async (tenantId: string, request: NextRequest) => {
  const supabase = await createClient();
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const columnsParam = searchParams.get('columns') || 'first_name,last_name,email,phone_number,status';
    const customerIdsParam = searchParams.get('customerIds');
    
    const columns = columnsParam.split(',');
    const customerIds = customerIdsParam ? customerIdsParam.split(',') : null;

    // Build the query
    let query = supabase
      .from('customers')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    // Filter by specific customer IDs if provided
    if (customerIds && customerIds.length > 0) {
      query = query.in('id', customerIds);
    }

    const { data: customers, error } = await query;
    if (error) throw error;

    // Get custom field definitions for proper column mapping
    const { data: customFields } = await supabase
      .from('custom_field_definitions')
      .select('*')
      .eq('tenant_id', tenantId);

    // Transform data based on selected columns
    const exportData = (customers || []).map(customer => {
      const customFieldsData = customer.custom_fields as CustomFields || {};
      // Type assertion to include new agent interaction fields
      const customerWithAgent = customer as any;
      const row: Record<string, any> = {};

      columns.forEach(column => {
        switch (column) {
          case 'first_name':
            row['First Name'] = customer.first_name;
            break;
          case 'last_name':
            row['Last Name'] = customer.last_name;
            break;
          case 'email':
            row['Email'] = customer.email || '';
            break;
          case 'phone_number':
            row['Phone Number'] = customer.phone_number || '';
            break;
          case 'address':
            row['Address'] = customer.address || '';
            break;
          case 'zip_code':
            row['ZIP Code'] = customer.zip_code || '';
            break;
          case 'status':
            row['Status'] = customer.status || '';
            break;
          case 'created_at':
            row['Created Date'] = new Date(customer.created_at).toLocaleDateString();
            break;
          case 'updated_at':
            row['Last Updated'] = new Date(customer.updated_at).toLocaleDateString();
            break;
          case 'notes':
            row['Notes'] = customFieldsData.notes || '';
            break;
          // Agent interaction columns
                  case 'total_juno_calls':
          row['Total Juno Calls'] = customerWithAgent.total_juno_calls || 0;
          break;
        case 'total_juno_emails':
          row['Total Juno Emails'] = customerWithAgent.total_juno_emails || 0;
          break;
        case 'total_juno_sms':
          row['Total Juno SMS'] = customerWithAgent.total_juno_sms || 0;
          break;
        case 'juno_call_duration_total':
          row['Total Call Duration (mins)'] = customerWithAgent.juno_call_duration_total || 0;
          break;
        case 'last_juno_call_date':
          row['Last Juno Call Date'] = customerWithAgent.last_juno_call_date
            ? new Date(customerWithAgent.last_juno_call_date).toLocaleDateString()
            : '';
          break;
        case 'last_juno_interaction_type':
          row['Last Juno Interaction Type'] = customerWithAgent.last_juno_interaction_type || '';
          break;
        case 'last_juno_interaction_date':
          row['Last Juno Interaction Date'] = customerWithAgent.last_juno_interaction_date
            ? new Date(customerWithAgent.last_juno_interaction_date).toLocaleDateString()
            : '';
            break;
          default:
            // Check if it's a custom field
            const customField = customFields?.find(f => f.name === column);
            if (customField) {
              row[customField.label] = customFieldsData[column] || '';
            }
            break;
        }
      });

      return row;
    });

    if (format === 'xlsx') {
      // For now, return an error message that XLSX is not supported
      return NextResponse.json(
        { error: 'Excel export is not currently supported. Please use CSV format.' },
        { status: 400 }
      );
    } else {
      // Generate CSV file
      const csv = exportData.length > 0 ? parse(exportData) : '';

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=customers_export_${new Date().toISOString().split('T')[0]}.csv`,
        },
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export customers' },
      { status: 500 }
    );
  }
}); 