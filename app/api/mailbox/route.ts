import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant_id
    const { data: profile } = await supabase
      .from('user_accounts')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    // Fetch mailbox configurations for this tenant
    const { data: mailboxes, error } = await supabase
      .from('mailbox_configs')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching mailboxes:', error);
      return NextResponse.json({ error: 'Failed to fetch mailboxes' }, { status: 500 });
    }

    return NextResponse.json(mailboxes || []);
  } catch (error) {
    console.error('Error in mailbox GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 