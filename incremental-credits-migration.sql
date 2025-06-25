-- Incremental Credits System Migration
-- This adds WhatsApp support and credit packages to existing credits system

-- Add WhatsApp service types to pricing_config (if not already exists)
DO $$ 
BEGIN
    -- Add whatsapp_send if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pricing_config WHERE service_type = 'whatsapp_send') THEN
        INSERT INTO pricing_config (service_type, credits_per_unit, description) 
        VALUES ('whatsapp_send', 3, 'Credits per WhatsApp message sent');
    END IF;
    
    -- Add whatsapp_receive if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pricing_config WHERE service_type = 'whatsapp_receive') THEN
        INSERT INTO pricing_config (service_type, credits_per_unit, description) 
        VALUES ('whatsapp_receive', 1, 'Credits per WhatsApp message received');
    END IF;
END $$;

-- Update transaction_type check constraint to include whatsapp_charge
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
END $$;

-- Update pricing_config service_type check constraint to include whatsapp types
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
END $$;

-- Create credit_packages table if it doesn't exist
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

-- Enable RLS on credit_packages if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE c.relname = 'credit_packages' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Create credit packages policies if they don't exist
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
    END IF;
END $$;

-- Grant permissions on credit_packages
GRANT SELECT ON credit_packages TO authenticated;

-- Insert credit packages with tiered pricing (only if table is empty)
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
    END IF;
END $$;

-- Update email_send description to remove Resend branding
UPDATE pricing_config 
SET description = 'Credits per email sent' 
WHERE service_type = 'email_send' AND description = 'Credits per email sent via Resend';

-- Verify the migration
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'WhatsApp pricing: % credits for send, % credits for receive', 
        (SELECT credits_per_unit FROM pricing_config WHERE service_type = 'whatsapp_send'),
        (SELECT credits_per_unit FROM pricing_config WHERE service_type = 'whatsapp_receive');
    RAISE NOTICE 'Credit packages: % packages available', 
        (SELECT COUNT(*) FROM credit_packages WHERE is_active = true);
END $$; 