-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE customer_sub_status AS ENUM ('pending', 'scheduled', 'completed', 'cancelled');
CREATE TYPE interaction_type AS ENUM ('call', 'email', 'sms', 'meeting', 'note', 'other');

-- Enable RLS
ALTER DATABASE postgres SET "app.settings.jwt_secret" = 'your-jwt-secret-here';

-- Create tables
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_org_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    schema_name TEXT UNIQUE NOT NULL,
    industry TEXT,
    description TEXT,
    size TEXT,
    location TEXT,
    setup_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    auth_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role_id UUID REFERENCES roles(id),
    status user_status DEFAULT 'active',
    slug TEXT,
    address TEXT,
    zip_code TEXT,
    date_of_joining TIMESTAMPTZ,
    calls_made_till_date INTEGER DEFAULT 0,
    appointments_till_date INTEGER DEFAULT 0,
    deals_closed_till_date INTEGER DEFAULT 0,
    revenue_till_date DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone_number TEXT,
    address TEXT,
    zip_code TEXT,
    age TEXT,
    status TEXT DEFAULT 'New',
    user_account_id UUID REFERENCES user_accounts(id),
    custom_fields JSON,
    
    -- Juno interaction columns
    total_juno_calls INTEGER DEFAULT 0,
    total_juno_emails INTEGER DEFAULT 0,
    total_juno_sms INTEGER DEFAULT 0,
    juno_call_duration_total INTEGER DEFAULT 0,
    last_juno_call_date TIMESTAMPTZ,
    last_juno_interaction_type TEXT,
    last_juno_interaction_date TIMESTAMPTZ,
    
    -- AI columns
    ai_interaction_summary TEXT,
    ai_next_steps TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
    interaction_type interaction_type,
    details TEXT,
    interaction_date TIMESTAMPTZ,
    
    -- AI columns
    ai_summary TEXT,
    ai_next_steps TEXT,
    interaction_source TEXT DEFAULT 'manual',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE juno_call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
    call_recording_url TEXT,
    call_transcript TEXT,
    call_summary TEXT,
    duration_minutes INTEGER,
    
    -- AI columns
    ai_summary TEXT,
    ai_next_steps TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE juno_email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
    email_subject TEXT,
    email_body TEXT,
    email_attachment_url TEXT,
    email_summary TEXT,
    
    -- AI columns
    ai_summary TEXT,
    ai_next_steps TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE juno_sms_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
    sms_content TEXT,
    sms_attachment_url TEXT,
    sms_summary TEXT,
    
    -- AI columns
    ai_summary TEXT,
    ai_next_steps TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom field definitions table
CREATE TABLE custom_field_definitions (
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

-- Customer status definitions table
CREATE TABLE customer_status_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    label TEXT NOT NULL,
    color TEXT DEFAULT '#6b7280',
    is_default BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Create indexes
CREATE INDEX idx_customer_email ON customers(email);
CREATE INDEX idx_customer_phone ON customers(phone_number);
CREATE INDEX idx_customer_status ON customers(status);
CREATE INDEX idx_customer_user ON customers(user_account_id);
CREATE INDEX idx_customer_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_custom_fields ON customers USING GIN (custom_fields);
CREATE INDEX idx_interaction_customer ON interactions(customer_id);
CREATE INDEX idx_interaction_tenant ON interactions(tenant_id);
CREATE INDEX idx_interaction_date ON interactions(interaction_date);
CREATE INDEX idx_juno_call_logs_customer ON juno_call_logs(customer_id);
CREATE INDEX idx_juno_call_logs_tenant ON juno_call_logs(tenant_id);
CREATE INDEX idx_juno_email_logs_customer ON juno_email_logs(customer_id);
CREATE INDEX idx_juno_email_logs_tenant ON juno_email_logs(tenant_id);
CREATE INDEX idx_juno_sms_logs_customer ON juno_sms_logs(customer_id);
CREATE INDEX idx_juno_sms_logs_tenant ON juno_sms_logs(tenant_id);
CREATE INDEX idx_custom_fields_tenant ON custom_field_definitions(tenant_id);
CREATE INDEX idx_customer_status_tenant ON customer_status_definitions(tenant_id);
CREATE INDEX idx_customer_status_default ON customer_status_definitions(tenant_id, is_default) WHERE is_default = true;
CREATE INDEX idx_tenants_setup ON tenants(setup_completed);

-- AI Analysis Function
CREATE OR REPLACE FUNCTION generate_ai_interaction_analysis(
    interaction_type_param TEXT,
    content_param TEXT,
    customer_name_param TEXT DEFAULT 'Customer'
)
RETURNS JSON AS $$
DECLARE
    summary_text TEXT;
    next_steps_text TEXT;
    sentiment_score DECIMAL;
BEGIN
    -- Generate AI summary based on interaction type and content
    CASE interaction_type_param
        WHEN 'call' THEN
            IF content_param ILIKE '%quote%' OR content_param ILIKE '%price%' OR content_param ILIKE '%cost%' THEN
                summary_text := customer_name_param || ' inquired about pricing and requested quote information.';
                next_steps_text := 'Send detailed pricing proposal within 24 hours.';
            ELSIF content_param ILIKE '%appointment%' OR content_param ILIKE '%schedule%' OR content_param ILIKE '%meeting%' THEN
                summary_text := customer_name_param || ' expressed interest in scheduling a consultation.';
                next_steps_text := 'Schedule follow-up appointment within 3 business days.';
            ELSIF content_param ILIKE '%complaint%' OR content_param ILIKE '%issue%' OR content_param ILIKE '%problem%' THEN
                summary_text := customer_name_param || ' reported service concerns requiring immediate attention.';
                next_steps_text := 'Escalate to support team and follow up within 4 hours.';
            ELSE
                summary_text := customer_name_param || ' called regarding general service inquiry.';
                next_steps_text := 'Follow up with additional information within 2 business days.';
            END IF;
            
        WHEN 'email' THEN
            IF content_param ILIKE '%urgent%' OR content_param ILIKE '%asap%' OR content_param ILIKE '%immediately%' THEN
                summary_text := customer_name_param || ' sent urgent communication requiring immediate response.';
                next_steps_text := 'Respond within 2 hours with requested information.';
            ELSIF content_param ILIKE '%thank%' OR content_param ILIKE '%appreciate%' THEN
                summary_text := customer_name_param || ' expressed satisfaction with recent service experience.';
                next_steps_text := 'Consider for testimonial request and upsell opportunities.';
            ELSE
                summary_text := customer_name_param || ' sent email inquiry about services.';
                next_steps_text := 'Respond with detailed information within 1 business day.';
            END IF;
            
        WHEN 'sms' THEN
            IF length(content_param) < 50 THEN
                summary_text := customer_name_param || ' sent brief SMS message.';
                next_steps_text := 'Acknowledge receipt and provide requested information.';
            ELSE
                summary_text := customer_name_param || ' sent detailed SMS communication.';
                next_steps_text := 'Review message thoroughly and respond appropriately.';
            END IF;
            
        ELSE
            summary_text := customer_name_param || ' had ' || interaction_type_param || ' interaction.';
            next_steps_text := 'Review interaction details and determine appropriate follow-up.';
    END CASE;
    
    -- Simple sentiment analysis
    IF content_param ILIKE '%happy%' OR content_param ILIKE '%satisfied%' OR content_param ILIKE '%great%' THEN
        sentiment_score := 0.8;
    ELSIF content_param ILIKE '%angry%' OR content_param ILIKE '%frustrated%' OR content_param ILIKE '%disappointed%' THEN
        sentiment_score := 0.2;
    ELSE
        sentiment_score := 0.5;
    END IF;
    
    RETURN json_build_object(
        'summary', summary_text,
        'next_steps', next_steps_text,
        'sentiment', sentiment_score,
        'generated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Function to sync AI summaries to interactions table
CREATE OR REPLACE FUNCTION sync_ai_summary_to_interactions()
RETURNS TRIGGER AS $$
DECLARE
    customer_name TEXT;
    ai_result JSON;
BEGIN
    -- Get customer name for personalized summary
    SELECT CONCAT(first_name, ' ', last_name) INTO customer_name
    FROM customers WHERE id = NEW.customer_id;
    
    -- Generate AI analysis
    ai_result := generate_ai_interaction_analysis(
        TG_ARGV[0], -- interaction type passed as trigger argument
        COALESCE(NEW.call_summary, NEW.email_summary, NEW.sms_summary, ''),
        customer_name
    );
    
    -- Insert concise summary into interactions table (NOT full content)
    INSERT INTO interactions (
        tenant_id,
        customer_id,
        interaction_type,
        details,
        interaction_date,
        ai_summary,
        ai_next_steps,
        interaction_source
    ) VALUES (
        NEW.tenant_id,
        NEW.customer_id,
        TG_ARGV[0]::interaction_type,
        (ai_result->>'summary') || E'\n\nNext Steps: ' || (ai_result->>'next_steps'),
        NEW.created_at,
        ai_result->>'summary',
        ai_result->>'next_steps',
        'juno_agent'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger functions for AI enhanced Juno interactions
CREATE OR REPLACE FUNCTION trigger_ai_enhanced_juno_call()
RETURNS TRIGGER AS $$
DECLARE
    customer_name TEXT;
    ai_result JSON;
BEGIN
    -- Get customer name
    SELECT CONCAT(first_name, ' ', last_name) INTO customer_name
    FROM customers WHERE id = NEW.customer_id;
    
    -- Generate AI analysis
    ai_result := generate_ai_interaction_analysis(
        'call',
        COALESCE(NEW.call_summary, NEW.call_transcript, ''),
        customer_name
    );
    
    -- Update the record with AI analysis
    NEW.ai_summary := ai_result->>'summary';
    NEW.ai_next_steps := ai_result->>'next_steps';
    
    -- Update customer stats
    UPDATE customers SET
        total_juno_calls = COALESCE(total_juno_calls, 0) + 1,
        juno_call_duration_total = COALESCE(juno_call_duration_total, 0) + COALESCE(NEW.duration_minutes, 0),
        last_juno_call_date = NEW.created_at,
        last_juno_interaction_type = 'call',
        last_juno_interaction_date = NEW.created_at,
        ai_interaction_summary = ai_result->>'summary',
        ai_next_steps = ai_result->>'next_steps'
    WHERE id = NEW.customer_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_ai_enhanced_juno_email()
RETURNS TRIGGER AS $$
DECLARE
    customer_name TEXT;
    ai_result JSON;
BEGIN
    SELECT CONCAT(first_name, ' ', last_name) INTO customer_name
    FROM customers WHERE id = NEW.customer_id;
    
    ai_result := generate_ai_interaction_analysis(
        'email',
        COALESCE(NEW.email_summary, NEW.email_subject, ''),
        customer_name
    );
    
    NEW.ai_summary := ai_result->>'summary';
    NEW.ai_next_steps := ai_result->>'next_steps';
    
    UPDATE customers SET
        total_juno_emails = COALESCE(total_juno_emails, 0) + 1,
        last_juno_interaction_type = 'email',
        last_juno_interaction_date = NEW.created_at,
        ai_interaction_summary = ai_result->>'summary',
        ai_next_steps = ai_result->>'next_steps'
    WHERE id = NEW.customer_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_ai_enhanced_juno_sms()
RETURNS TRIGGER AS $$
DECLARE
    customer_name TEXT;
    ai_result JSON;
BEGIN
    SELECT CONCAT(first_name, ' ', last_name) INTO customer_name
    FROM customers WHERE id = NEW.customer_id;
    
    ai_result := generate_ai_interaction_analysis(
        'sms',
        COALESCE(NEW.sms_summary, NEW.sms_content, ''),
        customer_name
    );
    
    NEW.ai_summary := ai_result->>'summary';
    NEW.ai_next_steps := ai_result->>'next_steps';
    
    UPDATE customers SET
        total_juno_sms = COALESCE(total_juno_sms, 0) + 1,
        last_juno_interaction_type = 'sms',
        last_juno_interaction_date = NEW.created_at,
        ai_interaction_summary = ai_result->>'summary',
        ai_next_steps = ai_result->>'next_steps'
    WHERE id = NEW.customer_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE TRIGGER update_juno_call_logs_updated_at
    BEFORE UPDATE ON juno_call_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_juno_email_logs_updated_at
    BEFORE UPDATE ON juno_email_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_juno_sms_logs_updated_at
    BEFORE UPDATE ON juno_sms_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create AI analysis triggers
CREATE TRIGGER trigger_juno_call_ai_analysis
    BEFORE INSERT ON juno_call_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_ai_enhanced_juno_call();

CREATE TRIGGER trigger_juno_email_ai_analysis
    BEFORE INSERT ON juno_email_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_ai_enhanced_juno_email();

CREATE TRIGGER trigger_juno_sms_ai_analysis
    BEFORE INSERT ON juno_sms_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_ai_enhanced_juno_sms();

-- Create triggers to sync AI summaries to interactions table
CREATE TRIGGER sync_juno_call_to_interactions
    AFTER INSERT ON juno_call_logs
    FOR EACH ROW
    EXECUTE FUNCTION sync_ai_summary_to_interactions('call');

CREATE TRIGGER sync_juno_email_to_interactions
    AFTER INSERT ON juno_email_logs
    FOR EACH ROW
    EXECUTE FUNCTION sync_ai_summary_to_interactions('email');

CREATE TRIGGER sync_juno_sms_to_interactions
    AFTER INSERT ON juno_sms_logs
    FOR EACH ROW
    EXECUTE FUNCTION sync_ai_summary_to_interactions('sms');

-- Enable Row Level Security (RLS)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE juno_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE juno_email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE juno_sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_status_definitions ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Enable access for tenant users" ON interactions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable access for tenant users" ON juno_call_logs
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable access for tenant users" ON juno_email_logs
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable access for tenant users" ON juno_sms_logs
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable access for tenant users" ON custom_field_definitions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable access for tenant users" ON customer_status_definitions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Insert default roles
INSERT INTO roles (role_name) VALUES
    ('admin'),
    ('manager'),
    ('agent'),
    ('support')
ON CONFLICT (role_name) DO NOTHING;

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

-- Add customer status definitions table for tenant-specific statuses
CREATE TABLE IF NOT EXISTS customer_status_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL, -- e.g., "new", "contacted", "qualified"  
    label TEXT NOT NULL, -- e.g., "New Lead", "Contacted", "Qualified"
    color TEXT DEFAULT '#6b7280', -- Hex color for display
    is_default BOOLEAN DEFAULT FALSE, -- One status per tenant should be default
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Enable RLS on both tables
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_status_definitions ENABLE ROW LEVEL SECURITY;

-- Create policies for both tables
CREATE POLICY "Enable access for tenant users" ON custom_field_definitions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable access for tenant users" ON customer_status_definitions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_custom_fields_tenant ON custom_field_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_status_tenant ON customer_status_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_status_default ON customer_status_definitions(tenant_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_tenants_setup ON tenants(setup_completed); 