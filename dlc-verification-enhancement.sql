-- DLC and Phone Verification Enhancement
-- Adds optional compliance services for purchased phone numbers

-- STEP 1: Update pricing_config service_type check constraint FIRST
DO $$
BEGIN
    -- Drop the old constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pricing_config_service_type_check' 
        AND table_name = 'pricing_config'
    ) THEN
        ALTER TABLE pricing_config DROP CONSTRAINT pricing_config_service_type_check;
    END IF;
    
    -- Add the new constraint with DLC and verification types
    ALTER TABLE pricing_config ADD CONSTRAINT pricing_config_service_type_check 
    CHECK (service_type IN (
        'voice_call', 'phone_number_monthly', 'phone_number_setup', 'email_send', 'sms_send', 'sms_receive', 
        'whatsapp_send', 'whatsapp_receive', 'dlc_brand_registration', 'dlc_campaign_registration', 
        'dlc_monthly_fee', 'phone_verification', 'carrier_verification'
    ));
    
    RAISE NOTICE 'Updated pricing_config constraint to include DLC and verification types';
END $$;

-- STEP 2: Update transaction_type check constraint
DO $$
BEGIN
    -- Drop the constraint to add new transaction types
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'credit_transactions_transaction_type_check' 
        AND table_name = 'credit_transactions'
    ) THEN
        ALTER TABLE credit_transactions DROP CONSTRAINT credit_transactions_transaction_type_check;
    END IF;
    
    -- Add the updated constraint with DLC and verification charges
    ALTER TABLE credit_transactions ADD CONSTRAINT credit_transactions_transaction_type_check 
    CHECK (transaction_type IN (
        'purchase', 'call_charge', 'phone_number_charge', 'email_charge', 'sms_charge', 
        'whatsapp_charge', 'dlc_charge', 'verification_charge', 'refund', 'bonus'
    ));
    
    RAISE NOTICE 'Updated transaction types to include DLC and verification charges';
END $$;

-- STEP 3: Now safely add new service types for DLC and verification
DO $$
BEGIN
    -- DLC Brand Registration
    IF NOT EXISTS (SELECT 1 FROM pricing_config WHERE service_type = 'dlc_brand_registration') THEN
        INSERT INTO pricing_config (service_type, credits_per_unit, description) 
        VALUES ('dlc_brand_registration', 400, 'One-time 10DLC brand registration for business SMS');
    END IF;
    
    -- DLC Campaign Registration
    IF NOT EXISTS (SELECT 1 FROM pricing_config WHERE service_type = 'dlc_campaign_registration') THEN
        INSERT INTO pricing_config (service_type, credits_per_unit, description) 
        VALUES ('dlc_campaign_registration', 1000, 'One-time 10DLC campaign registration per use case');
    END IF;
    
    -- DLC Monthly Fee
    IF NOT EXISTS (SELECT 1 FROM pricing_config WHERE service_type = 'dlc_monthly_fee') THEN
        INSERT INTO pricing_config (service_type, credits_per_unit, description) 
        VALUES ('dlc_monthly_fee', 50, 'Monthly 10DLC compliance fee per registered number');
    END IF;
    
    -- Phone Verification
    IF NOT EXISTS (SELECT 1 FROM pricing_config WHERE service_type = 'phone_verification') THEN
        INSERT INTO pricing_config (service_type, credits_per_unit, description) 
        VALUES ('phone_verification', 200, 'Phone number verification for enhanced deliverability');
    END IF;
    
    -- Carrier Verification
    IF NOT EXISTS (SELECT 1 FROM pricing_config WHERE service_type = 'carrier_verification') THEN
        INSERT INTO pricing_config (service_type, credits_per_unit, description) 
        VALUES ('carrier_verification', 300, 'Carrier-specific verification for premium features');
    END IF;
    
    RAISE NOTICE 'Added DLC and verification pricing configuration';
END $$;

-- Create phone number compliance table
CREATE TABLE IF NOT EXISTS phone_number_compliance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number_id UUID NOT NULL REFERENCES tenant_phone_numbers(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(phone_number_id), -- One compliance record per phone number
    
    -- DLC Registration Status
    dlc_brand_registered BOOLEAN DEFAULT FALSE,
    dlc_brand_id TEXT, -- Twilio Brand Registration ID
    dlc_campaign_registered BOOLEAN DEFAULT FALSE,
    dlc_campaign_id TEXT, -- Twilio Campaign Registration ID
    dlc_campaign_status TEXT, -- pending, approved, rejected, suspended
    
    -- Phone Verification Status  
    phone_verified BOOLEAN DEFAULT FALSE,
    phone_verification_id TEXT, -- Twilio Phone Verification ID
    carrier_verified BOOLEAN DEFAULT FALSE,
    carrier_verification_id TEXT,
    
    -- Billing tracking
    brand_registration_credits_charged INTEGER DEFAULT 0,
    campaign_registration_credits_charged INTEGER DEFAULT 0,
    verification_credits_charged INTEGER DEFAULT 0,
    monthly_dlc_active BOOLEAN DEFAULT FALSE,
    next_dlc_billing_date TIMESTAMPTZ,
    
    -- Metadata
    business_name TEXT,
    business_website TEXT,
    business_type TEXT, -- sole_proprietorship, llc, corporation, non_profit, etc.
    use_case_category TEXT, -- marketing, notifications, customer_service, etc.
    sample_messages TEXT[], -- Array of sample message content
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_phone_compliance_phone_number_id ON phone_number_compliance(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_phone_compliance_tenant_id ON phone_number_compliance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_phone_compliance_dlc_status ON phone_number_compliance(dlc_campaign_status);

-- Enable RLS
ALTER TABLE phone_number_compliance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can only access their tenant's phone compliance data"
  ON phone_number_compliance
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Service role can access all phone compliance data"
  ON phone_number_compliance
  FOR ALL
  TO service_role
  USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON phone_number_compliance TO authenticated;

-- Add trigger for updated_at
CREATE TRIGGER update_phone_compliance_updated_at
    BEFORE UPDATE ON phone_number_compliance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to initiate DLC brand registration
CREATE OR REPLACE FUNCTION initiate_dlc_brand_registration(
    phone_number_id_param UUID,
    business_name_param TEXT,
    business_website_param TEXT,
    business_type_param TEXT
)
RETURNS JSON AS $$
DECLARE
    tenant_record RECORD;
    phone_record RECORD;
    compliance_record RECORD;
    current_balance INTEGER;
    brand_cost INTEGER := 400; -- Credits for brand registration
BEGIN
    -- Get phone number and tenant info
    SELECT pn.*, t.id as tenant_id INTO phone_record 
    FROM tenant_phone_numbers pn 
    JOIN tenants t ON t.id = pn.tenant_id 
    WHERE pn.id = phone_number_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Phone number not found');
    END IF;
    
    -- Check credit balance
    current_balance := get_tenant_credit_balance(phone_record.tenant_id);
    IF current_balance < brand_cost THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Insufficient credits', 
            'required', brand_cost,
            'available', current_balance
        );
    END IF;
    
    -- Create or update compliance record
    -- First try to get existing record
    SELECT * INTO compliance_record 
    FROM phone_number_compliance 
    WHERE phone_number_id = phone_number_id_param;
    
    IF NOT FOUND THEN
        -- Insert new record
        INSERT INTO phone_number_compliance (
            phone_number_id, tenant_id, business_name, business_website, business_type
        ) VALUES (
            phone_number_id_param, phone_record.tenant_id, business_name_param, 
            business_website_param, business_type_param
        ) RETURNING * INTO compliance_record;
    ELSE
        -- Update existing record
        UPDATE phone_number_compliance 
        SET 
            business_name = business_name_param,
            business_website = business_website_param,
            business_type = business_type_param,
            updated_at = NOW()
        WHERE phone_number_id = phone_number_id_param
        RETURNING * INTO compliance_record;
    END IF;
    
    -- Deduct credits (actual Twilio API call would happen in application layer)
    PERFORM update_credits(
        phone_record.tenant_id,
        -brand_cost,
        'dlc_charge',
        'DLC Brand Registration for ' || phone_record.phone_number,
        phone_number_id_param::text
    );
    
    -- Update compliance record with charge
    UPDATE phone_number_compliance 
    SET brand_registration_credits_charged = brand_cost
    WHERE id = compliance_record.id;
    
    RETURN json_build_object(
        'success', true, 
        'compliance_id', compliance_record.id,
        'credits_charged', brand_cost,
        'message', 'DLC brand registration initiated'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initiate phone verification
CREATE OR REPLACE FUNCTION initiate_phone_verification(
    phone_number_id_param UUID,
    verification_type_param TEXT DEFAULT 'basic' -- 'basic' or 'carrier'
)
RETURNS JSON AS $$
DECLARE
    phone_record RECORD;
    compliance_record RECORD;
    current_balance INTEGER;
    verification_cost INTEGER;
BEGIN
    -- Determine cost based on verification type
    verification_cost := CASE 
        WHEN verification_type_param = 'carrier' THEN 300
        ELSE 200
    END;
    
    -- Get phone number info
    SELECT pn.*, t.id as tenant_id INTO phone_record 
    FROM tenant_phone_numbers pn 
    JOIN tenants t ON t.id = pn.tenant_id 
    WHERE pn.id = phone_number_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Phone number not found');
    END IF;
    
    -- Check credit balance
    current_balance := get_tenant_credit_balance(phone_record.tenant_id);
    IF current_balance < verification_cost THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Insufficient credits', 
            'required', verification_cost,
            'available', current_balance
        );
    END IF;
    
    -- Create or update compliance record
    -- First try to get existing record
    SELECT * INTO compliance_record 
    FROM phone_number_compliance 
    WHERE phone_number_id = phone_number_id_param;
    
    IF NOT FOUND THEN
        -- Insert new record
        INSERT INTO phone_number_compliance (phone_number_id, tenant_id) 
        VALUES (phone_number_id_param, phone_record.tenant_id)
        RETURNING * INTO compliance_record;
    ELSE
        -- Update existing record timestamp
        UPDATE phone_number_compliance 
        SET updated_at = NOW()
        WHERE phone_number_id = phone_number_id_param
        RETURNING * INTO compliance_record;
    END IF;
    
    -- Deduct credits
    PERFORM update_credits(
        phone_record.tenant_id,
        -verification_cost,
        'verification_charge',
        verification_type_param || ' phone verification for ' || phone_record.phone_number,
        phone_number_id_param::text
    );
    
    -- Update compliance record
    UPDATE phone_number_compliance 
    SET 
        verification_credits_charged = verification_credits_charged + verification_cost,
        phone_verified = CASE WHEN verification_type_param = 'basic' THEN true ELSE phone_verified END,
        carrier_verified = CASE WHEN verification_type_param = 'carrier' THEN true ELSE carrier_verified END
    WHERE id = compliance_record.id;
    
    RETURN json_build_object(
        'success', true, 
        'compliance_id', compliance_record.id,
        'credits_charged', verification_cost,
        'verification_type', verification_type_param,
        'message', verification_type_param || ' verification initiated'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Final verification message
DO $$
BEGIN
    RAISE NOTICE '================================';
    RAISE NOTICE 'DLC & Verification Enhancement Complete!';
    RAISE NOTICE '================================';
    RAISE NOTICE 'New Services Added:';
    RAISE NOTICE '• DLC Brand Registration: 400 credits';
    RAISE NOTICE '• DLC Campaign Registration: 1000 credits';  
    RAISE NOTICE '• Monthly DLC Fee: 50 credits/month';
    RAISE NOTICE '• Phone Verification: 200 credits';
    RAISE NOTICE '• Carrier Verification: 300 credits';
    RAISE NOTICE '================================';
END $$; 