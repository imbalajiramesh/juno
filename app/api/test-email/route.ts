import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's email
    const userEmail = user.email;
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    // Add a test notification to the queue
    const { data: notification, error: queueError } = await (supabase as any)
      .from('notification_queue')
      .insert({
        recipient_email: userEmail,
        subject: 'Test Email from Juno',
        body: `
          <h2>🎉 Test Email Successful!</h2>
          <p>Hello! This is a test email to verify that the Juno email system is working correctly.</p>
          <p><strong>User ID:</strong> ${user.id}</p>
          <p><strong>Email:</strong> ${userEmail}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            This email was sent by the Juno notification system.
          </p>
        `,
        status: 'pending'
      })
      .select()
      .single();

    if (queueError) {
      console.error('Error queuing test email:', queueError);
      return NextResponse.json({ error: 'Failed to queue test email' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Test email queued successfully',
      notification_id: notification.id,
      recipient: userEmail
    });

  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 