-- Customer Status System Migration (Corrected)
-- Based on actual database analysis
-- Works with: TEXT tenant_id, Supabase auth, existing get_current_tenant_id() function

-- Create customer_status_definitions table with correct types
CREATE TABLE IF NOT EXISTS customer_status_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,  -- TEXT to match tenants.id
    name TEXT NOT NULL,
    label TEXT NOT NULL,
    color TEXT DEFAULT '#6b7280',
    is_default BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_status_definitions_tenant_id ON customer_status_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_status_definitions_display_order ON customer_status_definitions(tenant_id, display_order);

-- Enable RLS on customer_status_definitions table
ALTER TABLE customer_status_definitions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy using existing get_current_tenant_id() function
CREATE POLICY customer_status_definitions_tenant_policy ON customer_status_definitions
    FOR ALL
    USING (tenant_id = get_current_tenant_id());

-- Create default status definitions for existing tenants
INSERT INTO customer_status_definitions (tenant_id, name, label, color, is_default, display_order)
SELECT 
    t.id as tenant_id,
    s.name,
    s.label,
    s.color,
    s.is_default,
    s.display_order
FROM tenants t
CROSS JOIN (
    VALUES 
        ('new', 'New', '#3b82f6', true, 0),
        ('contacted', 'Contacted', '#f59e0b', false, 1),
        ('qualified', 'Qualified', '#8b5cf6', false, 2),
        ('proposal', 'Proposal', '#06b6d4', false, 3),
        ('closed_won', 'Closed Won', '#10b981', false, 4),
        ('closed_lost', 'Closed Lost', '#ef4444', false, 5)
) s(name, label, color, is_default, display_order)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- The customers table already has status as TEXT and tenant_id as TEXT, so no changes needed
-- Just update any existing status values to ensure consistency

-- Update existing customer statuses to use the new standardized values
UPDATE customers 
SET status = CASE 
    WHEN status IN ('Active', 'active') THEN 'new'
    WHEN status IN ('Inactive', 'inactive') THEN 'closed_lost'
    WHEN status IN ('contacted', 'Contacted') THEN 'contacted'
    WHEN status IN ('qualified', 'Qualified') THEN 'qualified'
    WHEN status IN ('proposal', 'Proposal') THEN 'proposal'
    WHEN status IN ('closed_won', 'Closed Won', 'won') THEN 'closed_won'
    WHEN status IN ('closed_lost', 'Closed Lost', 'lost') THEN 'closed_lost'
    ELSE COALESCE(LOWER(TRIM(status)), 'new')
END
WHERE status IS NOT NULL;

-- Set default status for customers without status
UPDATE customers 
SET status = 'new' 
WHERE status IS NULL OR status = '';

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_customer_status_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_customer_status_definitions_updated_at_trigger ON customer_status_definitions;
CREATE TRIGGER update_customer_status_definitions_updated_at_trigger
    BEFORE UPDATE ON customer_status_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_status_definitions_updated_at();

-- Add constraint to ensure only one default status per tenant
CREATE OR REPLACE FUNCTION check_single_default_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        -- Set all other statuses for this tenant to non-default
        UPDATE customer_status_definitions 
        SET is_default = FALSE 
        WHERE tenant_id = NEW.tenant_id 
        AND id != NEW.id 
        AND is_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_single_default_status_trigger ON customer_status_definitions;
CREATE TRIGGER check_single_default_status_trigger
    BEFORE INSERT OR UPDATE ON customer_status_definitions
    FOR EACH ROW
    EXECUTE FUNCTION check_single_default_status();

-- Grant necessary permissions (following the existing pattern)
GRANT ALL ON customer_status_definitions TO authenticated;
GRANT ALL ON customer_status_definitions TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Create helpful comments
COMMENT ON TABLE customer_status_definitions IS 'Tenant-specific customer status definitions for customizable CRM workflows';
COMMENT ON COLUMN customer_status_definitions.tenant_id IS 'References tenants.id (TEXT type)';
COMMENT ON COLUMN customer_status_definitions.name IS 'Unique identifier for the status (used in code)';
COMMENT ON COLUMN customer_status_definitions.label IS 'Human-readable label for the status';
COMMENT ON COLUMN customer_status_definitions.color IS 'Hex color code for UI display';
COMMENT ON COLUMN customer_status_definitions.is_default IS 'Whether this is the default status for new customers';
COMMENT ON COLUMN customer_status_definitions.display_order IS 'Order for displaying statuses in UI';

-- Verify the creation and show summary
SELECT 
    'customer_status_definitions table created successfully!' as result,
    COUNT(*) as total_statuses_created
FROM customer_status_definitions;

-- Show sample data to verify
SELECT 
    'Sample status data:' as info,
    tenant_id,
    name,
    label,
    is_default
FROM customer_status_definitions 
WHERE tenant_id = (SELECT id FROM tenants LIMIT 1)
ORDER BY display_order;

-- Final success message
SELECT 'Customer status system migration completed successfully with correct types and functions!' as final_result; 