import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify webhook signature (recommended in production)
    const signature = request.headers.get('resend-signature');
    // TODO: Verify signature with Resend webhook secret
    
    const { type, data } = body;
    
    if (type !== 'email.received') {
      return NextResponse.json({ message: 'Event type not handled' }, { status: 200 });
    }
    
    const supabase = await createClient();
    
    // Find the mailbox this email belongs to
    const { data: mailbox } = await supabase
      .from('mailbox_configs')
      .select('*')
      .eq('email_address', data.to)
      .eq('status', 'active')
      .single();
    
    if (!mailbox) {
      console.log(`No active mailbox found for ${data.to}`);
      return NextResponse.json({ message: 'Mailbox not found' }, { status: 200 });
    }
    
    // Store the received email
    const { error: messageError } = await supabase
      .from('mailbox_messages')
      .insert({
        mailbox_id: mailbox.id,
        tenant_id: mailbox.tenant_id,
        message_id: data.message_id || `resend_${Date.now()}`,
        subject: data.subject || '(No Subject)',
        sender_email: data.from,
        sender_name: data.from_name || data.from,
        recipient_emails: [data.to],
        cc_emails: data.cc || [],
        bcc_emails: data.bcc || [],
        body_text: data.text,
        body_html: data.html,
        is_read: false,
        has_attachments: !!(data.attachments && data.attachments.length > 0),
        folder: 'INBOX',
        received_at: new Date().toISOString(),
      });
    
    if (messageError) {
      console.error('Error storing email message:', messageError);
      return NextResponse.json({ error: 'Failed to store message' }, { status: 500 });
    }
    
    // Handle attachments if present
    if (data.attachments && data.attachments.length > 0) {
      const { data: message } = await supabase
        .from('mailbox_messages')
        .select('id')
        .eq('mailbox_id', mailbox.id)
        .eq('message_id', data.message_id || `resend_${Date.now()}`)
        .single();
      
      if (message) {
        const attachmentPromises = data.attachments.map((attachment: any) =>
          supabase
            .from('mailbox_attachments')
            .insert({
              message_id: message.id,
              tenant_id: mailbox.tenant_id,
              filename: attachment.filename,
              content_type: attachment.content_type,
              size_bytes: attachment.size,
              download_url: attachment.url,
              is_inline: attachment.disposition === 'inline',
            })
        );
        
        await Promise.all(attachmentPromises);
      }
    }
    
    // Update unread count
    await supabase
      .from('mailbox_configs')
      .update({ 
        unread_count: mailbox.unread_count + 1,
        last_sync: new Date().toISOString()
      })
      .eq('id', mailbox.id);
    
    console.log(`Successfully processed inbound email for ${data.to}`);
    return NextResponse.json({ message: 'Email processed successfully' }, { status: 200 });
    
  } catch (error) {
    console.error('Error processing inbound email webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 