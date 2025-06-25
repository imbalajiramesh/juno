import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

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
      currentBalance, 
      threshold,
      upcomingCosts
    } = await request.json();

    if (!email || currentBalance === undefined || !threshold) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
      to: [email],
      subject: `⚠️ Low Balance Alert - ${currentBalance} Credits Remaining`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Low Balance Alert</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Balance Alert</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your credits are running low</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e1e5e9;">
            <h2 style="color: #e55a4e; margin-top: 0;">Balance Warning</h2>
            
            <p>Hello,</p>
            
            <p>Your credit balance has dropped below your alert threshold. To avoid service interruptions, please consider adding credits soon.</p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #856404;">Account Status:</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li><strong>Organization:</strong> ${tenantName || 'Your Organization'}</li>
                <li><strong>Current Balance:</strong> ${currentBalance} credits</li>
                <li><strong>Alert Threshold:</strong> ${threshold} credits</li>
                ${upcomingCosts ? `<li><strong>Upcoming Phone Charges:</strong> ${upcomingCosts} credits</li>` : ''}
              </ul>
            </div>
            
            <h3 style="color: #2d3748;">Service Impact:</h3>
            <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 15px 0;">
              <ul style="margin: 0; color: #6c757d;">
                <li>📞 <strong>Voice calls:</strong> May be declined if balance is too low</li>
                <li>📱 <strong>SMS messages:</strong> Sending may be disabled</li>
                <li>📧 <strong>Email delivery:</strong> Messages may be queued</li>
                <li>📞 <strong>Phone numbers:</strong> Risk of suspension if monthly billing fails</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/credits" 
                 style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); 
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
            
            <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #0c5460;">💡 Recommended Actions:</h4>
              <ul style="margin: 10px 0; color: #0c5460;">
                <li>Purchase credits to maintain service continuity</li>
                <li>Consider larger credit packages for better rates</li>
                <li>Adjust your low-balance threshold in settings</li>
                <li>Monitor usage patterns in your dashboard</li>
              </ul>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e1e5e9; margin: 30px 0;">
            
            <p style="font-size: 14px; color: #6c757d;">
              <strong>Manage Notifications:</strong> You can adjust your alert threshold and notification preferences in your account settings.<br>
              This is an automated notification from your Juno communications platform.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
LOW BALANCE ALERT

Your credit balance has dropped below your alert threshold.

Account Status:
- Organization: ${tenantName || 'Your Organization'}
- Current Balance: ${currentBalance} credits
- Alert Threshold: ${threshold} credits
${upcomingCosts ? `- Upcoming Phone Charges: ${upcomingCosts} credits` : ''}

Service Impact:
- Voice calls may be declined if balance is too low
- SMS sending may be disabled
- Email delivery may be queued
- Phone numbers risk suspension if monthly billing fails

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