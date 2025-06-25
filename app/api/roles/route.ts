import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = await createClient();
  try {
    const { data: roles, error } = await supabase
      .from('roles')
      .select('id, role_name, description')
      .order('role_name');

    if (error) throw error;

    return NextResponse.json(roles || []);
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
} 