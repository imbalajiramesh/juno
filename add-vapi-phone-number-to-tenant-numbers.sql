-- Add VAPI phone number ID to tenant phone numbers table
-- This enables automatic VAPI integration when phone numbers are purchased

ALTER TABLE tenant_phone_numbers 
ADD COLUMN IF NOT EXISTS vapi_phone_number_id TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tenant_phone_numbers_vapi_id ON tenant_phone_numbers(vapi_phone_number_id);

-- Add comment for documentation
COMMENT ON COLUMN tenant_phone_numbers.vapi_phone_number_id IS 'VAPI phone number ID for voice agent integration';

-- Update existing phone numbers to note they need manual VAPI configuration
-- (Only run this if you have existing phone numbers that need migration)
UPDATE tenant_phone_numbers 
SET vapi_phone_number_id = NULL 
WHERE vapi_phone_number_id IS NULL; 