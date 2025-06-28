import { createClient } from '@/utils/supabase/server';

export interface EmailTemplate {
  id: string;
  template_key: string;
  subject: string;
  html_content: string;
  text_content?: string;
  variables: Record<string, any>;
  is_active: boolean;
}

export interface EmailVariables {
  [key: string]: string | number | boolean;
}

// Email template keys
export const EMAIL_TEMPLATES = {
  ORGANIZATION_WELCOME: 'organization_welcome',
  ORGANIZATION_APPROVED: 'organization_approved',
  ORGANIZATION_REJECTED: 'organization_rejected',
  ORGANIZATION_ADDITIONAL_INFO: 'organization_additional_info',
  SUPER_ADMIN_NEW_ORGANIZATION: 'super_admin_new_organization',
  DOCUMENT_UPLOADED: 'document_uploaded',
  DOCUMENT_APPROVED: 'document_approved',
  DOCUMENT_REJECTED: 'document_rejected'
} as const;

/**
 * Replaces template variables in content with actual values
 */
export function replaceTemplateVariables(content: string, variables: EmailVariables): string {
  let result = content;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value));
  });
  
  return result;
}

/**
 * Gets an email template by key
 */
export async function getEmailTemplate(templateKey: string): Promise<EmailTemplate | null> {
  try {
    // TODO: Implement after migration
    // const supabase = await createClient();
    // const { data, error } = await supabase.from('email_templates')...
    
    // For now, return from defaults
    const template = DEFAULT_EMAIL_TEMPLATES[templateKey as keyof typeof DEFAULT_EMAIL_TEMPLATES];
    if (!template) return null;
    
    return {
      id: templateKey,
      template_key: templateKey,
      subject: template.subject,
      html_content: template.html,
      text_content: template.text,
      variables: {},
      is_active: true
    };
  } catch (error) {
    console.error('Error in getEmailTemplate:', error);
    return null;
  }
}

/**
 * Prepares email content with variables replaced
 */
export async function prepareEmail(
  templateKey: string,
  variables: EmailVariables
): Promise<{
  subject: string;
  html: string;
  text?: string;
} | null> {
  const template = await getEmailTemplate(templateKey);
  
  if (!template) {
    console.error(`Email template not found: ${templateKey}`);
    return null;
  }
  
  return {
    subject: replaceTemplateVariables(template.subject, variables),
    html: replaceTemplateVariables(template.html_content, variables),
    text: template.text_content ? replaceTemplateVariables(template.text_content, variables) : undefined
  };
}

/**
 * Queues an email for sending
 */
export async function queueEmail(
  recipientEmail: string,
  templateKey: string,
  variables: EmailVariables,
  scheduledFor?: Date
): Promise<boolean> {
  try {
    // TODO: Implement after migration
    console.log(`Queuing email: ${templateKey} to ${recipientEmail}`, variables);
    return true;
  } catch (error) {
    console.error('Error in queueEmail:', error);
    return false;
  }
}

/**
 * Sends welcome email to new organization
 */
export async function sendWelcomeEmail(
  recipientEmail: string,
  organizationName: string
): Promise<boolean> {
  return await queueEmail(recipientEmail, EMAIL_TEMPLATES.ORGANIZATION_WELCOME, {
    organization_name: organizationName,
    support_email: 'support@juno-crm.com'
  });
}

/**
 * Sends organization approval email
 */
export async function sendApprovalEmail(
  recipientEmail: string,
  organizationName: string
): Promise<boolean> {
  return await queueEmail(recipientEmail, EMAIL_TEMPLATES.ORGANIZATION_APPROVED, {
    organization_name: organizationName,
    login_url: process.env.NEXT_PUBLIC_APP_URL + '/dashboard'
  });
}

/**
 * Sends organization rejection email
 */
export async function sendRejectionEmail(
  recipientEmail: string,
  organizationName: string,
  reason: string
): Promise<boolean> {
  return await queueEmail(recipientEmail, EMAIL_TEMPLATES.ORGANIZATION_REJECTED, {
    organization_name: organizationName,
    reason: reason,
    support_email: 'support@juno-crm.com'
  });
}

/**
 * Sends additional information request email
 */
export async function sendAdditionalInfoEmail(
  recipientEmail: string,
  organizationName: string,
  additionalInfo: string
): Promise<boolean> {
  return await queueEmail(recipientEmail, EMAIL_TEMPLATES.ORGANIZATION_ADDITIONAL_INFO, {
    organization_name: organizationName,
    additional_info: additionalInfo,
    documents_url: process.env.NEXT_PUBLIC_APP_URL + '/settings/documents'
  });
}

/**
 * Sends notification to super admins about new organization
 */
export async function notifySuperAdminsNewOrg(
  organizationName: string,
  adminEmail: string,
  businessUseCase?: string
): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // Get all super admins
    const { data: superAdmins, error } = await supabase
      .from('user_accounts')
      .select('email')
      .eq('role.role_name', 'super_admin');
    
    if (error || !superAdmins) {
      console.error('Error fetching super admins:', error);
      return false;
    }
    
    // Send notification to each super admin
    const promises = superAdmins.map(admin =>
      queueEmail(admin.email, EMAIL_TEMPLATES.SUPER_ADMIN_NEW_ORGANIZATION, {
        organization_name: organizationName,
        admin_email: adminEmail,
        business_use_case: businessUseCase || 'Not provided',
        review_url: process.env.NEXT_PUBLIC_APP_URL + '/super-admin'
      })
    );
    
    const results = await Promise.all(promises);
    return results.every(result => result === true);
  } catch (error) {
    console.error('Error in notifySuperAdminsNewOrg:', error);
    return false;
  }
}

/**
 * Default email templates configuration
 */
export const DEFAULT_EMAIL_TEMPLATES = {
  [EMAIL_TEMPLATES.ORGANIZATION_WELCOME]: {
    subject: 'Welcome to Juno CRM - Your Application is Under Review',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Welcome to Juno CRM!</h1>
        <p>Thank you for choosing Juno CRM for your business needs. Your organization "{{organization_name}}" has been successfully registered and is now under review.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Next Steps:</h3>
          <ol style="color: #4b5563;">
            <li>Upload all required business documents</li>
            <li>Complete your compliance information</li>
            <li>Wait for approval (typically 1-3 business days)</li>
          </ol>
        </div>
        
        <p>Our team will review your application and notify you once your organization has been approved. You'll then have access to all Juno CRM features including:</p>
        
        <ul style="color: #4b5563;">
          <li>Voice calling with Vapi integration</li>
          <li>SMS messaging with Twilio</li>
          <li>Custom email domains with Resend</li>
          <li>Full CRM functionality</li>
        </ul>
        
        <p>If you have any questions, please don't hesitate to contact our support team at {{support_email}}.</p>
        
        <p>Best regards,<br>The Juno CRM Team</p>
      </div>
    `,
    text: `Welcome to Juno CRM!

Thank you for choosing Juno CRM. Your organization "{{organization_name}}" is now under review.

Next Steps:
1. Upload all required business documents
2. Complete your compliance information  
3. Wait for approval (typically 1-3 business days)

Contact us at {{support_email}} if you have questions.

Best regards,
The Juno CRM Team`
  },

  [EMAIL_TEMPLATES.ORGANIZATION_APPROVED]: {
    subject: '🎉 Your Organization has been Approved - Welcome to Juno CRM!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #059669;">🎉 Congratulations! Your Organization is Approved!</h1>
        <p>Great news! Your organization "{{organization_name}}" has been approved and is now ready to use Juno CRM.</p>
        
        <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
          <h3 style="margin-top: 0; color: #065f46;">You now have access to:</h3>
          <ul style="color: #047857;">
            <li>✅ Voice calling (Vapi integration)</li>
            <li>✅ SMS messaging (Twilio integration)</li>
            <li>✅ Custom email domains (Resend integration)</li>
            <li>✅ Full CRM functionality</li>
            <li>✅ Team management</li>
            <li>✅ Customer management</li>
            <li>✅ Analytics and reporting</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{login_url}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Access Your Dashboard
          </a>
        </div>
        
        <p>Start exploring your new CRM system and take your business to the next level!</p>
        
        <p>Best regards,<br>The Juno CRM Team</p>
      </div>
    `,
    text: `🎉 Congratulations! Your Organization is Approved!

Your organization "{{organization_name}}" has been approved for Juno CRM.

You now have access to:
- Voice calling (Vapi integration)
- SMS messaging (Twilio integration)  
- Custom email domains (Resend integration)
- Full CRM functionality

Access your dashboard: {{login_url}}

Best regards,
The Juno CRM Team`
  },

  [EMAIL_TEMPLATES.ORGANIZATION_REJECTED]: {
    subject: 'Update on Your Juno CRM Application',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">Application Update</h1>
        <p>Thank you for your interest in Juno CRM. Unfortunately, we cannot approve your organization "{{organization_name}}" at this time.</p>
        
        <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h3 style="margin-top: 0; color: #991b1b;">Reason for Rejection:</h3>
          <p style="color: #7f1d1d; margin-bottom: 0;">{{reason}}</p>
        </div>
        
        <p>If you believe this decision was made in error or if you have additional information that might help with your application, please contact our support team at {{support_email}}.</p>
        
        <p>You may also reapply in the future once any issues have been resolved.</p>
        
        <p>Thank you for your understanding.</p>
        
        <p>Best regards,<br>The Juno CRM Team</p>
      </div>
    `,
    text: `Application Update

Thank you for your interest in Juno CRM. We cannot approve your organization "{{organization_name}}" at this time.

Reason: {{reason}}

Contact our support team at {{support_email}} if you have questions or additional information.

Best regards,
The Juno CRM Team`
  },

  [EMAIL_TEMPLATES.ORGANIZATION_ADDITIONAL_INFO]: {
    subject: 'Additional Information Required - Juno CRM Application',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #d97706;">Additional Information Required</h1>
        <p>Thank you for your application to Juno CRM. We need some additional information to complete the approval process for your organization "{{organization_name}}".</p>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d97706;">
          <h3 style="margin-top: 0; color: #92400e;">Please provide the following:</h3>
          <p style="color: #78350f; margin-bottom: 0;">{{additional_info}}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{documents_url}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Upload Documents
          </a>
        </div>
        
        <p>Once you've uploaded the requested information, our team will continue with the review process. This typically takes 1-3 business days.</p>
        
        <p>If you have any questions about the required information, please don't hesitate to contact our support team.</p>
        
        <p>Best regards,<br>The Juno CRM Team</p>
      </div>
    `,
    text: `Additional Information Required

We need additional information for your organization "{{organization_name}}":

{{additional_info}}

Please upload the requested documents: {{documents_url}}

Best regards,
The Juno CRM Team`
  },

  [EMAIL_TEMPLATES.SUPER_ADMIN_NEW_ORGANIZATION]: {
    subject: '[ADMIN] New Organization Pending Approval - {{organization_name}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">[SUPER ADMIN] New Organization Pending</h1>
        <p>A new organization requires your review and approval.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Organization Details:</h3>
          <ul style="color: #4b5563;">
            <li><strong>Organization:</strong> {{organization_name}}</li>
            <li><strong>Admin Email:</strong> {{admin_email}}</li>
            <li><strong>Business Use Case:</strong> {{business_use_case}}</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{review_url}}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Review Application
          </a>
        </div>
        
        <p>Please review the application and take appropriate action (approve, reject, or request additional information).</p>
        
        <p>Super Admin Dashboard: <a href="{{review_url}}">{{review_url}}</a></p>
      </div>
    `,
    text: `[SUPER ADMIN] New Organization Pending Approval

Organization: {{organization_name}}
Admin Email: {{admin_email}}
Business Use Case: {{business_use_case}}

Review at: {{review_url}}

Please review and take appropriate action.`
  }
};

/**
 * Creates or updates default email templates in the database
 */
export async function initializeEmailTemplates(): Promise<boolean> {
  try {
    // TODO: Implement after migration
    console.log('Email templates would be initialized here');
    return true;
  } catch (error) {
    console.error('Error initializing email templates:', error);
    return false;
  }
} 