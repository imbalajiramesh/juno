// - All database operations now use the Supabase client.
// - RLS is now supported if enabled in Supabase.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withTenant } from '@/lib/get-tenant';

export const GET = withTenant(async (tenantId: string) => {
  const supabase = await createClient();
  try {
    // Get team members for the organization with role information
    const { data: teamMembers, error } = await supabase
      .from('user_accounts')
      .select(`
        *,
        role:roles(
          role_name
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(teamMembers || []);
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
});

export const POST = withTenant(async (tenantId: string, req: NextRequest) => {
  const supabase = await createClient();
  try {
    const data = await req.json();
    
    // Create new team member
    const { data: teamMember, error } = await supabase
      .from('user_accounts')
      .insert({
        ...data,
        tenant_id: tenantId,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(teamMember);
  } catch (error) {
    console.error('Error creating team member:', error);
    return NextResponse.json(
      { error: 'Failed to create team member' },
      { status: 500 }
    );
  }
});

export const PUT = withTenant(async (tenantId: string, request: NextRequest) => {
    const supabase = await createClient();
    try {
      const data = await request.json();
      const { id, ...updateData } = data;

      const { data: member, error } = await supabase
        .from('user_accounts')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json(member);
    } catch (error) {
      console.error('Error updating team member:', error);
      return NextResponse.json(
        { error: 'Failed to update team member' },
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
          { error: 'Member ID is required' },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from('user_accounts')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting team member:', error);
      return NextResponse.json(
        { error: 'Failed to delete team member' },
        { status: 500 }
      );
    }
  }); 