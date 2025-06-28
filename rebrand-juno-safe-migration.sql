-- ===============================================================================
-- JUNO REBRANDING MIGRATION - SAFE VERSION
-- ===============================================================================
-- This migration works with the current database structure
-- No copying from old columns since they don't exist yet
-- ===============================================================================

-- Step 1: Add new "juno" columns to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS last_juno_call_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_juno_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_juno_emails INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_juno_sms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_juno_interaction_type TEXT,
ADD COLUMN IF NOT EXISTS last_juno_interaction_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS juno_call_duration_total INTEGER DEFAULT 0;

-- Step 2: Safely rename alex_* tables to juno_* (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alex_call_logs') THEN
        ALTER TABLE alex_call_logs RENAME TO juno_call_logs;
        RAISE NOTICE 'Renamed alex_call_logs to juno_call_logs';
    ELSE
        RAISE NOTICE 'alex_call_logs table does not exist, skipping rename';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alex_email_logs') THEN
        ALTER TABLE alex_email_logs RENAME TO juno_email_logs;
        RAISE NOTICE 'Renamed alex_email_logs to juno_email_logs';
    ELSE
        RAISE NOTICE 'alex_email_logs table does not exist, skipping rename';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alex_sms_logs') THEN
        ALTER TABLE alex_sms_logs RENAME TO juno_sms_logs;
        RAISE NOTICE 'Renamed alex_sms_logs to juno_sms_logs';
    ELSE
        RAISE NOTICE 'alex_sms_logs table does not exist, skipping rename';
    END IF;
END $$;

-- Step 3: Add conversation summary columns (only if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'juno_call_logs') THEN
        ALTER TABLE juno_call_logs 
        ADD COLUMN IF NOT EXISTS conversation_summary TEXT,
        ADD COLUMN IF NOT EXISTS call_sentiment TEXT CHECK (call_sentiment IN ('positive', 'neutral', 'negative')),
        ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS call_outcome TEXT;
        RAISE NOTICE 'Added summary columns to juno_call_logs';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'juno_email_logs') THEN
        ALTER TABLE juno_email_logs
        ADD COLUMN IF NOT EXISTS conversation_summary TEXT,
        ADD COLUMN IF NOT EXISTS email_sentiment TEXT CHECK (email_sentiment IN ('positive', 'neutral', 'negative')),
        ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added summary columns to juno_email_logs';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'juno_sms_logs') THEN
        ALTER TABLE juno_sms_logs
        ADD COLUMN IF NOT EXISTS conversation_summary TEXT,
        ADD COLUMN IF NOT EXISTS sms_sentiment TEXT CHECK (sms_sentiment IN ('positive', 'neutral', 'negative')),
        ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added summary columns to juno_sms_logs';
    END IF;
END $$;

-- Step 4: Create conversation summary function
CREATE OR REPLACE FUNCTION generate_juno_conversation_summary(
    interaction_type TEXT,
    content TEXT,
    transcript TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    summary_result JSONB;
    sentiment TEXT := 'neutral';
    follow_up BOOLEAN := FALSE;
    outcome TEXT;
BEGIN
    -- Sentiment analysis
    IF content ~* '(great|excellent|wonderful|happy|satisfied|love|perfect|amazing)' THEN
        sentiment := 'positive';
    ELSIF content ~* '(problem|issue|frustrated|angry|disappointed|terrible|awful|hate)' THEN
        sentiment := 'negative';
    END IF;
    
    -- Follow-up detection
    IF content ~* '(call back|follow up|schedule|appointment|more information|questions|concerns)' THEN
        follow_up := TRUE;
    END IF;
    
    -- Call outcome detection
    IF interaction_type = 'call' THEN
        IF content ~* '(interested|qualified|ready|purchase|buy|sign up)' THEN
            outcome := 'qualified';
        ELSIF content ~* '(not interested|too expensive|already have|no thanks)' THEN
            outcome := 'not_qualified';
        ELSIF content ~* '(think about|call back|more time|decision)' THEN
            outcome := 'follow_up_needed';
        ELSE
            outcome := 'information_provided';
        END IF;
    END IF;
    
    summary_result := jsonb_build_object(
        'sentiment', sentiment,
        'follow_up_required', follow_up,
        'outcome', outcome,
        'generated_at', NOW(),
        'summary_text', CASE 
            WHEN length(content) > 200 THEN 
                left(content, 200) || '...'
            ELSE 
                content
        END
    );
    
    RETURN summary_result;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create customer summary update function
CREATE OR REPLACE FUNCTION update_customer_juno_summary(
    p_customer_id TEXT,
    p_tenant_id TEXT
) RETURNS VOID AS $$
DECLARE
    v_call_count INTEGER := 0;
    v_email_count INTEGER := 0;
    v_sms_count INTEGER := 0;
    v_last_call_date TIMESTAMPTZ;
    v_last_interaction_date TIMESTAMPTZ;
    v_last_interaction_type TEXT;
    v_total_call_duration INTEGER := 0;
BEGIN
    -- Get statistics only if tables exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'juno_call_logs') THEN
        SELECT 
            COUNT(*),
            MAX(created_at),
            COALESCE(SUM(duration_minutes), 0)
        INTO v_call_count, v_last_call_date, v_total_call_duration
        FROM juno_call_logs 
        WHERE customer_id = p_customer_id AND tenant_id = p_tenant_id;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'juno_email_logs') THEN
        SELECT COUNT(*)
        INTO v_email_count
        FROM juno_email_logs 
        WHERE customer_id = p_customer_id AND tenant_id = p_tenant_id;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'juno_sms_logs') THEN
        SELECT COUNT(*)
        INTO v_sms_count
        FROM juno_sms_logs 
        WHERE customer_id = p_customer_id AND tenant_id = p_tenant_id;
    END IF;

    -- Update customer summary
    UPDATE customers 
    SET 
        last_juno_call_date = v_last_call_date,
        total_juno_calls = v_call_count,
        total_juno_emails = v_email_count,
        total_juno_sms = v_sms_count,
        last_juno_interaction_type = v_last_interaction_type,
        last_juno_interaction_date = v_last_interaction_date,
        juno_call_duration_total = v_total_call_duration,
        updated_at = NOW()
    WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Grant permissions
GRANT EXECUTE ON FUNCTION generate_juno_conversation_summary TO authenticated;
GRANT EXECUTE ON FUNCTION update_customer_juno_summary TO authenticated;

-- Step 7: Add comments
COMMENT ON COLUMN customers.last_juno_call_date IS 'Date of the most recent Juno voice call';
COMMENT ON COLUMN customers.total_juno_calls IS 'Total number of Juno voice calls received';
COMMENT ON COLUMN customers.total_juno_emails IS 'Total number of Juno emails sent';
COMMENT ON COLUMN customers.total_juno_sms IS 'Total number of Juno SMS sent';
COMMENT ON COLUMN customers.last_juno_interaction_type IS 'Type of last Juno interaction (call/email/sms)';
COMMENT ON COLUMN customers.last_juno_interaction_date IS 'Date of last Juno interaction';
COMMENT ON COLUMN customers.juno_call_duration_total IS 'Total minutes of Juno calls';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ JUNO SAFE MIGRATION COMPLETE!';
    RAISE NOTICE 'Added Juno interaction columns to customers table';
    RAISE NOTICE 'Renamed alex_* tables to juno_* (if they existed)';
    RAISE NOTICE 'Created conversation summary functions';
    RAISE NOTICE 'Your database is ready for Juno branding!';
END $$; 