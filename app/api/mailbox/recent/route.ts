import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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

    // Fetch recent emails from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: emails, error } = await supabase
      .from('mailbox_messages')
      .select(`
        id,
        subject,
        sender_email,
        sender_name,
        received_at,
        is_read,
        has_attachments,
        body_text,
        mailbox_configs!inner(email_address)
      `)
      .eq('tenant_id', profile.tenant_id)
      .gte('received_at', sevenDaysAgo.toISOString())
      .order('received_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching recent emails:', error);
      return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('mailbox_messages')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', profile.tenant_id)
      .eq('is_read', false);

    // Format emails for the frontend
    const formattedEmails = (emails || []).map((email: any) => ({
      id: email.id,
      subject: email.subject,
      sender_email: email.sender_email,
      sender_name: email.sender_name,
      received_at: email.received_at,
      is_read: email.is_read,
      has_attachments: email.has_attachments,
      preview_text: email.body_text ? 
        email.body_text.substring(0, 200).replace(/\s+/g, ' ').trim() : '',
      mailbox_email: email.mailbox_configs.email_address,
    }));

    return NextResponse.json({
      emails: formattedEmails,
      unread_count: unreadCount || 0,
    });
  } catch (error) {
    console.error('Error in recent emails GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 