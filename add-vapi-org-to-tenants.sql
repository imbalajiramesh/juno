-- Add Vapi organization integration to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS vapi_org_id TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tenants_vapi_org ON tenants(vapi_org_id);

-- Add comment for documentation
COMMENT ON COLUMN tenants.vapi_org_id IS 'External Vapi organization ID for voice agent management'; 