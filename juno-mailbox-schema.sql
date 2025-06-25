-- Juno Mailbox System Schema
-- This schema creates tables for managing custom email domains and mailbox configurations

-- Table for managing custom domains
CREATE TABLE IF NOT EXISTS mailbox_domains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  mx_records_configured BOOLEAN DEFAULT FALSE,
  spf_configured BOOLEAN DEFAULT FALSE,
  dkim_configured BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  resend_domain_id TEXT, -- Resend.com domain ID for email infrastructure
  dns_records JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, domain)
);

-- Table for mailbox configurations
CREATE TABLE IF NOT EXISTS mailbox_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL,
  domain TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'error', 'disabled')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  connected_at TIMESTAMP WITH TIME ZONE,
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unread_count INTEGER DEFAULT 0,
  sync_enabled BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, email_address)
);

-- Table for storing email messages (for local caching and search)
CREATE TABLE IF NOT EXISTS mailbox_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mailbox_id UUID NOT NULL REFERENCES mailbox_configs(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL, -- Provider's message ID
  thread_id TEXT,
  subject TEXT,
  sender_email TEXT,
  sender_name TEXT,
  recipient_emails TEXT[],
  cc_emails TEXT[],
  bcc_emails TEXT[],
  body_text TEXT,
  body_html TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  is_important BOOLEAN DEFAULT FALSE,
  has_attachments BOOLEAN DEFAULT FALSE,
  labels TEXT[],
  folder TEXT DEFAULT 'INBOX',
  received_at TIMESTAMP WITH TIME ZONE,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(mailbox_id, message_id)
);

-- Table for email attachments
CREATE TABLE IF NOT EXISTS mailbox_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES mailbox_messages(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  attachment_id TEXT, -- Provider's attachment ID
  download_url TEXT,
  is_inline BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for email templates
CREATE TABLE IF NOT EXISTS mailbox_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  variables JSONB DEFAULT '[]', -- List of template variables
  created_by TEXT REFERENCES user_accounts(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, name)
);

-- Table for sent emails tracking
CREATE TABLE IF NOT EXISTS mailbox_sent_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mailbox_id UUID NOT NULL REFERENCES mailbox_configs(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES customers(id),
  message_id TEXT, -- Provider's message ID after sending
  to_emails TEXT[] NOT NULL,
  cc_emails TEXT[],
  bcc_emails TEXT[],
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  template_id UUID REFERENCES mailbox_templates(id),
  template_variables JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'delivered')),
  sent_by TEXT REFERENCES user_accounts(id),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  credits_used INTEGER DEFAULT 2, -- Track credits used for this email
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_mailbox_domains_updated_at ON mailbox_domains;
CREATE TRIGGER update_mailbox_domains_updated_at
  BEFORE UPDATE ON mailbox_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mailbox_configs_updated_at ON mailbox_configs;
CREATE TRIGGER update_mailbox_configs_updated_at
  BEFORE UPDATE ON mailbox_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mailbox_templates_updated_at ON mailbox_templates;
CREATE TRIGGER update_mailbox_templates_updated_at
  BEFORE UPDATE ON mailbox_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE mailbox_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailbox_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailbox_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailbox_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailbox_sent_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies  
CREATE POLICY "Users can access their tenant's mailbox domains" ON mailbox_domains
  FOR ALL USING (tenant_id = (
    SELECT tenant_id::text 
    FROM user_accounts 
    WHERE auth_id = auth.uid()::text
    LIMIT 1
  ));

CREATE POLICY "Users can access their tenant's mailbox configs" ON mailbox_configs
  FOR ALL USING (tenant_id = (
    SELECT tenant_id::text 
    FROM user_accounts 
    WHERE auth_id = auth.uid()::text
    LIMIT 1
  ));

CREATE POLICY "Users can access their tenant's mailbox messages" ON mailbox_messages
  FOR ALL USING (tenant_id = (
    SELECT tenant_id::text 
    FROM user_accounts 
    WHERE auth_id = auth.uid()::text
    LIMIT 1
  ));

CREATE POLICY "Users can access their tenant's mailbox attachments" ON mailbox_attachments
  FOR ALL USING (tenant_id = (
    SELECT tenant_id::text 
    FROM user_accounts 
    WHERE auth_id = auth.uid()::text
    LIMIT 1
  ));

CREATE POLICY "Users can access their tenant's mailbox templates" ON mailbox_templates
  FOR ALL USING (tenant_id = (
    SELECT tenant_id::text 
    FROM user_accounts 
    WHERE auth_id = auth.uid()::text
    LIMIT 1
  ));

CREATE POLICY "Users can access their tenant's sent emails" ON mailbox_sent_emails
  FOR ALL USING (tenant_id = (
    SELECT tenant_id::text 
    FROM user_accounts 
    WHERE auth_id = auth.uid()::text
    LIMIT 1
  ));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mailbox_domains_tenant_id ON mailbox_domains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mailbox_domains_domain ON mailbox_domains(domain);
CREATE INDEX IF NOT EXISTS idx_mailbox_configs_tenant_id ON mailbox_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mailbox_configs_email_address ON mailbox_configs(email_address);
CREATE INDEX IF NOT EXISTS idx_mailbox_messages_mailbox_id ON mailbox_messages(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_mailbox_messages_tenant_id ON mailbox_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mailbox_messages_received_at ON mailbox_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_mailbox_messages_is_read ON mailbox_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_mailbox_attachments_message_id ON mailbox_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_mailbox_templates_tenant_id ON mailbox_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mailbox_sent_emails_tenant_id ON mailbox_sent_emails(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mailbox_sent_emails_customer_id ON mailbox_sent_emails(customer_id);
CREATE INDEX IF NOT EXISTS idx_mailbox_sent_emails_sent_at ON mailbox_sent_emails(sent_at DESC);

-- Insert sample template
DO $$
DECLARE
  tenant_uuid UUID;
BEGIN
  -- Get the first tenant (for demo purposes)
  SELECT id INTO tenant_uuid FROM tenants LIMIT 1;
  
  IF tenant_uuid IS NOT NULL THEN
    INSERT INTO mailbox_templates (tenant_id, name, subject, body_html, body_text, variables)
    VALUES (
      tenant_uuid,
      'Welcome Email',
      'Welcome to {{company_name}}!',
      '<h1>Welcome {{customer_name}}!</h1><p>Thank you for joining {{company_name}}. We''re excited to have you on board.</p><p>Best regards,<br>The {{company_name}} Team</p>',
      'Welcome {{customer_name}}! Thank you for joining {{company_name}}. We''re excited to have you on board. Best regards, The {{company_name}} Team',
      '["customer_name", "company_name"]'::jsonb
    )
    ON CONFLICT (tenant_id, name) DO NOTHING;
  END IF;
END $$;

-- Add email service to pricing_config if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pricing_config WHERE service_type = 'email_send') THEN
    INSERT INTO pricing_config (service_type, credits_per_unit, description)
    VALUES ('email_send', 2, 'Credits per email sent');
  END IF;
END $$; 