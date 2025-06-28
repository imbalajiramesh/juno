-- ===============================================
-- TWILIO VERIFICATION SYSTEM MIGRATION
-- ===============================================
-- Comprehensive verification system for phone numbers
-- Includes compliance tracking, auto-verification, and notifications

-- 1. Phone Number Compliance Table
-- ===============================================
CREATE TABLE IF NOT EXISTS phone_number_compliance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number_id UUID NOT NULL REFERENCES tenant_phone_numbers(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Phone Verification
    phone_verified BOOLEAN DEFAULT FALSE,
    phone_verification_id TEXT,
    phone_verification_status TEXT,
    phone_verification_date TIMESTAMPTZ,
    
    -- Carrier Verification
    carrier_verified BOOLEAN DEFAULT FALSE,
    carrier_verification_id TEXT,
    carrier_verification_status TEXT,
    carrier_verification_date TIMESTAMPTZ,
    
    -- 10DLC Brand Registration
    dlc_brand_registered BOOLEAN DEFAULT FALSE,
    dlc_brand_id TEXT,
    dlc_brand_status TEXT,
    dlc_brand_date TIMESTAMPTZ,
    
    -- 10DLC Campaign Registration
    dlc_campaign_registered BOOLEAN DEFAULT FALSE,
    dlc_campaign_id TEXT,
    dlc_campaign_status TEXT,
    dlc_campaign_date TIMESTAMPTZ,
    
    -- Auto-submission tracking
    auto_submitted BOOLEAN DEFAULT FALSE,
    submission_timestamp TIMESTAMPTZ,
    documents_used JSONB,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_phone_compliance_phone_id ON phone_number_compliance(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_phone_compliance_tenant_id ON phone_number_compliance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_phone_compliance_brand_id ON phone_number_compliance(dlc_brand_id);
CREATE INDEX IF NOT EXISTS idx_phone_compliance_campaign_id ON phone_number_compliance(dlc_campaign_id);

-- 2. Verification Events Log Table
-- ===============================================
CREATE TABLE IF NOT EXISTS verification_events_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
    phone_number_id UUID REFERENCES tenant_phone_numbers(id) ON DELETE CASCADE,
    
    -- Event details
    type TEXT NOT NULL,
    resource_sid TEXT,
    status TEXT,
    previous_status TEXT,
    
    -- Metadata
    webhook_data JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for log queries
CREATE INDEX IF NOT EXISTS idx_verification_log_tenant ON verification_events_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_verification_log_phone ON verification_events_log(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_verification_log_type ON verification_events_log(type);
CREATE INDEX IF NOT EXISTS idx_verification_log_created ON verification_events_log(created_at);

-- 3. Auto-Verification Log Table
-- ===============================================
CREATE TABLE IF NOT EXISTS auto_verification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    phone_number_id UUID REFERENCES tenant_phone_numbers(id) ON DELETE CASCADE,
    
    -- Verification details
    verification_type TEXT NOT NULL,
    status TEXT NOT NULL,
    
    -- Twilio IDs
    twilio_brand_id TEXT,
    twilio_campaign_id TEXT,
    twilio_verification_id TEXT,
    
    -- Auto-submission data
    documents_used UUID[],
    business_data JSONB,
    campaign_data JSONB,
    
    -- Results
    twilio_response JSONB,
    error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for auto-verification log
CREATE INDEX IF NOT EXISTS idx_auto_verification_tenant ON auto_verification_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_auto_verification_type ON auto_verification_log(verification_type);
CREATE INDEX IF NOT EXISTS idx_auto_verification_status ON auto_verification_log(status);

-- 4. Verification Notification Queue Table
-- ===============================================
CREATE TABLE IF NOT EXISTS verification_notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    phone_number_id UUID REFERENCES tenant_phone_numbers(id) ON DELETE CASCADE,
    
    -- Notification details
    type TEXT NOT NULL, -- 'campaign_approved', 'campaign_rejected', 'verification_complete'
    message TEXT NOT NULL,
    
    -- Email data
    recipient_email TEXT,
    email_template TEXT,
    template_variables JSONB,
    
    -- Processing status
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for notification queue
CREATE INDEX IF NOT EXISTS idx_verification_notifications_status ON verification_notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_verification_notifications_tenant ON verification_notification_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_verification_notifications_created ON verification_notification_queue(created_at);

-- 5. Update existing tenants table for verification support
-- ===============================================
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'corporation',
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS tax_id TEXT;

-- 6. Database Functions for Verification
-- ===============================================

-- Function to initiate phone verification
CREATE OR REPLACE FUNCTION initiate_phone_verification(
    phone_number_id_param UUID
)
RETURNS TABLE(
    success BOOLEAN,
    verification_id TEXT,
    credits_charged INTEGER,
    compliance_id UUID
) AS $$
DECLARE
    phone_record RECORD;
    verification_cost INTEGER := 200;
    new_verification_id TEXT;
    compliance_record_id UUID;
    current_balance INTEGER;
BEGIN
    -- Get phone number and tenant info
    SELECT tnp.*, t.id as tenant_id INTO phone_record
    FROM tenant_phone_numbers tnp
    JOIN tenants t ON tnp.tenant_id = t.id
    WHERE tnp.id = phone_number_id_param;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, 0, NULL::UUID;
        RETURN;
    END IF;

    -- Check credit balance
    SELECT balance INTO current_balance 
    FROM get_tenant_credit_balance(phone_record.tenant_id);

    IF current_balance < verification_cost THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, 0, NULL::UUID;
        RETURN;
    END IF;

    -- Generate verification ID (mock for now)
    new_verification_id := 'VE' || substr(gen_random_uuid()::text, 1, 32);

    -- Deduct credits
    PERFORM update_credits(phone_record.tenant_id, -verification_cost, 'Phone verification for ' || phone_record.phone_number);

    -- Create or update compliance record
    INSERT INTO phone_number_compliance (
        phone_number_id, 
        tenant_id, 
        phone_verification_id, 
        phone_verification_status,
        phone_verification_date
    ) VALUES (
        phone_number_id_param, 
        phone_record.tenant_id, 
        new_verification_id, 
        'pending',
        NOW()
    )
    ON CONFLICT (phone_number_id) 
    DO UPDATE SET 
        phone_verification_id = new_verification_id,
        phone_verification_status = 'pending',
        phone_verification_date = NOW(),
        updated_at = NOW()
    RETURNING id INTO compliance_record_id;

    RETURN QUERY SELECT TRUE, new_verification_id, verification_cost, compliance_record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initiate DLC brand registration
CREATE OR REPLACE FUNCTION initiate_dlc_brand_registration(
    phone_number_id_param UUID,
    business_name_param TEXT,
    business_website_param TEXT,
    business_type_param TEXT
)
RETURNS TABLE(
    success BOOLEAN,
    brand_id TEXT,
    credits_charged INTEGER,
    compliance_id UUID
) AS $$
DECLARE
    phone_record RECORD;
    brand_cost INTEGER := 400;
    new_brand_id TEXT;
    compliance_record_id UUID;
    current_balance INTEGER;
BEGIN
    -- Get phone number and tenant info
    SELECT tnp.*, t.id as tenant_id INTO phone_record
    FROM tenant_phone_numbers tnp
    JOIN tenants t ON tnp.tenant_id = t.id
    WHERE tnp.id = phone_number_id_param;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, 0, NULL::UUID;
        RETURN;
    END IF;

    -- Check credit balance
    SELECT balance INTO current_balance 
    FROM get_tenant_credit_balance(phone_record.tenant_id);

    IF current_balance < brand_cost THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, 0, NULL::UUID;
        RETURN;
    END IF;

    -- Generate brand ID (mock for now)
    new_brand_id := 'BN' || substr(gen_random_uuid()::text, 1, 32);

    -- Deduct credits
    PERFORM update_credits(phone_record.tenant_id, -brand_cost, '10DLC Brand registration for ' || phone_record.phone_number);

    -- Create or update compliance record
    INSERT INTO phone_number_compliance (
        phone_number_id, 
        tenant_id, 
        dlc_brand_id, 
        dlc_brand_status,
        dlc_brand_date
    ) VALUES (
        phone_number_id_param, 
        phone_record.tenant_id, 
        new_brand_id, 
        'pending',
        NOW()
    )
    ON CONFLICT (phone_number_id) 
    DO UPDATE SET 
        dlc_brand_id = new_brand_id,
        dlc_brand_status = 'pending',
        dlc_brand_date = NOW(),
        updated_at = NOW()
    RETURNING id INTO compliance_record_id;

    RETURN QUERY SELECT TRUE, new_brand_id, brand_cost, compliance_record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get compliance data for a phone number
CREATE OR REPLACE FUNCTION get_phone_compliance_data(phone_number_id_param UUID)
RETURNS JSONB AS $$
DECLARE
    compliance_data JSONB;
    services_data JSONB;
BEGIN
    -- Get compliance status
    SELECT jsonb_build_object(
        'phone_verified', COALESCE(phone_verified, false),
        'carrier_verified', COALESCE(carrier_verified, false),
        'dlc_brand_registered', COALESCE(dlc_brand_registered, false),
        'dlc_campaign_registered', COALESCE(dlc_campaign_registered, false),
        'dlc_brand_id', dlc_brand_id,
        'dlc_campaign_id', dlc_campaign_id,
        'dlc_campaign_status', dlc_campaign_status,
        'phone_verification_id', phone_verification_id,
        'carrier_verification_id', carrier_verification_id
    ) INTO compliance_data
    FROM phone_number_compliance
    WHERE phone_number_id = phone_number_id_param;

    -- Add services available info
    services_data := jsonb_build_object(
        'phone_verification', jsonb_build_object(
            'cost', 200,
            'description', 'Verify number ownership and improve deliverability'
        ),
        'carrier_verification', jsonb_build_object(
            'cost', 300,
            'description', 'Premium verification with enhanced caller ID'
        ),
        'dlc_brand_registration', jsonb_build_object(
            'cost', 400,
            'description', 'Register business for high-volume SMS compliance'
        ),
        'dlc_campaign_registration', jsonb_build_object(
            'cost', 1000,
            'description', 'Configure messaging campaigns for compliance'
        )
    );

    -- Combine compliance data with services
    IF compliance_data IS NULL THEN
        compliance_data := jsonb_build_object(
            'phone_verified', false,
            'carrier_verified', false,
            'dlc_brand_registered', false,
            'dlc_campaign_registered', false
        );
    END IF;

    compliance_data := compliance_data || jsonb_build_object('services_available', services_data);

    RETURN compliance_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS Policies for Verification Tables
-- ===============================================

-- Enable RLS on all verification tables
ALTER TABLE phone_number_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_events_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_verification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_notification_queue ENABLE ROW LEVEL SECURITY;

-- Policies for phone_number_compliance
CREATE POLICY "Users can manage their organization's compliance data" ON phone_number_compliance
    FOR ALL USING (tenant_id = get_current_tenant_id());

-- Policies for verification_events_log
CREATE POLICY "Users can view their organization's verification events" ON verification_events_log
    FOR SELECT USING (tenant_id = get_current_tenant_id());

-- Policies for auto_verification_log
CREATE POLICY "Users can view their organization's auto-verification log" ON auto_verification_log
    FOR SELECT USING (tenant_id = get_current_tenant_id());

-- 8. Create Updated Trigger Function
-- ===============================================
CREATE OR REPLACE FUNCTION update_verification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_phone_compliance_updated_at
    BEFORE UPDATE ON phone_number_compliance
    FOR EACH ROW EXECUTE FUNCTION update_verification_updated_at();

-- 9. Insert Initial Compliance Records for Existing Phone Numbers
-- ===============================================
INSERT INTO phone_number_compliance (phone_number_id, tenant_id)
SELECT id, tenant_id 
FROM tenant_phone_numbers tnp
WHERE NOT EXISTS (
    SELECT 1 FROM phone_number_compliance pnc 
    WHERE pnc.phone_number_id = tnp.id
);

-- ===============================================
-- VERIFICATION SYSTEM MIGRATION COMPLETE
-- ===============================================

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON phone_number_compliance TO authenticated;
GRANT SELECT, INSERT ON verification_events_log TO authenticated;
GRANT SELECT, INSERT ON auto_verification_log TO authenticated;
GRANT SELECT ON verification_notification_queue TO authenticated;

GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated; 