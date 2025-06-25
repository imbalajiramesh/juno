// - All database operations now use the Supabase client.
// - RLS is now supported if enabled in Supabase.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withTenant } from '@/lib/get-tenant';

export const GET = withTenant(async (tenantId: string) => {
  const supabase = await createClient();
  try {
    const { data: userAccounts, error } = await supabase
      .from('user_accounts')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(userAccounts || []);
  } catch (error) {
    console.error('Error fetching user accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user accounts' },
      { status: 500 }
    );
  }
});

export const POST = withTenant(async (tenantId: string, req: NextRequest) => {
  const supabase = await createClient();
  try {
    const data = await req.json();
    
    const { data: userAccount, error } = await supabase
      .from('user_accounts')
      .insert({
        ...data,
        tenant_id: tenantId,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(userAccount);
  } catch (error) {
    console.error('Error creating user account:', error);
    return NextResponse.json(
      { error: 'Failed to create user account' },
      { status: 500 }
    );
  }
});

export const PUT = withTenant(async (tenantId: string, req: NextRequest) => {
  const supabase = await createClient();
  try {
    const data = await req.json();
    const { id, ...updateData } = data;
    
    const { data: userAccount, error } = await supabase
      .from('user_accounts')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(userAccount);
  } catch (error) {
    console.error('Error updating user account:', error);
    return NextResponse.json(
      { error: 'Failed to update user account' },
      { status: 500 }
    );
  }
});

export const DELETE = withTenant(async (tenantId: string, req: NextRequest) => {
  const supabase = await createClient();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'User account ID is required' },
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
    console.error('Error deleting user account:', error);
    return NextResponse.json(
      { error: 'Failed to delete user account' },
      { status: 500 }
    );
  }
}); 