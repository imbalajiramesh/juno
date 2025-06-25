import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { Resend } from 'resend';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  // Verify this is an internal API call
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { 
      tenantId, 
      tenantName, 
      email, 
      phoneNumber, 
      currentBalance, 
      requiredCredits 
    } = await request.json();

    if (!email || !phoneNumber || currentBalance === undefined || !requiredCredits) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const shortfall = requiredCredits - currentBalance;

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
      to: [email],
      subject: `⚠️ Insufficient Credits - Phone Number Suspended`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Insufficient Credits Notification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Credits Alert</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Immediate Action Required</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e1e5e9;">
            <h2 style="color: #d73502; margin-top: 0;">Phone Number Suspended</h2>
            
            <p>Hello,</p>
            
            <p>Your phone number <strong>${phoneNumber}</strong> has been temporarily suspended due to insufficient credits in your account.</p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #856404;">Account Details:</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li><strong>Organization:</strong> ${tenantName || 'Your Organization'}</li>
                <li><strong>Phone Number:</strong> ${phoneNumber}</li>
                <li><strong>Current Balance:</strong> ${currentBalance} credits</li>
                <li><strong>Required for Monthly Billing:</strong> ${requiredCredits} credits</li>
                <li><strong>Shortfall:</strong> ${shortfall} credits</li>
              </ul>
            </div>
            
            <h3 style="color: #2d3748;">What happens now?</h3>
            <ul>
              <li>📵 <strong>Phone number suspended:</strong> Incoming calls and SMS will not be processed</li>
              <li>⏰ <strong>Automatic retry:</strong> We'll try billing again in 7 days</li>
              <li>💳 <strong>Immediate restoration:</strong> Add credits to restore service instantly</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/credits" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: bold; 
                        display: inline-block;
                        text-transform: uppercase;
                        letter-spacing: 1px;">
                Add Credits Now
              </a>
            </div>
            
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #495057;">💡 Prevent Future Suspensions:</h4>
              <ul style="margin: 10px 0; color: #6c757d;">
                <li>Set up automatic low-balance alerts</li>
                <li>Purchase larger credit packages for better rates</li>
                <li>Monitor your usage in the dashboard</li>
              </ul>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e1e5e9; margin: 30px 0;">
            
            <p style="font-size: 14px; color: #6c757d;">
              <strong>Need help?</strong> Reply to this email or contact our support team.<br>
              This is an automated notification from your Juno communications platform.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
PHONE NUMBER SUSPENDED - Insufficient Credits

Your phone number ${phoneNumber} has been suspended due to insufficient credits.

Account Details:
- Organization: ${tenantName || 'Your Organization'}
- Phone Number: ${phoneNumber}
- Current Balance: ${currentBalance} credits
- Required: ${requiredCredits} credits
- Shortfall: ${shortfall} credits

Your phone number will not process calls or SMS until credits are added.
We'll automatically retry billing in 7 days.

Add credits now: ${process.env.NEXT_PUBLIC_APP_URL}/settings/credits

This is an automated notification from your Juno communications platform.
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    console.log('Low balance notification sent:', data);
    return NextResponse.json({ 
      success: true, 
      messageId: data?.id,
      recipient: email 
    });

  } catch (error) {
    console.error('Error sending low balance notification:', error);
    return NextResponse.json({ 
      error: 'Failed to send notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 