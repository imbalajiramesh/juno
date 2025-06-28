import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withTenant } from '@/lib/get-tenant';
import { z } from 'zod';

const statusSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .regex(/^[a-z0-9_]+$/, 'Name must contain only lowercase letters, numbers, and underscores'),
  label: z.string().min(1, 'Label is required'),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color must be a valid hex color').optional(),
  is_default: z.boolean().optional(),
  display_order: z.number().optional(),
});

const updateStatusSchema = statusSchema.omit({ name: true });

export const GET = withTenant(async (tenantId: string) => {
  const supabase = await createClient();
  try {
    const { data: statuses, error } = await (supabase as any)
      .from('customer_status_definitions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    // If no custom statuses exist, return default statuses
    if (!statuses || statuses.length === 0) {
      const defaultStatuses = [
        { name: 'new', label: 'New', color: '#3b82f6', is_default: true, display_order: 0 },
        { name: 'contacted', label: 'Contacted', color: '#f59e0b', is_default: false, display_order: 1 },
        { name: 'qualified', label: 'Qualified', color: '#8b5cf6', is_default: false, display_order: 2 },
        { name: 'proposal', label: 'Proposal', color: '#06b6d4', is_default: false, display_order: 3 },
        { name: 'closed_won', label: 'Closed Won', color: '#10b981', is_default: false, display_order: 4 },
        { name: 'closed_lost', label: 'Closed Lost', color: '#ef4444', is_default: false, display_order: 5 },
      ];
      return NextResponse.json(defaultStatuses);
    }

    return NextResponse.json(statuses);
  } catch (error) {
    console.error('Error fetching customer statuses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer statuses' },
      { status: 500 }
    );
  }
});

export const POST = withTenant(async (tenantId: string, request: NextRequest) => {
  const supabase = await createClient();
  try {
    const data = await request.json();
    const validatedData = statusSchema.parse(data);

    // Check if status name already exists for this tenant
    const { data: existing } = await (supabase as any)
      .from('customer_status_definitions')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('name', validatedData.name)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Status name already exists' },
        { status: 400 }
      );
    }

    // If this is set as default, unset any existing default
    if (validatedData.is_default) {
      await (supabase as any)
        .from('customer_status_definitions')
        .update({ is_default: false })
        .eq('tenant_id', tenantId)
        .eq('is_default', true);
    }

    const { data: status, error } = await (supabase as any)
      .from('customer_status_definitions')
      .insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        name: validatedData.name,
        label: validatedData.label,
        color: validatedData.color || '#6b7280',
        is_default: validatedData.is_default || false,
        display_order: validatedData.display_order || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating customer status:', error);
    return NextResponse.json(
      { error: 'Failed to create customer status' },
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
        { error: 'Status ID is required' },
        { status: 400 }
      );
    }

    const data = await request.json();
    const validatedData = updateStatusSchema.parse(data);

    // Verify the status belongs to this tenant
    const { data: existingStatus } = await (supabase as any)
      .from('customer_status_definitions')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (!existingStatus) {
      return NextResponse.json(
        { error: 'Status not found' },
        { status: 404 }
      );
    }

    // If this is set as default, unset any existing default
    if (validatedData.is_default) {
      await (supabase as any)
        .from('customer_status_definitions')
        .update({ is_default: false })
        .eq('tenant_id', tenantId)
        .eq('is_default', true)
        .neq('id', id);
    }

    const { data: status, error } = await (supabase as any)
      .from('customer_status_definitions')
      .update({
        label: validatedData.label,
        color: validatedData.color || existingStatus.color,
        is_default: validatedData.is_default ?? existingStatus.is_default,
        display_order: validatedData.display_order ?? existingStatus.display_order,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating customer status:', error);
    return NextResponse.json(
      { error: 'Failed to update customer status' },
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
        { error: 'Status ID is required' },
        { status: 400 }
      );
    }

    // Verify the status belongs to this tenant
    const { data: status } = await (supabase as any)
      .from('customer_status_definitions')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (!status) {
      return NextResponse.json(
        { error: 'Status not found' },
        { status: 404 }
      );
    }

    // Check if any customers are using this status
    const { count } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', status.name);

    if (count && count > 0) {
      return NextResponse.json(
        { error: `Cannot delete status. ${count} customers are currently using this status.` },
        { status: 400 }
      );
    }

    const { error } = await (supabase as any)
      .from('customer_status_definitions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting customer status:', error);
    return NextResponse.json(
      { error: 'Failed to delete customer status' },
      { status: 500 }
    );
  }
}); 