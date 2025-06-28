-- Organization Approval System Migration
-- This script implements the complete database foundation for the new organization approval system

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create super_admin role
INSERT INTO roles (role_name, description) VALUES 
('super_admin', 'Super administrator with cross-tenant access for approvals')
ON CONFLICT (role_name) DO NOTHING;

-- Add new columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS additional_info_requested TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES user_accounts(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_registration_number TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_use_case TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS messaging_volume_monthly INTEGER;

-- Add new columns to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES user_accounts(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS assignment_date TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_duplicate_candidate BOOLEAN DEFAULT false;

-- Create organization_documents table
CREATE TABLE IF NOT EXISTS organization_documents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN (
        'business_registration', 
        'tax_id', 
        'address_proof', 
        'business_license',
        'partnership_agreement',
        'utility_bill',
        'lease_agreement',
        'duns_number',
        'website_verification',
        'privacy_policy',
        'terms_of_service',
        'message_templates',
        'opt_in_flow',
        'other'
    )),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    uploaded_by UUID REFERENCES user_accounts(id),
    upload_date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create organization_approval_history table
CREATE TABLE IF NOT EXISTS organization_approval_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES user_accounts(id),
    reason TEXT,
    additional_info_requested TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create customer_duplicates table
CREATE TABLE IF NOT EXISTS customer_duplicates (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    customer_1_id TEXT NOT NULL REFERENCES customers(id),
    customer_2_id TEXT NOT NULL REFERENCES customers(id),
    similarity_score DECIMAL(3,2) CHECK (similarity_score >= 0.00 AND similarity_score <= 1.00),
    detection_type TEXT NOT NULL CHECK (detection_type IN ('email', 'phone', 'name_address', 'company')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'merged', 'dismissed')),
    reviewed_by UUID REFERENCES user_accounts(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_1_id, customer_2_id)
);

-- Create customer_assignment_history table for tracking assignments
CREATE TABLE IF NOT EXISTS customer_assignment_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    assigned_from UUID REFERENCES user_accounts(id),
    assigned_to UUID REFERENCES user_accounts(id),
    assigned_by UUID NOT NULL REFERENCES user_accounts(id),
    assignment_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create email_templates table for managing email templates
CREATE TABLE IF NOT EXISTS email_templates (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    template_key TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    variables JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create super_admin_audit_log table for audit logging
CREATE TABLE IF NOT EXISTS super_admin_audit_log (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    super_admin_id UUID NOT NULL REFERENCES user_accounts(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notification_queue table for email processing
CREATE TABLE IF NOT EXISTS notification_queue (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    recipient_email TEXT NOT NULL,
    template_key TEXT NOT NULL,
    variables JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_approval_status ON tenants(approval_status);
CREATE INDEX IF NOT EXISTS idx_organization_documents_tenant_id ON organization_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_organization_documents_status ON organization_documents(status);
CREATE INDEX IF NOT EXISTS idx_customer_duplicates_tenant_id ON customer_duplicates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_duplicates_status ON customer_duplicates(status);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_to ON customers(assigned_to);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_assigned ON customers(tenant_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_super_admin_audit_log_admin_id ON super_admin_audit_log(super_admin_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for);

-- Add RLS policies

-- Enable RLS on new tables
ALTER TABLE organization_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_duplicates ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Fix the existing get_user_tenant_id function to return TEXT (not UUID)
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT ua.tenant_id
        FROM user_accounts ua
        WHERE ua.auth_id = auth.uid()::TEXT
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies for organization_documents
CREATE POLICY "Users can view their own org documents" ON organization_documents
    FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert their own org documents" ON organization_documents
    FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update their own org documents" ON organization_documents
    FOR UPDATE USING (tenant_id = get_user_tenant_id());

-- Super admin policy for organization_documents
CREATE POLICY "Super admins can view all org documents" ON organization_documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_accounts ua
            JOIN roles r ON ua.role_id = r.id
            WHERE ua.auth_id = auth.uid()::TEXT
            AND r.role_name = 'super_admin'
        )
    );

-- RLS policies for organization_approval_history
CREATE POLICY "Users can view their org approval history" ON organization_approval_history
    FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Super admins can manage approval history" ON organization_approval_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_accounts ua
            JOIN roles r ON ua.role_id = r.id
            WHERE ua.auth_id = auth.uid()::TEXT
            AND r.role_name = 'super_admin'
        )
    );

-- RLS policies for customer_duplicates
CREATE POLICY "Users can view duplicates in their tenant" ON customer_duplicates
    FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage duplicates" ON customer_duplicates
    FOR ALL USING (
        tenant_id = get_user_tenant_id() AND
        EXISTS (
            SELECT 1 FROM user_accounts ua
            JOIN roles r ON ua.role_id = r.id
            WHERE ua.auth_id = auth.uid()::TEXT
            AND ua.tenant_id = get_user_tenant_id()
            AND r.role_name IN ('admin', 'manager')
        )
    );

-- RLS policies for customer assignment history
CREATE POLICY "Users can view assignment history in their tenant" ON customer_assignment_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM customers c
            WHERE c.id = customer_assignment_history.customer_id
            AND c.tenant_id = get_user_tenant_id()
        )
    );

-- RLS policies for email templates (super admin only)
CREATE POLICY "Super admins can manage email templates" ON email_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_accounts ua
            JOIN roles r ON ua.role_id = r.id
            WHERE ua.auth_id = auth.uid()::TEXT
            AND r.role_name = 'super_admin'
        )
    );

-- RLS policy for super admin audit log
CREATE POLICY "Super admins can view audit logs" ON super_admin_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_accounts ua
            JOIN roles r ON ua.role_id = r.id
            WHERE ua.auth_id = auth.uid()::TEXT
            AND r.role_name = 'super_admin'
        )
    );

-- RLS policy for notification queue (system only)
CREATE POLICY "System can manage notification queue" ON notification_queue
    FOR ALL USING (true);

-- Create trigger functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_organization_documents_updated_at 
    BEFORE UPDATE ON organization_documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_duplicates_updated_at 
    BEFORE UPDATE ON customer_duplicates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON email_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_accounts ua
        JOIN roles r ON ua.role_id = r.id
        WHERE ua.auth_id = auth.uid()::TEXT
        AND r.role_name = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log super admin actions
CREATE OR REPLACE FUNCTION log_super_admin_action(
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
DECLARE
    admin_id UUID;
BEGIN
    -- Get the super admin's user account id
    SELECT ua.id INTO admin_id
    FROM user_accounts ua
    JOIN roles r ON ua.role_id = r.id
    WHERE ua.auth_id = auth.uid()::TEXT
    AND r.role_name = 'super_admin';
    
    IF admin_id IS NOT NULL THEN
        INSERT INTO super_admin_audit_log (
            super_admin_id,
            action,
            resource_type,
            resource_id,
            details
        ) VALUES (
            admin_id,
            p_action,
            p_resource_type,
            p_resource_id,
            p_details
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update organization approval status
CREATE OR REPLACE FUNCTION update_organization_approval_status(
    p_tenant_id TEXT,
    p_new_status TEXT,
    p_reason TEXT DEFAULT NULL,
    p_additional_info TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    old_status TEXT;
    admin_id UUID;
BEGIN
    -- Check if user is super admin
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Only super admins can update approval status';
    END IF;
    
    -- Get current status
    SELECT approval_status INTO old_status
    FROM tenants WHERE id = p_tenant_id;
    
    -- Get super admin id
    SELECT ua.id INTO admin_id
    FROM user_accounts ua
    JOIN roles r ON ua.role_id = r.id
    WHERE ua.auth_id = auth.uid()::TEXT
    AND r.role_name = 'super_admin';
    
    -- Update tenant status
    UPDATE tenants SET
        approval_status = p_new_status,
        rejection_reason = CASE WHEN p_new_status = 'rejected' THEN p_reason ELSE NULL END,
        additional_info_requested = CASE WHEN p_new_status = 'requires_more_info' THEN p_additional_info ELSE NULL END,
        approved_by = CASE WHEN p_new_status = 'approved' THEN admin_id ELSE NULL END,
        approved_at = CASE WHEN p_new_status = 'approved' THEN NOW() ELSE NULL END
    WHERE id = p_tenant_id;
    
    -- Insert into approval history
    INSERT INTO organization_approval_history (
        tenant_id,
        previous_status,
        new_status,
        changed_by,
        reason,
        additional_info_requested
    ) VALUES (
        p_tenant_id,
        old_status,
        p_new_status,
        admin_id,
        p_reason,
        p_additional_info
    );
    
    -- Log the action
    PERFORM log_super_admin_action(
        'UPDATE_APPROVAL_STATUS',
        'organization',
        p_tenant_id,
        jsonb_build_object(
            'old_status', old_status,
            'new_status', p_new_status,
            'reason', p_reason,
            'additional_info', p_additional_info
        )
    );
    
    -- Add to notification queue
    INSERT INTO notification_queue (
        recipient_email,
        template_key,
        variables
    )
    SELECT 
        ua.email,
        CASE p_new_status
            WHEN 'approved' THEN 'organization_approved'
            WHEN 'rejected' THEN 'organization_rejected'
            WHEN 'requires_more_info' THEN 'organization_additional_info'
            ELSE 'organization_status_updated'
        END,
        jsonb_build_object(
            'organization_name', t.name,
            'status', p_new_status,
            'reason', p_reason,
            'additional_info', p_additional_info
        )
    FROM tenants t
    JOIN user_accounts ua ON ua.tenant_id = t.id
    JOIN roles r ON ua.role_id = r.id
    WHERE t.id = p_tenant_id
    AND r.role_name = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default email templates
INSERT INTO email_templates (template_key, subject, html_content, text_content) VALUES
('organization_welcome', 'Welcome to Juno CRM', 
'<h1>Welcome to Juno CRM</h1>
<p>Thank you for signing up! Your organization registration is now under review.</p>
<p><strong>Next steps:</strong></p>
<ul>
    <li>Upload required business documents</li>
    <li>Complete compliance information</li>
    <li>Wait for approval (typically 1-3 business days)</li>
</ul>
<p>We''ll notify you once your organization has been reviewed.</p>',
'Welcome to Juno CRM\n\nThank you for signing up! Your organization registration is now under review.\n\nNext steps:\n- Upload required business documents\n- Complete compliance information\n- Wait for approval (typically 1-3 business days)\n\nWe''ll notify you once your organization has been reviewed.'),

('organization_approved', 'Organization Approved - Welcome to Juno CRM!', 
'<h1>Organization Approved!</h1>
<p>Congratulations! Your organization "{{organization_name}}" has been approved.</p>
<p><strong>You now have access to:</strong></p>
<ul>
    <li>Voice calling (Vapi integration)</li>
    <li>SMS messaging (Twilio integration)</li>
    <li>Custom email domains (Resend integration)</li>
    <li>Full CRM functionality</li>
</ul>
<p>Start exploring your new CRM system!</p>',
'Organization Approved!\n\nCongratulations! Your organization "{{organization_name}}" has been approved.\n\nYou now have access to:\n- Voice calling (Vapi integration)\n- SMS messaging (Twilio integration)\n- Custom email domains (Resend integration)\n- Full CRM functionality\n\nStart exploring your new CRM system!'),

('organization_rejected', 'Organization Application Update', 
'<h1>Organization Application Update</h1>
<p>Thank you for your interest in Juno CRM. Unfortunately, we cannot approve your organization "{{organization_name}}" at this time.</p>
<p><strong>Reason:</strong> {{reason}}</p>
<p>If you have questions or would like to reapply, please contact our support team.</p>',
'Organization Application Update\n\nThank you for your interest in Juno CRM. Unfortunately, we cannot approve your organization "{{organization_name}}" at this time.\n\nReason: {{reason}}\n\nIf you have questions or would like to reapply, please contact our support team.'),

('organization_additional_info', 'Additional Information Required', 
'<h1>Additional Information Required</h1>
<p>Thank you for your application to Juno CRM. We need some additional information to complete your organization approval.</p>
<p><strong>Please provide:</strong></p>
<p>{{additional_info}}</p>
<p>Please log into your account and upload the requested documents.</p>',
'Additional Information Required\n\nThank you for your application to Juno CRM. We need some additional information to complete your organization approval.\n\nPlease provide: {{additional_info}}\n\nPlease log into your account and upload the requested documents.'),

('super_admin_new_organization', '[ADMIN] New Organization Pending Approval', 
'<h1>New Organization Pending Approval</h1>
<p>A new organization requires your review:</p>
<p><strong>Organization:</strong> {{organization_name}}</p>
<p><strong>Admin Email:</strong> {{admin_email}}</p>
<p><strong>Business Use Case:</strong> {{business_use_case}}</p>
<p>Please review and approve or request additional information.</p>',
'New Organization Pending Approval\n\nA new organization requires your review:\n\nOrganization: {{organization_name}}\nAdmin Email: {{admin_email}}\nBusiness Use Case: {{business_use_case}}\n\nPlease review and approve or request additional information.')

ON CONFLICT (template_key) DO UPDATE SET
    subject = EXCLUDED.subject,
    html_content = EXCLUDED.html_content,
    text_content = EXCLUDED.text_content,
    updated_at = NOW();

-- Update existing tenants to have approval status
-- Fix: existing rows get 'pending' from DEFAULT, not NULL
UPDATE tenants SET 
    approval_status = 'approved',
    approved_at = created_at
WHERE approval_status = 'pending';

-- Create a view for super admin dashboard statistics
CREATE OR REPLACE VIEW super_admin_stats AS
SELECT 
    COUNT(*) FILTER (WHERE approval_status = 'pending') as pending_approvals,
    COUNT(*) FILTER (WHERE approval_status = 'requires_more_info') as info_required,
    COUNT(*) FILTER (WHERE approval_status = 'approved') as approved_orgs,
    COUNT(*) FILTER (WHERE approval_status = 'rejected') as rejected_orgs,
    COUNT(*) as total_organizations,
    AVG(EXTRACT(DAYS FROM (approved_at - created_at))) FILTER (WHERE approved_at IS NOT NULL) as avg_approval_days
FROM tenants;

-- Grant permissions to authenticated users
GRANT SELECT ON super_admin_stats TO authenticated;

COMMIT; 