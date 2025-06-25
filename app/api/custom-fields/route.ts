// - All database operations now use the Supabase client.
// - RLS is now supported if enabled in Supabase.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withTenant } from '@/lib/get-tenant';
import { z } from 'zod';

// Validation schema for custom field definition
const customFieldSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .regex(/^[a-z0-9_]+$/, 'Name must contain only lowercase letters, numbers, and underscores'),
  label: z.string().min(1, 'Label is required'),
  type: z.enum(['string', 'number', 'boolean', 'date', 'select']),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
});

// Validation schema for updating (name is optional)
const updateCustomFieldSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  type: z.enum(['string', 'number', 'boolean', 'date', 'select']),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
});

type CustomFieldInput = z.infer<typeof customFieldSchema>;
type UpdateCustomFieldInput = z.infer<typeof updateCustomFieldSchema>;

export const GET = withTenant(async (tenantId: string) => {
  const supabase = await createClient();
  try {
    const { data: fields, error } = await supabase
      .from('custom_field_definitions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Transform the fields to ensure proper typing of options
    const transformedFields = (fields || []).map(field => ({
      ...field,
      options: field.options ? JSON.parse(field.options as string) : undefined,
    }));

    return NextResponse.json(transformedFields);
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom fields' },
      { status: 500 }
    );
  }
});

export const POST = withTenant(async (tenantId: string, request: NextRequest) => {
  const supabase = await createClient();
  try {
    const data = await request.json();
    
    // Validate the input
    const validatedData = customFieldSchema.parse(data);

    // Check if field name already exists for this tenant
    const { data: existing } = await supabase
      .from('custom_field_definitions')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('name', validatedData.name)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Field name already exists' },
        { status: 400 }
      );
    }

    // Create the custom field definition
    const { data: field, error } = await supabase
      .from('custom_field_definitions')
      .insert({
        id: crypto.randomUUID(),
        name: validatedData.name,
        label: validatedData.label,
        type: validatedData.type,
        required: validatedData.required || false,
        options: validatedData.options ? JSON.stringify(validatedData.options) : null,
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Transform the response to include parsed options
    const transformedField = {
      ...field,
      options: field.options ? JSON.parse(field.options as string) : undefined,
    };

    return NextResponse.json(transformedField);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating custom field:', error);
    return NextResponse.json(
      { error: 'Failed to create custom field' },
      { status: 500 }
    );
  }
});

export const DELETE = withTenant(async (tenantId: string, request: NextRequest) => {
  const supabase = await createClient();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Field ID is required' },
        { status: 400 }
      );
    }

    // Verify the field belongs to this tenant
    const { data: field } = await supabase
      .from('custom_field_definitions')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (!field) {
      return NextResponse.json(
        { error: 'Field not found' },
        { status: 404 }
      );
    }

    // Delete the field
    const { error } = await supabase
      .from('custom_field_definitions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom field:', error);
    return NextResponse.json(
      { error: 'Failed to delete custom field' },
      { status: 500 }
    );
  }
});

export const PUT = withTenant(async (tenantId: string, request: NextRequest) => {
  const supabase = await createClient();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Field ID is required' },
        { status: 400 }
      );
    }

    const data = await request.json();
    
    // Validate the input
    const validatedData = updateCustomFieldSchema.parse(data);

    // Verify the field belongs to this tenant
    const { data: existingField } = await supabase
      .from('custom_field_definitions')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (!existingField) {
      return NextResponse.json(
        { error: 'Field not found' },
        { status: 404 }
      );
    }

    // Update the field
    const { data: field, error } = await supabase
      .from('custom_field_definitions')
      .update({
        label: validatedData.label,
        type: validatedData.type,
        required: validatedData.required || false,
        options: validatedData.options ? JSON.stringify(validatedData.options) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Transform the response to include parsed options
    const transformedField = {
      ...field,
      options: field.options ? JSON.parse(field.options as string) : undefined,
    };

    return NextResponse.json(transformedField);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating custom field:', error);
    return NextResponse.json(
      { error: 'Failed to update custom field' },
      { status: 500 }
    );
  }
}); 