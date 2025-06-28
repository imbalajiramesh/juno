import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Template rendering function
async function renderEmailTemplate(supabase: any, templateKey: string, variables: any) {
  // Get template from database
  const { data: template, error: templateError } = await supabase
    .from('email_templates')
    .select('subject, body')
    .eq('template_key', templateKey)
    .single();

  if (templateError || !template) {
    console.error('Template not found:', templateKey, templateError);
    // Fallback template
    return {
      subject: `Juno Organization Update`,
      body: `<p>Your organization status has been updated.</p><p>Details: ${JSON.stringify(variables)}</p>`
    };
  }

  // Simple variable replacement
  let subject = template.subject;
  let body = template.body;

  // Replace variables in subject and body
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
    body = body.replace(new RegExp(placeholder, 'g'), String(value));
  });

  return { subject, body };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get pending notifications from the queue (just 1 for testing)
    const { data: notifications, error: notificationsError } = await (supabase as any)
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ message: 'No pending notifications', processed: 0 });
    }

    const notification = notifications[0];

    try {
      // Get email template and render
      const { subject, body } = await renderEmailTemplate(
        supabase,
        notification.template_key,
        notification.variables || {}
      );

      console.log('Rendered email:', { subject, recipient: notification.recipient_email });

      // Send email using Resend
      const emailResult = await resend.emails.send({
        from: 'Juno <noreply@juno.laxmint.com>',
        to: notification.recipient_email,
        subject,
        html: body,
      });

      if (emailResult.error) {
        console.error('Email send error:', emailResult.error);
        return NextResponse.json({ 
          error: 'Email send failed', 
          details: emailResult.error 
        }, { status: 500 });
      } else {
        // Mark as sent
        await (supabase as any)
          .from('notification_queue')
          .update({
            status: 'sent',
            processed_at: new Date().toISOString(),
            external_id: emailResult.data?.id
          })
          .eq('id', notification.id);

        return NextResponse.json({
          success: true,
          message: 'Test email sent successfully',
          email_id: emailResult.data?.id,
          recipient: notification.recipient_email,
          subject
        });
      }
    } catch (emailError) {
      console.error('Email processing error:', emailError);
      return NextResponse.json({ 
        error: 'Email processing failed', 
        details: emailError instanceof Error ? emailError.message : 'Unknown error' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Test email processor error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 