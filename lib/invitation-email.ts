import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface InvitationEmailData {
  email: string;
  organizationName: string;
  inviterName: string;
  inviterEmail: string;
  role: string;
  invitationUrl: string;
}

interface WelcomeEmailData {
  email: string;
  firstName: string;
  organizationName: string;
  role: string;
  dashboardUrl: string;
}

export async function sendInvitationEmail({
  email,
  organizationName,
  inviterName,
  inviterEmail,
  role,
  invitationUrl,
}: InvitationEmailData): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await resend.emails.send({
      from: `${inviterName} <${process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com'}>`,
      to: [email],
      subject: `You're invited to join ${organizationName} on Juno`,
      html: getInvitationEmailTemplate({
        email,
        organizationName,
        inviterName,
        inviterEmail,
        role,
        invitationUrl,
      }),
    });

    if (error) {
      console.error('Failed to send invitation email:', error);
      return { success: false, error: error.message };
    }

    console.log('Invitation email sent successfully:', data);
    return { success: true };
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function sendWelcomeEmail({
  email,
  firstName,
  organizationName,
  role,
  dashboardUrl,
}: WelcomeEmailData): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await resend.emails.send({
      from: `Juno Team <${process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com'}>`,
      to: [email],
      subject: `Welcome to ${organizationName} on Juno!`,
      html: getWelcomeEmailTemplate({
        email,
        firstName,
        organizationName,
        role,
        dashboardUrl,
      }),
    });

    if (error) {
      console.error('Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }

    console.log('Welcome email sent successfully:', data);
    return { success: true };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

function getInvitationEmailTemplate({
  organizationName,
  inviterName,
  inviterEmail,
  role,
  invitationUrl,
}: InvitationEmailData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You're invited to join ${organizationName}</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <img src="https://yourdomain.com/logo.png" alt="Juno" style="height: 60px; margin-bottom: 20px;" />
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">You're Invited!</h1>
      </div>
      
      <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #333; margin-top: 0; font-size: 24px;">Join ${organizationName} on Juno</h2>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          ${inviterName} (${inviterEmail}) has invited you to join their team on Juno as a <strong>${role}</strong>.
        </p>
        
        <p style="font-size: 16px; margin-bottom: 30px;">
          Juno is a comprehensive customer relationship and communication platform that helps teams manage customers, make calls, send emails, and grow their business.
        </p>
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="${invitationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            Accept Invitation
          </a>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 30px 0;">
          <h3 style="margin-top: 0; color: #495057; font-size: 18px;">What you'll get access to:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #6c757d;">
            <li>Customer management and tracking</li>
            <li>AI-powered voice calling</li>
            <li>Email and SMS communication</li>
            <li>Team collaboration tools</li>
            <li>Analytics and reporting</li>
          </ul>
        </div>
        
        <p style="font-size: 14px; color: #6c757d; margin-bottom: 10px;">
          This invitation will expire in 7 days. If you don't want to receive these emails, you can safely ignore this message.
        </p>
        
        <p style="font-size: 14px; color: #6c757d;">
          If the button doesn't work, copy and paste this link into your browser: <br>
          <a href="${invitationUrl}" style="color: #667eea; word-break: break-all;">${invitationUrl}</a>
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #6c757d; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Juno. All rights reserved.</p>
        <p>This email was sent to you because you were invited to join ${organizationName}.</p>
      </div>
    </body>
    </html>
  `;
}

function getWelcomeEmailTemplate({
  firstName,
  organizationName,
  role,
  dashboardUrl,
}: WelcomeEmailData): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to ${organizationName}!</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <img src="https://yourdomain.com/logo.png" alt="Juno" style="height: 60px; margin-bottom: 20px;" />
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">Welcome to Juno!</h1>
      </div>
      
      <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #333; margin-top: 0; font-size: 24px;">Hi ${firstName}! 👋</h2>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          Welcome to <strong>${organizationName}</strong>! We're excited to have you on board as a <strong>${role}</strong>.
        </p>
        
        <p style="font-size: 16px; margin-bottom: 30px;">
          Your account has been set up and you're ready to start using Juno. Here's what you can do to get started:
        </p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 30px 0;">
          <h3 style="margin-top: 0; color: #495057; font-size: 18px;">Get started checklist:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #6c757d;">
            <li>Complete your profile setup</li>
            <li>Explore the dashboard and features</li>
            <li>Connect with your team members</li>
            <li>Import or create your first customers</li>
            <li>Try making a test call or sending an email</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            Go to Dashboard
          </a>
        </div>
        
        <div style="background: #e7f3ff; padding: 20px; border-radius: 5px; margin: 30px 0; border-left: 4px solid #0066cc;">
          <h4 style="margin-top: 0; color: #0066cc;">Need help?</h4>
          <p style="margin-bottom: 0; color: #333;">
            If you have any questions or need assistance getting started, don't hesitate to reach out to your team members or check out our help documentation.
          </p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #6c757d; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Juno. All rights reserved.</p>
        <p>You're receiving this email because you just joined ${organizationName}.</p>
      </div>
    </body>
    </html>
  `;
} 