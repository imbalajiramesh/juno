import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendPasswordResetEmailProps {
  email: string;
  resetLink: string;
  firstName?: string;
}

interface SendFarewellEmailProps {
  email: string;
  firstName?: string;
  organizationName: string;
  userName: string;
}

export async function sendFarewellEmail({
  email,
  firstName = 'there',
  organizationName,
  userName
}: SendFarewellEmailProps) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Juno <noreply@yourdomain.com>',
      to: [email],
      subject: 'Sorry to see you go - Your Juno organization has been deleted',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Organization Deleted</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                text-align: center;
                padding: 20px 0;
                border-bottom: 1px solid #eee;
              }
              .logo {
                font-size: 24px;
                font-weight: bold;
                color: #000;
              }
              .content {
                padding: 30px 0;
              }
              .button {
                display: inline-block;
                padding: 12px 24px;
                background-color: #000;
                color: #fff;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 500;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                padding: 20px 0;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
              }
              .important {
                background-color: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 6px;
                padding: 16px;
                margin: 20px 0;
                color: #92400e;
              }
              .contact {
                background-color: #f0f9ff;
                border: 1px solid #38bdf8;
                border-radius: 6px;
                padding: 16px;
                margin: 20px 0;
                color: #0c4a6e;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">Juno</div>
            </div>
            
            <div class="content">
              <h1>We're sorry to see you go</h1>
              <p>Hi ${firstName},</p>
              <p>Your organization "<strong>${organizationName}</strong>" has been successfully deleted from Juno. We understand that sometimes business needs change, and we respect your decision.</p>
              
              <div class="important">
                <h3 style="margin-top: 0;">⚠️ Important: Credits Expiration</h3>
                <p style="margin-bottom: 0;">Please note that all credits associated with your deleted organization have expired and are no longer available. Credits are tied to specific organizations and cannot be transferred.</p>
              </div>

              <p>All your data including:</p>
              <ul>
                <li>Customer records and interactions</li>
                <li>Call logs and communication history</li>
                <li>Team members and settings</li>
                <li>Voice agents and phone numbers</li>
                <li>External integrations</li>
              </ul>
              <p>has been permanently removed from our systems.</p>

              <div class="contact">
                <h3 style="margin-top: 0;">📧 We'd love your feedback</h3>
                <p>Your experience matters to us. If you have a moment, we'd appreciate hearing about your experience with Juno and what led to this decision.</p>
                <p style="margin-bottom: 0;">Please feel free to reach out to us at: <strong>contact@laxmint.com</strong></p>
              </div>

              <p>If you ever decide to give Juno another try, you can always create a new organization by signing back in. Your account remains active.</p>
              
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">Return to Juno</a>
              
              <p>Thank you for being part of the Juno community.</p>
            </div>
            
            <div class="footer">
              <p>Best regards,<br/>The Juno Team</p>
              <p>&copy; ${new Date().getFullYear()} Juno. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      text: `
        Hi ${firstName},

        Your organization "${organizationName}" has been successfully deleted from Juno. We understand that sometimes business needs change, and we respect your decision.

        IMPORTANT: Credits Expiration
        Please note that all credits associated with your deleted organization have expired and are no longer available. Credits are tied to specific organizations and cannot be transferred.

        All your data including customer records, communication history, team members, voice agents, and integrations has been permanently removed from our systems.

        We'd love your feedback
        Your experience matters to us. If you have a moment, we'd appreciate hearing about your experience with Juno and what led to this decision.

        Please feel free to reach out to us at: contact@laxmint.com

        If you ever decide to give Juno another try, you can always create a new organization by signing back in. Your account remains active.

        Return to Juno: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard

        Thank you for being part of the Juno community.

        Best regards,
        The Juno Team

        © ${new Date().getFullYear()} Juno. All rights reserved.
      `
    });

    if (error) {
      console.error('Error sending farewell email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending farewell email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

export async function sendPasswordResetEmail({
  email,
  resetLink,
  firstName = 'there'
}: SendPasswordResetEmailProps) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Juno <noreply@yourdomain.com>',
      to: [email],
      subject: 'Reset your Juno password',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset your password</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                text-align: center;
                padding: 20px 0;
                border-bottom: 1px solid #eee;
              }
              .logo {
                font-size: 24px;
                font-weight: bold;
                color: #000;
              }
              .content {
                padding: 30px 0;
              }
              .button {
                display: inline-block;
                padding: 12px 24px;
                background-color: #000;
                color: #fff;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 500;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                padding: 20px 0;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
              }
              .warning {
                background-color: #fef2f2;
                border: 1px solid #fecaca;
                border-radius: 6px;
                padding: 16px;
                margin: 20px 0;
                color: #991b1b;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">Juno</div>
            </div>
            
            <div class="content">
              <h1>Reset your password</h1>
              <p>Hi ${firstName},</p>
              <p>We received a request to reset your password for your Juno account. Click the button below to create a new password:</p>
              
              <a href="${resetLink}" class="button">Reset Password</a>
              
              <p>This link will expire in 24 hours for security reasons.</p>
              
              <div class="warning">
                <strong>Important:</strong> If you didn't request this password reset, please ignore this email. Your account remains secure.
              </div>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${resetLink}</p>
            </div>
            
            <div class="footer">
              <p>This email was sent by Juno. If you have questions, please contact our support team.</p>
              <p>&copy; ${new Date().getFullYear()} Juno. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      text: `
        Hi ${firstName},

        We received a request to reset your password for your Juno account.

        Click this link to create a new password: ${resetLink}

        This link will expire in 24 hours for security reasons.

        If you didn't request this password reset, please ignore this email. Your account remains secure.

        © ${new Date().getFullYear()} Juno. All rights reserved.
      `
    });

    if (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: 'Failed to send email' };
  }
} 