-- Role-based permissions and invitation system schema
-- This script adds the necessary tables and updates for role-based access control

-- Add tenant_id to user_accounts if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_accounts' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE user_accounts ADD COLUMN tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_user_accounts_tenant_id ON user_accounts(tenant_id);
    END IF;
END $$;

-- First, let's check and fix the user_accounts.id type if needed
DO $$
BEGIN
    -- Check if user_accounts.id is TEXT and convert to UUID if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_accounts' 
        AND column_name = 'id' 
        AND data_type = 'text'
    ) THEN
        -- Drop ALL foreign key constraints that reference user_accounts.id
        ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_user_account_id_fkey;
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;
        ALTER TABLE mailbox_templates DROP CONSTRAINT IF EXISTS mailbox_templates_created_by_fkey;
        ALTER TABLE mailbox_sent_emails DROP CONSTRAINT IF EXISTS mailbox_sent_emails_sent_by_fkey;
        
        -- Convert the column to UUID
        ALTER TABLE user_accounts ALTER COLUMN id TYPE UUID USING id::UUID;
        
        -- Also convert the referencing columns to UUID
        ALTER TABLE customers ALTER COLUMN user_account_id TYPE UUID USING user_account_id::UUID;
        ALTER TABLE tasks ALTER COLUMN assigned_to TYPE UUID USING assigned_to::UUID;
        
        -- Convert mailbox table references if they exist
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mailbox_templates') THEN
            ALTER TABLE mailbox_templates ALTER COLUMN created_by TYPE UUID USING created_by::UUID;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mailbox_sent_emails') THEN
            ALTER TABLE mailbox_sent_emails ALTER COLUMN sent_by TYPE UUID USING sent_by::UUID;
        END IF;
        
        -- Recreate foreign key constraints
        ALTER TABLE customers ADD CONSTRAINT customers_user_account_id_fkey 
        FOREIGN KEY (user_account_id) REFERENCES user_accounts(id);
        ALTER TABLE tasks ADD CONSTRAINT tasks_assigned_to_fkey 
        FOREIGN KEY (assigned_to) REFERENCES user_accounts(id);
        
        -- Recreate mailbox foreign key constraints if tables exist
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mailbox_templates') THEN
            ALTER TABLE mailbox_templates ADD CONSTRAINT mailbox_templates_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES user_accounts(id);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mailbox_sent_emails') THEN
            ALTER TABLE mailbox_sent_emails ADD CONSTRAINT mailbox_sent_emails_sent_by_fkey 
            FOREIGN KEY (sent_by) REFERENCES user_accounts(id);
        END IF;
    END IF;
END $$;

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id),
    invited_by UUID REFERENCES user_accounts(id),
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, email) -- Prevent duplicate invitations for same email in same tenant
);

-- Create permissions table for granular role-based access control
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL, -- e.g., 'customers.read', 'team.manage', 'settings.admin'
    description TEXT,
    category TEXT, -- e.g., 'customers', 'team', 'settings', 'voice_agents'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(role_id, permission_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_tenant_id ON invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Enable RLS on new tables
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for invitations
CREATE POLICY "Users can access invitations from their tenant"
  ON invitations
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Service role can access all invitations"
  ON invitations
  FOR ALL
  TO service_role
  USING (true);

-- RLS policies for permissions (global read)
CREATE POLICY "All authenticated users can read permissions"
  ON permissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage permissions"
  ON permissions
  FOR ALL
  TO service_role
  USING (true);

-- RLS policies for role_permissions (global read)
CREATE POLICY "All authenticated users can read role permissions"
  ON role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage role permissions"
  ON role_permissions
  FOR ALL
  TO service_role
  USING (true);

-- Update triggers for new tables
CREATE TRIGGER update_invitations_updated_at
    BEFORE UPDATE ON invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON invitations TO authenticated;
GRANT SELECT ON permissions TO authenticated;
GRANT SELECT ON role_permissions TO authenticated;

-- Insert default permissions
INSERT INTO permissions (name, description, category) VALUES
-- Customer management
('customers.read', 'View customers', 'customers'),
('customers.create', 'Create new customers', 'customers'),
('customers.update', 'Update customer information', 'customers'),
('customers.delete', 'Delete customers', 'customers'),
('customers.export', 'Export customer data', 'customers'),
('customers.import', 'Import customer data', 'customers'),

-- Team management
('team.read', 'View team members', 'team'),
('team.invite', 'Invite new team members', 'team'),
('team.update', 'Update team member information', 'team'),
('team.delete', 'Remove team members', 'team'),
('team.manage_roles', 'Assign roles to team members', 'team'),

-- Settings and administration
('settings.organization', 'Manage organization settings', 'settings'),
('settings.custom_fields', 'Manage custom fields', 'settings'),
('settings.integrations', 'Manage integrations and API keys', 'settings'),
('settings.billing', 'Access billing and subscription settings', 'settings'),

-- Voice agents
('voice_agents.read', 'View voice agents', 'voice_agents'),
('voice_agents.create', 'Create new voice agents', 'voice_agents'),
('voice_agents.update', 'Update voice agent configurations', 'voice_agents'),
('voice_agents.delete', 'Delete voice agents', 'voice_agents'),
('voice_agents.test', 'Test voice agents', 'voice_agents'),

-- Phone numbers
('phone_numbers.read', 'View phone numbers', 'phone_numbers'),
('phone_numbers.purchase', 'Purchase new phone numbers', 'phone_numbers'),
('phone_numbers.manage', 'Manage phone number settings', 'phone_numbers'),

-- Mailbox
('mailbox.read', 'View mailbox and emails', 'mailbox'),
('mailbox.send', 'Send emails', 'mailbox'),
('mailbox.manage_domains', 'Manage custom email domains', 'mailbox'),

-- Analytics and reports
('analytics.read', 'View analytics and reports', 'analytics'),
('analytics.export', 'Export analytics data', 'analytics'),

-- Credits and billing
('credits.read', 'View credit balance and usage', 'credits'),
('credits.purchase', 'Purchase credit packages', 'credits')

ON CONFLICT (name) DO NOTHING;

-- Set up default role permissions
DO $$
DECLARE
    admin_role_id UUID;
    manager_role_id UUID;
    agent_role_id UUID;
    support_role_id UUID;
BEGIN
    -- Get role IDs
    SELECT id INTO admin_role_id FROM roles WHERE role_name = 'admin';
    SELECT id INTO manager_role_id FROM roles WHERE role_name = 'manager';
    SELECT id INTO agent_role_id FROM roles WHERE role_name = 'agent';
    SELECT id INTO support_role_id FROM roles WHERE role_name = 'support';

    -- Admin gets all permissions
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT admin_role_id, id FROM permissions
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- Manager gets most permissions except critical admin functions
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT manager_role_id, id FROM permissions 
    WHERE name NOT IN ('settings.integrations', 'settings.billing', 'team.delete')
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- Agent gets customer and basic permissions
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT agent_role_id, id FROM permissions 
    WHERE name IN (
        'customers.read', 'customers.create', 'customers.update',
        'team.read',
        'voice_agents.read', 'voice_agents.test',
        'phone_numbers.read',
        'mailbox.read', 'mailbox.send',
        'analytics.read',
        'credits.read'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- Support gets read-only access to most things
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT support_role_id, id FROM permissions 
    WHERE name LIKE '%.read'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
END $$;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(user_auth_id TEXT, permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_accounts ua
        JOIN role_permissions rp ON ua.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ua.auth_id = user_auth_id
        AND p.name = permission_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_auth_id TEXT)
RETURNS TABLE(permission_name TEXT, category TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT p.name, p.category
    FROM user_accounts ua
    JOIN role_permissions rp ON ua.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ua.auth_id = user_auth_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign default role to new users
CREATE OR REPLACE FUNCTION assign_default_role_to_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id UUID;
BEGIN
    -- Get default role (agent) if no role is assigned
    IF NEW.role_id IS NULL THEN
        SELECT id INTO default_role_id FROM roles WHERE role_name = 'agent' LIMIT 1;
        NEW.role_id := default_role_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign default role
DROP TRIGGER IF EXISTS assign_default_role_trigger ON user_accounts;
CREATE TRIGGER assign_default_role_trigger
    BEFORE INSERT ON user_accounts
    FOR EACH ROW
    EXECUTE FUNCTION assign_default_role_to_user();

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
    DELETE FROM invitations 
    WHERE accepted_at IS NULL 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 