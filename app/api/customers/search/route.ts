// - All database operations now use the Supabase client.
// - RLS is now supported if enabled in Supabase.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withTenant } from '@/lib/get-tenant';

export const GET = withTenant(async (tenantId: string, request: NextRequest) => {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const customField = searchParams.get('field');
  const value = searchParams.get('value');
  const page = parseInt(searchParams.get('page') || '1');
  const itemsPerPage = 10;
  const from = (page - 1) * itemsPerPage;
  const to = from + itemsPerPage - 1;

  if (!customField) {
    return NextResponse.json(
      { error: 'Custom field name is required' },
      { status: 400 }
    );
  }

  try {
    // Get the field definition to determine the type
    const { data: fieldDef, error: fieldError } = await supabase
      .from('custom_field_definitions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('name', customField)
      .single();
    if (fieldError || !fieldDef) {
      return NextResponse.json(
        { error: 'Custom field not found' },
        { status: 404 }
      );
    }

    // Build the filter for the custom field
    let filter = {};
    if (value) {
      switch (fieldDef.type) {
        case 'number':
          filter = { [customField]: parseFloat(value) };
          break;
        case 'boolean':
          filter = { [customField]: value.toLowerCase() === 'true' };
          break;
        case 'date':
          filter = { [customField]: new Date(value).toISOString() };
          break;
        default:
          filter = { [customField]: value };
      }
    }

    // Query customers with the custom field filter
    let query = supabase
      .from('customers')
      .select('*, assigned_to(id, first_name, last_name)', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (value) {
      query = query.contains('custom_fields', filter);
    }
    const { data: customers, error, count: totalCount } = await query;
    if (error) throw error;

    return NextResponse.json({
      customers,
      totalCount,
      pageCount: Math.ceil((totalCount || 0) / itemsPerPage),
    });
  } catch (error) {
    console.error('Error searching customers:', error);
    return NextResponse.json(
      { error: 'Failed to search customers' },
      { status: 500 }
    );
  }
}); 