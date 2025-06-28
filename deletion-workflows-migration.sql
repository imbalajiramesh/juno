-- ===============================================
-- DELETION WORKFLOWS MIGRATION SCRIPT
-- Run this on your Supabase SQL Editor
-- ===============================================

-- 1. ADD DELETION TRACKING COLUMNS TO VOICE_AGENTS
-- ================================================

-- Add status tracking for campaigns
ALTER TABLE voice_agents 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' 
CHECK (status IN ('active', 'paused', 'deleted', 'suspended'));

-- Add monthly cost tracking for billing
ALTER TABLE voice_agents 
ADD COLUMN IF NOT EXISTS monthly_cost INTEGER DEFAULT 0;

-- Add deletion timestamp
ALTER TABLE voice_agents 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Add pause timestamp
ALTER TABLE voice_agents 
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ NULL;

-- Add resume deadline for paused campaigns
ALTER TABLE voice_agents 
ADD COLUMN IF NOT EXISTS resume_deadline TIMESTAMPTZ NULL;

-- Add Twilio campaign SID for proper cleanup
ALTER TABLE voice_agents 
ADD COLUMN IF NOT EXISTS twilio_campaign_sid VARCHAR NULL;

-- Add Twilio brand SID reference
ALTER TABLE voice_agents 
ADD COLUMN IF NOT EXISTS twilio_brand_sid VARCHAR NULL;

-- 2. ADD DELETION TRACKING COLUMNS TO TENANTS
-- ============================================

-- Add status tracking for organizations
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' 
CHECK (status IN ('active', 'pending', 'suspended', 'deleted'));

-- Add deletion timestamp
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- 3. UPDATE CREDIT_TRANSACTIONS FOR DELETION EVENTS
-- ==================================================

-- The credit_transactions table should already exist, but we'll ensure
-- it supports the new transaction types we need for deletion workflows

-- Check if transaction_type column exists and add new constraint
DO $$
BEGIN
    -- Update the check constraint to include our new transaction types
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'credit_transactions' 
        AND column_name = 'transaction_type'
    ) THEN
        -- Drop existing constraint if it exists
        ALTER TABLE credit_transactions 
        DROP CONSTRAINT IF EXISTS credit_transactions_transaction_type_check;
        
        -- Add new constraint with deletion event types
        ALTER TABLE credit_transactions 
        ADD CONSTRAINT credit_transactions_transaction_type_check 
        CHECK (transaction_type IN (
            'purchase', 'usage', 'refund', 'bonus', 'adjustment',
            'campaign_deletion', 'campaign_suspension', 'campaign_reactivation',
            'org_deletion_savings', 'monthly_campaign_fee', 'brand_registration_fee'
        ));
    END IF;
END $$;

-- 4. CREATE INDEXES FOR PERFORMANCE
-- =================================

-- Index for finding active campaigns
CREATE INDEX IF NOT EXISTS idx_voice_agents_status 
ON voice_agents(status) WHERE status IN ('active', 'paused');

-- Index for finding paused campaigns that need cleanup
CREATE INDEX IF NOT EXISTS idx_voice_agents_resume_deadline 
ON voice_agents(resume_deadline) WHERE resume_deadline IS NOT NULL;

-- Index for finding deleted campaigns
CREATE INDEX IF NOT EXISTS idx_voice_agents_deleted_at 
ON voice_agents(deleted_at) WHERE deleted_at IS NOT NULL;

-- Index for organization status
CREATE INDEX IF NOT EXISTS idx_tenants_status 
ON tenants(status) WHERE status != 'active';

-- Index for billing-related queries
CREATE INDEX IF NOT EXISTS idx_voice_agents_monthly_cost 
ON voice_agents(monthly_cost) WHERE monthly_cost > 0;

-- 5. UPDATE EXISTING DATA
-- =======================

-- Set default status for existing voice_agents
UPDATE voice_agents 
SET status = 'active' 
WHERE status IS NULL;

-- Set default status for existing tenants
UPDATE tenants 
SET status = 'active' 
WHERE status IS NULL;

-- 6. CREATE HELPER FUNCTIONS
-- ===========================

-- Function to automatically clean up expired paused campaigns
CREATE OR REPLACE FUNCTION cleanup_expired_paused_campaigns()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER := 0;
BEGIN
    -- Mark expired paused campaigns as deleted
    UPDATE voice_agents 
    SET 
        status = 'deleted',
        deleted_at = NOW(),
        monthly_cost = 0
    WHERE 
        status = 'paused' 
        AND resume_deadline < NOW()
        AND resume_deadline IS NOT NULL;
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    
    -- Log the cleanup
    INSERT INTO credit_transactions (
        tenant_id,
        transaction_type,
        amount,
        description,
        created_by
    )
    SELECT 
        tenant_id,
        'campaign_deletion',
        0,
        'Auto-deleted expired paused campaign: ' || name,
        'system'
    FROM voice_agents 
    WHERE 
        status = 'deleted' 
        AND deleted_at >= NOW() - INTERVAL '1 minute';
    
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate organization monthly costs
CREATE OR REPLACE FUNCTION get_organization_monthly_cost(org_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_cost INTEGER := 0;
BEGIN
    SELECT COALESCE(SUM(monthly_cost), 0)
    INTO total_cost
    FROM voice_agents 
    WHERE tenant_id = org_id 
    AND status = 'active';
    
    RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- 7. CREATE RLS POLICIES (if RLS is enabled)
-- ===========================================

-- Allow users to view their organization's campaign statuses
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'voice_agents' 
        AND rowsecurity = true
    ) THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view campaign status" ON voice_agents;
        DROP POLICY IF EXISTS "Users can delete own campaigns" ON voice_agents;
        
        -- Policy for viewing campaign deletion status
        CREATE POLICY "Users can view campaign status"
        ON voice_agents FOR SELECT
        USING (
            tenant_id IN (
                SELECT tenant_id FROM user_accounts 
                WHERE auth_id = auth.uid()::text
            )
        );
        
        -- Policy for deleting/pausing campaigns
        CREATE POLICY "Users can delete own campaigns"
        ON voice_agents FOR UPDATE
        USING (
            tenant_id IN (
                SELECT tenant_id FROM user_accounts 
                WHERE auth_id = auth.uid()::text
            )
        );
    END IF;
END $$;

-- 8. CREATE TRIGGER FOR AUTOMATIC BILLING UPDATES
-- ================================================

-- Function to update billing when campaign status changes
CREATE OR REPLACE FUNCTION handle_campaign_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- If campaign is being deleted or paused, stop billing
    IF NEW.status IN ('deleted', 'paused') AND OLD.status = 'active' THEN
        NEW.monthly_cost = 0;
        
        -- Log the billing change
        INSERT INTO credit_transactions (
            tenant_id,
            transaction_type,
            amount,
            description,
            created_by
        ) VALUES (
            NEW.tenant_id,
            CASE 
                WHEN NEW.status = 'deleted' THEN 'campaign_deletion'
                WHEN NEW.status = 'paused' THEN 'campaign_suspension'
            END,
            0,
            'Campaign ' || NEW.name || ' ' || NEW.status || ' - billing stopped',
            'system'
        );
    END IF;
    
    -- If campaign is being reactivated, restore billing
    IF NEW.status = 'active' AND OLD.status = 'paused' THEN
        -- Note: monthly_cost should be set by the application
        INSERT INTO credit_transactions (
            tenant_id,
            transaction_type,
            amount,
            description,
            created_by
        ) VALUES (
            NEW.tenant_id,
            'campaign_reactivation',
            0,
            'Campaign ' || NEW.name || ' reactivated - billing resumed',
            'system'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_campaign_status_change ON voice_agents;
CREATE TRIGGER trigger_campaign_status_change
    BEFORE UPDATE ON voice_agents
    FOR EACH ROW
    EXECUTE FUNCTION handle_campaign_status_change();

-- 9. ADD COMMENTS FOR DOCUMENTATION
-- ==================================

COMMENT ON COLUMN voice_agents.status IS 'Campaign status: active, paused, deleted, suspended';
COMMENT ON COLUMN voice_agents.monthly_cost IS 'Monthly cost in credits for this campaign';
COMMENT ON COLUMN voice_agents.deleted_at IS 'Timestamp when campaign was deleted';
COMMENT ON COLUMN voice_agents.paused_at IS 'Timestamp when campaign was paused';
COMMENT ON COLUMN voice_agents.resume_deadline IS 'Deadline to resume paused campaign before auto-deletion';
COMMENT ON COLUMN voice_agents.twilio_campaign_sid IS 'Twilio 10DLC campaign SID for cleanup';
COMMENT ON COLUMN voice_agents.twilio_brand_sid IS 'Twilio brand registration SID';

COMMENT ON COLUMN tenants.status IS 'Organization status: active, pending, suspended, deleted';
COMMENT ON COLUMN tenants.deleted_at IS 'Timestamp when organization was deleted';

-- 10. VERIFICATION QUERIES
-- =========================

-- Run these to verify the migration worked correctly:

-- Check voice_agents table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'voice_agents' 
AND column_name IN ('status', 'monthly_cost', 'deleted_at', 'paused_at', 'resume_deadline', 'twilio_campaign_sid', 'twilio_brand_sid')
ORDER BY column_name;

-- Check tenants table structure  
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'tenants' 
AND column_name IN ('status', 'deleted_at')
ORDER BY column_name;

-- Check indexes were created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('voice_agents', 'tenants') 
AND indexname LIKE 'idx_%'
ORDER BY indexname;

-- Check functions were created
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN ('cleanup_expired_paused_campaigns', 'get_organization_monthly_cost', 'handle_campaign_status_change')
ORDER BY routine_name;

-- ===============================================
-- MIGRATION COMPLETE
-- ===============================================

-- Summary of changes:
-- ✅ Added status tracking to voice_agents and tenants
-- ✅ Added monthly_cost tracking for billing
-- ✅ Added deletion and pause timestamps
-- ✅ Added Twilio SID references for cleanup
-- ✅ Updated credit_transactions constraints
-- ✅ Created performance indexes
-- ✅ Added helper functions for maintenance
-- ✅ Created automatic billing triggers
-- ✅ Added RLS policies (if enabled)
-- ✅ Added documentation comments

-- Next steps:
-- 1. Test the deletion workflow UI components
-- 2. Implement the campaign deletion API endpoints
-- 3. Set up cron job to run cleanup_expired_paused_campaigns() daily
-- 4. Configure Twilio API for campaign cancellation
-- 5. Test billing integration with actual campaigns 