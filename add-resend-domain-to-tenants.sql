-- Add Resend domain integration to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS resend_domain_id TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tenants_resend_domain ON tenants(resend_domain_id);

-- Add comment for documentation
COMMENT ON COLUMN tenants.resend_domain_id IS 'External Resend domain ID for email integration'; 