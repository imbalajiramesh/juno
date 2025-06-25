import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const mailboxId = searchParams.get('mailbox_id');
    const folder = searchParams.get('folder') || 'INBOX';
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!mailboxId) {
      return NextResponse.json({ error: 'Mailbox ID is required' }, { status: 400 });
    }

    // Verify mailbox belongs to tenant
    const { data: mailboxConfig } = await supabase
      .from('mailbox_configs')
      .select('id, email_address')
      .eq('id', mailboxId)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (!mailboxConfig) {
      return NextResponse.json({ error: 'Mailbox not found' }, { status: 404 });
    }

    // Build query
    let query = supabase
      .from('mailbox_messages')
      .select(`
        id,
        subject,
        sender_email,
        sender_name,
        received_at,
        is_read,
        is_starred,
        has_attachments,
        body_text,
        folder
      `)
      .eq('mailbox_id', mailboxId)
      .eq('tenant_id', profile.tenant_id);

    // Filter by folder
    if (folder === 'STARRED') {
      query = query.eq('is_starred', true);
    } else {
      query = query.eq('folder', folder);
    }

    // Add search filter
    if (search) {
      query = query.or(`subject.ilike.%${search}%,sender_email.ilike.%${search}%,sender_name.ilike.%${search}%,body_text.ilike.%${search}%`);
    }

    // Add pagination and ordering
    query = query
      .order('received_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: messages, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Format messages for frontend
    const formattedMessages = (messages || []).map((message: any) => ({
      id: message.id,
      subject: message.subject,
      sender_email: message.sender_email,
      sender_name: message.sender_name,
      received_at: message.received_at,
      is_read: message.is_read,
      is_starred: message.is_starred,
      has_attachments: message.has_attachments,
      preview_text: message.body_text ? 
        message.body_text.substring(0, 200).replace(/\s+/g, ' ').trim() : '',
      mailbox_email: mailboxConfig.email_address,
      folder: message.folder,
    }));

    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error('Error in messages GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}