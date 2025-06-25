-- Create custom types
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE customer_status AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'closed_won', 'closed_lost');
CREATE TYPE customer_sub_status AS ENUM ('pending', 'scheduled', 'completed', 'cancelled');
CREATE TYPE interaction_type AS ENUM ('call', 'email', 'sms', 'meeting', 'note');

-- Enable RLS
ALTER DATABASE postgres SET "app.settings.jwt_secret" = 'your-jwt-secret-here';

-- Create tables
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE NOT NULL,
    address TEXT,
    zip_code TEXT,
    date_of_joining TIMESTAMPTZ,
    status user_status DEFAULT 'active',
    slug TEXT UNIQUE,
    appointments_till_date INTEGER DEFAULT 0,
    calls_made_till_date INTEGER DEFAULT 0,
    deals_closed_till_date INTEGER DEFAULT 0,
    revenue_till_date DECIMAL(10,2) DEFAULT 0,
    role_id UUID REFERENCES roles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone_number TEXT,
    address TEXT,
    zip_code TEXT,
    age TEXT,
    status customer_status DEFAULT 'new',
    sub_status customer_sub_status,
    last_interaction TIMESTAMPTZ,
    
    -- Custom field data storage (JSONB for flexibility)
    custom_fields JSONB DEFAULT '{}'::jsonb,
    
    -- Relations
    user_account_id UUID REFERENCES user_accounts(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
    interaction_type interaction_type,
    details TEXT,
    interaction_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alex_call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
    call_recording_url TEXT,
    call_transcript TEXT,
    call_summary TEXT,
    duration_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alex_email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
    email_subject TEXT,
    email_body TEXT,
    email_attachment_url TEXT,
    email_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alex_sms_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
    sms_content TEXT,
    sms_attachment_url TEXT,
    sms_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_customer_email ON customers(email);
CREATE INDEX idx_customer_phone ON customers(phone_number);
CREATE INDEX idx_customer_status ON customers(status);
CREATE INDEX idx_customer_user ON customers(user_account_id);
CREATE INDEX idx_customers_custom_fields ON customers USING GIN (custom_fields);
CREATE INDEX idx_interaction_customer ON interactions(customer_id);
CREATE INDEX idx_interaction_date ON interactions(interaction_date);
CREATE INDEX idx_call_logs_customer ON alex_call_logs(customer_id);
CREATE INDEX idx_email_logs_customer ON alex_email_logs(customer_id);
CREATE INDEX idx_sms_logs_customer ON alex_sms_logs(customer_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_accounts_updated_at
    BEFORE UPDATE ON user_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interactions_updated_at
    BEFORE UPDATE ON interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_logs_updated_at
    BEFORE UPDATE ON alex_call_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_logs_updated_at
    BEFORE UPDATE ON alex_email_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sms_logs_updated_at
    BEFORE UPDATE ON alex_sms_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alex_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alex_email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alex_sms_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" ON roles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable read access for authenticated users" ON user_accounts
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable read access for authenticated users" ON customers
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable write access for authenticated users" ON customers
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update access for assigned users" ON customers
    FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = (
        SELECT auth_id 
        FROM user_accounts 
        WHERE id = customers.user_account_id
    ));

-- Insert default roles
INSERT INTO roles (role_name) VALUES
    ('admin'),
    ('manager'),
    ('agent'),
    ('support');

-- Add columns to tenants table for organization setup
ALTER TABLE IF EXISTS tenants ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE IF EXISTS tenants ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE IF EXISTS tenants ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE IF EXISTS tenants ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE IF EXISTS tenants ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE;

-- Add custom field definitions table if it doesn't exist
CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    label TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('string', 'number', 'boolean', 'date', 'select')),
    required BOOLEAN DEFAULT FALSE,
    options JSON,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Enable RLS on custom_field_definitions
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;

-- Create policy for custom_field_definitions
CREATE POLICY "Enable access for tenant users" ON custom_field_definitions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_custom_fields_tenant ON custom_field_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_setup ON tenants(setup_completed); 