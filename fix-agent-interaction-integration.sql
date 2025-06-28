-- =====================================================================
-- AGENT INTERACTION INTEGRATION FIX
-- =====================================================================
-- This migration fixes the disconnected interaction systems and adds
-- agent interaction data to customer import/export functionality

-- Step 1: Add agent interaction summary columns to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS last_agent_call_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_agent_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_agent_emails INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_agent_sms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_agent_interaction_type TEXT,
ADD COLUMN IF NOT EXISTS last_agent_interaction_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS agent_call_duration_total INTEGER DEFAULT 0; -- in minutes

-- Step 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_last_agent_call ON customers(last_agent_call_date);
CREATE INDEX IF NOT EXISTS idx_customers_last_agent_interaction ON customers(last_agent_interaction_date);

-- Step 3: Create function to sync agent interactions to general interactions table
CREATE OR REPLACE FUNCTION sync_agent_interaction_to_general(
    p_customer_id UUID,
    p_interaction_type TEXT,
    p_details TEXT,
    p_interaction_date TIMESTAMPTZ,
    p_tenant_id TEXT
) RETURNS VOID AS $$
BEGIN
    -- Insert into general interactions table
    INSERT INTO interactions (
        id,
        customer_id,
        interaction_type,
        details,
        interaction_date,
        tenant_id,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        p_customer_id,
        p_interaction_type::interaction_type,
        p_details,
        p_interaction_date,
        p_tenant_id,
        NOW(),
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create function to update customer agent interaction summary
CREATE OR REPLACE FUNCTION update_customer_agent_summary(
    p_customer_id UUID,
    p_tenant_id TEXT
) RETURNS VOID AS $$
DECLARE
    v_call_count INTEGER;
    v_email_count INTEGER;
    v_sms_count INTEGER;
    v_last_call_date TIMESTAMPTZ;
    v_last_interaction_date TIMESTAMPTZ;
    v_last_interaction_type TEXT;
    v_total_call_duration INTEGER;
BEGIN
    -- Get call statistics
    SELECT 
        COUNT(*),
        MAX(created_at),
        COALESCE(SUM(duration_minutes), 0)
    INTO v_call_count, v_last_call_date, v_total_call_duration
    FROM alex_call_logs 
    WHERE customer_id = p_customer_id AND tenant_id = p_tenant_id;

    -- Get email statistics
    SELECT COUNT(*)
    INTO v_email_count
    FROM alex_email_logs 
    WHERE customer_id = p_customer_id AND tenant_id = p_tenant_id;

    -- Get SMS statistics
    SELECT COUNT(*)
    INTO v_sms_count
    FROM alex_sms_logs 
    WHERE customer_id = p_customer_id AND tenant_id = p_tenant_id;

    -- Determine last interaction
    SELECT interaction_type, interaction_date
    INTO v_last_interaction_type, v_last_interaction_date
    FROM (
        SELECT 'call' as interaction_type, created_at as interaction_date
        FROM alex_call_logs 
        WHERE customer_id = p_customer_id AND tenant_id = p_tenant_id
        UNION ALL
        SELECT 'email' as interaction_type, created_at as interaction_date
        FROM alex_email_logs 
        WHERE customer_id = p_customer_id AND tenant_id = p_tenant_id
        UNION ALL
        SELECT 'sms' as interaction_type, created_at as interaction_date
        FROM alex_sms_logs 
        WHERE customer_id = p_customer_id AND tenant_id = p_tenant_id
    ) latest_interactions
    ORDER BY interaction_date DESC
    LIMIT 1;

    -- Update customer summary
    UPDATE customers 
    SET 
        last_agent_call_date = v_last_call_date,
        total_agent_calls = v_call_count,
        total_agent_emails = v_email_count,
        total_agent_sms = v_sms_count,
        last_agent_interaction_type = v_last_interaction_type,
        last_agent_interaction_date = v_last_interaction_date,
        agent_call_duration_total = v_total_call_duration,
        updated_at = NOW()
    WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create triggers to automatically sync agent interactions

-- Trigger for alex_call_logs
CREATE OR REPLACE FUNCTION trigger_sync_call_to_interactions()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync to general interactions
    PERFORM sync_agent_interaction_to_general(
        NEW.customer_id,
        'call',
        COALESCE(NEW.call_summary, 'Voice agent call'),
        NEW.created_at,
        NEW.tenant_id
    );
    
    -- Update customer summary
    PERFORM update_customer_agent_summary(NEW.customer_id, NEW.tenant_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for alex_email_logs
CREATE OR REPLACE FUNCTION trigger_sync_email_to_interactions()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync to general interactions
    PERFORM sync_agent_interaction_to_general(
        NEW.customer_id,
        'email',
        COALESCE(NEW.email_subject, 'Agent email sent'),
        NEW.created_at,
        NEW.tenant_id
    );
    
    -- Update customer summary
    PERFORM update_customer_agent_summary(NEW.customer_id, NEW.tenant_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for alex_sms_logs
CREATE OR REPLACE FUNCTION trigger_sync_sms_to_interactions()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync to general interactions
    PERFORM sync_agent_interaction_to_general(
        NEW.customer_id,
        'sms',
        COALESCE(NEW.sms_summary, 'Agent SMS sent'),
        NEW.created_at,
        NEW.tenant_id
    );
    
    -- Update customer summary
    PERFORM update_customer_agent_summary(NEW.customer_id, NEW.tenant_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the triggers
DROP TRIGGER IF EXISTS trigger_alex_call_logs_sync ON alex_call_logs;
CREATE TRIGGER trigger_alex_call_logs_sync
    AFTER INSERT OR UPDATE ON alex_call_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_call_to_interactions();

DROP TRIGGER IF EXISTS trigger_alex_email_logs_sync ON alex_email_logs;
CREATE TRIGGER trigger_alex_email_logs_sync
    AFTER INSERT OR UPDATE ON alex_email_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_email_to_interactions();

DROP TRIGGER IF EXISTS trigger_alex_sms_logs_sync ON alex_sms_logs;
CREATE TRIGGER trigger_alex_sms_logs_sync
    AFTER INSERT OR UPDATE ON alex_sms_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_sms_to_interactions();

-- Step 6: Backfill existing data
DO $$
DECLARE
    customer_record RECORD;
BEGIN
    -- Update summary for all existing customers
    FOR customer_record IN 
        SELECT DISTINCT customer_id, tenant_id 
        FROM alex_call_logs 
        WHERE customer_id IS NOT NULL
        UNION
        SELECT DISTINCT customer_id, tenant_id 
        FROM alex_email_logs 
        WHERE customer_id IS NOT NULL
        UNION
        SELECT DISTINCT customer_id, tenant_id 
        FROM alex_sms_logs 
        WHERE customer_id IS NOT NULL
    LOOP
        PERFORM update_customer_agent_summary(
            customer_record.customer_id, 
            customer_record.tenant_id
        );
    END LOOP;
END;
$$;

-- Step 7: Create view for comprehensive customer interaction data
CREATE OR REPLACE VIEW customer_interaction_summary AS
SELECT 
    c.id,
    c.first_name,
    c.last_name,
    c.email,
    c.phone_number,
    c.status,
    c.tenant_id,
    
    -- Agent interaction summary
    c.total_agent_calls,
    c.total_agent_emails,
    c.total_agent_sms,
    c.agent_call_duration_total,
    c.last_agent_call_date,
    c.last_agent_interaction_type,
    c.last_agent_interaction_date,
    
    -- General interaction counts
    (SELECT COUNT(*) FROM interactions WHERE customer_id = c.id) as total_interactions,
    (SELECT MAX(interaction_date) FROM interactions WHERE customer_id = c.id) as last_interaction_date,
    
    -- Recent agent interactions
    (SELECT call_summary FROM alex_call_logs WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1) as last_call_summary,
    (SELECT email_subject FROM alex_email_logs WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1) as last_email_subject,
    (SELECT sms_content FROM alex_sms_logs WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1) as last_sms_content
    
FROM customers c;

-- Step 8: Grant permissions
GRANT SELECT ON customer_interaction_summary TO authenticated;
GRANT EXECUTE ON FUNCTION sync_agent_interaction_to_general TO authenticated;
GRANT EXECUTE ON FUNCTION update_customer_agent_summary TO authenticated;

-- Step 9: Comments for documentation
COMMENT ON COLUMN customers.last_agent_call_date IS 'Date of the most recent voice agent call';
COMMENT ON COLUMN customers.total_agent_calls IS 'Total number of voice agent calls received';
COMMENT ON COLUMN customers.total_agent_emails IS 'Total number of agent emails sent';
COMMENT ON COLUMN customers.total_agent_sms IS 'Total number of agent SMS sent';
COMMENT ON COLUMN customers.last_agent_interaction_type IS 'Type of last agent interaction (call/email/sms)';
COMMENT ON COLUMN customers.last_agent_interaction_date IS 'Date of last agent interaction';
COMMENT ON COLUMN customers.agent_call_duration_total IS 'Total minutes of agent calls';

COMMENT ON FUNCTION sync_agent_interaction_to_general IS 'Syncs agent interactions to general interactions table';
COMMENT ON FUNCTION update_customer_agent_summary IS 'Updates customer agent interaction summary fields';
COMMENT ON VIEW customer_interaction_summary IS 'Comprehensive view of customer interaction data including agent interactions';

-- Step 10: Create function to refresh customer interaction summary
CREATE OR REPLACE FUNCTION refresh_all_customer_summaries()
RETURNS INTEGER AS $$
DECLARE
    customer_record RECORD;
    updated_count INTEGER := 0;
BEGIN
    FOR customer_record IN 
        SELECT id, tenant_id FROM customers
    LOOP
        PERFORM update_customer_agent_summary(
            customer_record.id, 
            customer_record.tenant_id
        );
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_all_customer_summaries IS 'Refreshes agent interaction summary for all customers';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Agent interaction integration fix completed successfully!';
    RAISE NOTICE 'Added agent interaction summary columns to customers table';
    RAISE NOTICE 'Created automatic syncing between agent logs and general interactions';
    RAISE NOTICE 'Backfilled existing customer data';
    RAISE NOTICE 'Created comprehensive customer_interaction_summary view';
END;
$$; 