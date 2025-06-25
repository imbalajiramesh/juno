-- Incremental Credits System Migration (Fixed Order)
-- This adds WhatsApp support and credit packages to existing credits system

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
    
    -- Add the new constraint with whatsapp types
    ALTER TABLE pricing_config ADD CONSTRAINT pricing_config_service_type_check 
    CHECK (service_type IN ('voice_call', 'phone_number_monthly', 'phone_number_setup', 'email_send', 'sms_send', 'sms_receive', 'whatsapp_send', 'whatsapp_receive'));
    
    RAISE NOTICE 'Updated pricing_config constraint to include WhatsApp types';
END $$;

-- STEP 2: Update transaction_type check constraint FIRST
DO $$
BEGIN
    -- Drop the old constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'credit_transactions_transaction_type_check' 
        AND table_name = 'credit_transactions'
    ) THEN
        ALTER TABLE credit_transactions DROP CONSTRAINT credit_transactions_transaction_type_check;
    END IF;
    
    -- Add the new constraint with whatsapp_charge
    ALTER TABLE credit_transactions ADD CONSTRAINT credit_transactions_transaction_type_check 
    CHECK (transaction_type IN ('purchase', 'call_charge', 'phone_number_charge', 'email_charge', 'sms_charge', 'whatsapp_charge', 'refund', 'bonus'));
    
    RAISE NOTICE 'Updated credit_transactions constraint to include whatsapp_charge';
END $$;

-- STEP 3: Now safely add WhatsApp service types to pricing_config
DO $$ 
BEGIN
    -- Add whatsapp_send if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pricing_config WHERE service_type = 'whatsapp_send') THEN
        INSERT INTO pricing_config (service_type, credits_per_unit, description) 
        VALUES ('whatsapp_send', 3, 'Credits per WhatsApp message sent');
        RAISE NOTICE 'Added whatsapp_send pricing';
    ELSE
        RAISE NOTICE 'whatsapp_send pricing already exists';
    END IF;
    
    -- Add whatsapp_receive if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pricing_config WHERE service_type = 'whatsapp_receive') THEN
        INSERT INTO pricing_config (service_type, credits_per_unit, description) 
        VALUES ('whatsapp_receive', 1, 'Credits per WhatsApp message received');
        RAISE NOTICE 'Added whatsapp_receive pricing';
    ELSE
        RAISE NOTICE 'whatsapp_receive pricing already exists';
    END IF;
END $$;

-- STEP 4: Create credit_packages table if it doesn't exist
CREATE TABLE IF NOT EXISTS credit_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    price_usd_cents INTEGER NOT NULL, -- Price in cents (e.g., 999 = $9.99)
    credits_per_dollar DECIMAL(10,4) NOT NULL, -- Credits per dollar for comparison
    is_popular BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 5: Enable RLS on credit_packages if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'credit_packages' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on credit_packages table';
    ELSE
        RAISE NOTICE 'RLS already enabled on credit_packages table';
    END IF;
END $$;

-- STEP 6: Create credit packages policies if they don't exist
DO $$
BEGIN
    -- Policy for authenticated users to read credit packages
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'credit_packages' 
        AND policyname = 'All authenticated users can read credit packages'
    ) THEN
        CREATE POLICY "All authenticated users can read credit packages"
          ON credit_packages
          FOR SELECT
          TO authenticated
          USING (true);
        RAISE NOTICE 'Created read policy for credit_packages';
    ELSE
        RAISE NOTICE 'Read policy for credit_packages already exists';
    END IF;

    -- Policy for service role to manage credit packages
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'credit_packages' 
        AND policyname = 'Service role can manage credit packages'
    ) THEN
        CREATE POLICY "Service role can manage credit packages"
          ON credit_packages
          FOR ALL
          TO service_role
          USING (true);
        RAISE NOTICE 'Created service role policy for credit_packages';
    ELSE
        RAISE NOTICE 'Service role policy for credit_packages already exists';
    END IF;
END $$;

-- STEP 7: Grant permissions on credit_packages
GRANT SELECT ON credit_packages TO authenticated;

-- STEP 8: Insert credit packages with tiered pricing (only if table is empty)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM credit_packages LIMIT 1) THEN
        INSERT INTO credit_packages (name, credits, price_usd_cents, credits_per_dollar, is_popular, description) VALUES
        ('Starter', 500, 999, 50.05, false, 'Perfect for testing and small businesses'),
        ('Business', 1000, 1799, 55.58, true, 'Most popular choice for growing teams'),
        ('Professional', 2500, 3999, 62.52, false, 'Great value for active businesses'),
        ('Scale', 5000, 6999, 71.44, false, 'High volume usage with better rates'),
        ('Enterprise', 10000, 11999, 83.34, false, 'Best rate for enterprise customers'),
        ('Enterprise+', 25000, 24999, 100.00, false, 'Maximum value for large organizations');
        RAISE NOTICE 'Inserted 6 credit packages';
    ELSE
        RAISE NOTICE 'Credit packages already exist, skipping insert';
    END IF;
END $$;

-- STEP 9: Update email_send description to remove Resend branding
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE pricing_config 
    SET description = 'Credits per email sent' 
    WHERE service_type = 'email_send' AND description LIKE '%Resend%';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    IF updated_count > 0 THEN
        RAISE NOTICE 'Updated % email pricing descriptions to remove branding', updated_count;
    ELSE
        RAISE NOTICE 'No email pricing descriptions needed updating';
    END IF;
END $$;

-- STEP 10: Verify the migration
DO $$
BEGIN
    RAISE NOTICE '================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '================================';
    RAISE NOTICE 'WhatsApp Send: % credits', 
        (SELECT credits_per_unit FROM pricing_config WHERE service_type = 'whatsapp_send');
    RAISE NOTICE 'WhatsApp Receive: % credits', 
        (SELECT credits_per_unit FROM pricing_config WHERE service_type = 'whatsapp_receive');
    RAISE NOTICE 'Active Credit Packages: %', 
        (SELECT COUNT(*) FROM credit_packages WHERE is_active = true);
    RAISE NOTICE 'Price Range: $%.2f - $%.2f', 
        (SELECT MIN(price_usd_cents::decimal/100) FROM credit_packages),
        (SELECT MAX(price_usd_cents::decimal/100) FROM credit_packages);
    RAISE NOTICE '================================';
END $$; 