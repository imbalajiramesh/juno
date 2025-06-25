-- Add Twilio subaccount SID to tenants table
-- This allows each tenant to have their own Twilio subaccount for complete isolation

ALTER TABLE tenants 
ADD COLUMN twilio_subaccount_sid TEXT;

-- Add index for performance
CREATE INDEX idx_tenants_twilio_subaccount_sid ON tenants(twilio_subaccount_sid);

-- Update comment
COMMENT ON COLUMN tenants.twilio_subaccount_sid IS 'Twilio subaccount SID for tenant isolation'; 