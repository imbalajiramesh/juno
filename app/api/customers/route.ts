// - All database operations now use the Supabase client.
// - Relational and custom field queries are adapted for Supabase.
// - RLS is now supported if enabled in Supabase.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withTenant } from '@/lib/get-tenant';
import { z } from 'zod';

// Separate standard fields from custom fields
function separateCustomFields(data: any) {
  const standardFields = [
    'id', 'first_name', 'last_name', 'email', 'phone_number',
    'address', 'zip_code', 'age', 'status', 'sub_status',
    'ownership_status', 'knows_about_program', 'applied_for_program',
    'hydro_bill', 'gas_bill', 'home_age', 'attic_insulation',
    'ac_age', 'ac_ownership', 'ac_rent_amount', 'furnace_age',
    'furnace_ownership', 'furnace_rent_amount', 'water_heater_age',
    'water_heater_ownership', 'water_heater_rent_amount',
    'user_account_id', 'last_interaction', 'tenant_id'
  ];

  const standardData: any = {};
  const customFields: any = {};

  Object.entries(data).forEach(([key, value]) => {
    if (standardFields.includes(key)) {
      standardData[key] = value;
    } else {
      customFields[key] = value;
    }
  });

  return { standardData, customFields };
}

// Validate custom fields against their definitions
async function validateCustomFields(customFields: any, tenantId: string, supabase: any) {
  // Get custom field definitions for this tenant
  const { data: definitions, error } = await supabase
    .from('custom_field_definitions')
    .select('*')
    .eq('tenant_id', tenantId);
  if (error) throw error;

  const errors: string[] = [];

  // Check required fields
  definitions?.forEach((def: any) => {
    if (def.required && !customFields.hasOwnProperty(def.name)) {
      errors.push(`${def.label} is required`);
      return;
    }

    const value = customFields[def.name];
    if (!value && def.required) {
      errors.push(`${def.label} is required`);
      return;
    }

    if (value) {
      // Type validation
      switch (def.type) {
        case 'number':
          if (typeof value !== 'number') {
            errors.push(`${def.label} must be a number`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`${def.label} must be a boolean`);
          }
          break;
        case 'date':
          if (isNaN(Date.parse(value))) {
            errors.push(`${def.label} must be a valid date`);
          }
          break;
        case 'select':
          const options = def.options ? JSON.parse(def.options as string) : [];
          if (!options.includes(value)) {
            errors.push(`${def.label} must be one of: ${options.join(', ')}`);
          }
          break;
      }
    }
  });

  return errors;
}

export const GET = withTenant(async (tenantId: string, request: NextRequest) => {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const searchTerm = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || '';
  const customField = searchParams.get('customField');
  const customValue = searchParams.get('customValue');
  const itemsPerPage = 10;
  const from = (page - 1) * itemsPerPage;
  const to = from + itemsPerPage - 1;

  try {
    let query = supabase
      .from('customers')
      .select(`*, interactions(*), user_accounts!customers_user_account_id_fkey(id, first_name, last_name)`, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (searchTerm) {
      query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
    }
    if (statusFilter && statusFilter !== 'All') {
      query = query.eq('status', statusFilter.toLowerCase().replace(' ', '_'));
    }
    if (customField && customValue) {
      query = query.contains('custom_fields', { [customField]: customValue });
    }

    const { data: customers, error, count: totalCount } = await query;
    if (error) throw error;

    return NextResponse.json({ customers, totalCount });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
});

export const POST = withTenant(async (tenantId: string, request: NextRequest) => {
  const supabase = await createClient();
  const data = await request.json();
  
  try {
    const { standardData, customFields } = separateCustomFields(data);
    const validationErrors = await validateCustomFields(customFields, tenantId, supabase);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation error', details: validationErrors },
        { status: 400 }
      );
    }
    
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        id: crypto.randomUUID(),
        first_name: standardData.first_name,
        last_name: standardData.last_name,
        email: standardData.email,
        phone_number: standardData.phone_number,
        status: standardData.status || 'new',
        custom_fields: Object.keys(customFields).length > 0 ? customFields : null,
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Error creating customer' },
      { status: 500 }
    );
  }
});

export const PUT = withTenant(async (tenantId: string, request: NextRequest) => {
  const supabase = await createClient();
  try {
    const body = await request.json();
    const { id } = body;
    
    // Verify the customer belongs to the current tenant
    const { data: existingCustomer, error: findError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
      
    if (findError || !existingCustomer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }
    
    const { standardData, customFields } = separateCustomFields(body);
    const validationErrors = await validateCustomFields(customFields, tenantId, supabase);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation error', details: validationErrors },
        { status: 400 }
      );
    }
    
    const existingFields = existingCustomer.custom_fields as Record<string, any> || {};
    const mergedCustomFields = {
      ...existingFields,
      ...customFields
    };
    
    const { data: updatedCustomer, error: updateError } = await supabase
      .from('customers')
      .update({
        first_name: standardData.first_name,
        last_name: standardData.last_name,
        email: standardData.email,
        phone_number: standardData.phone_number,
        status: standardData.status,
        custom_fields: Object.keys(mergedCustomFields).length > 0 ? mergedCustomFields : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
      
    if (updateError) throw updateError;
    return NextResponse.json(updatedCustomer);
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: 'Error updating customer' },
      { status: 500 }
    );
  }
}); 