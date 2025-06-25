import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user's session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch active credit packages
    const { data: packages, error } = await (supabase as any)
      .from('credit_packages')
      .select('*')
      .eq('is_active', true)
      .order('credits', { ascending: true });

    if (error) {
      console.error('Error fetching credit packages:', error);
      return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
    }

    return NextResponse.json(packages || []);
  } catch (error) {
    console.error('Error in credit packages API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 