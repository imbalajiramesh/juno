-- ===============================================================================
-- COMPREHENSIVE JUNO REBRANDING & CONVERSATION SUMMARY ENHANCEMENT
-- ===============================================================================
-- This migration:
-- 1. Renames all alex_* tables to juno_*
-- 2. Updates all "agent" column references to "juno"  
-- 3. Adds automatic conversation summary generation
-- 4. Maintains all data and relationships
-- 5. Updates triggers, functions, and views
-- ===============================================================================

-- Step 1: Add new "juno" columns to customers table first
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS last_juno_call_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_juno_calls INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_juno_emails INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_juno_sms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_juno_interaction_type TEXT,
ADD COLUMN IF NOT EXISTS last_juno_interaction_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS juno_call_duration_total INTEGER DEFAULT 0;

-- Step 2: Copy data from old "agent" columns to new "juno" columns
UPDATE customers SET
    last_juno_call_date = last_agent_call_date,
    total_juno_calls = total_agent_calls,
    total_juno_emails = total_agent_emails,
    total_juno_sms = total_agent_sms,
    last_juno_interaction_type = last_agent_interaction_type,
    last_juno_interaction_date = last_agent_interaction_date,
    juno_call_duration_total = agent_call_duration_total
WHERE 
    last_agent_call_date IS NOT NULL OR
    total_agent_calls > 0 OR
    total_agent_emails > 0 OR
    total_agent_sms > 0 OR
    last_agent_interaction_type IS NOT NULL OR
    last_agent_interaction_date IS NOT NULL OR
    agent_call_duration_total > 0;

-- Step 3: Rename tables alex_* to juno_*
-- Note: This will automatically update foreign key references

-- Rename alex_call_logs to juno_call_logs
ALTER TABLE alex_call_logs RENAME TO juno_call_logs;

-- Rename alex_email_logs to juno_email_logs  
ALTER TABLE alex_email_logs RENAME TO juno_email_logs;

-- Rename alex_sms_logs to juno_sms_logs
ALTER TABLE alex_sms_logs RENAME TO juno_sms_logs;

-- Step 4: Update all indexes to use new table names
-- Call logs indexes
DROP INDEX IF EXISTS idx_alex_call_logs_tenant_id;
DROP INDEX IF EXISTS idx_call_logs_customer;
DROP INDEX IF EXISTS idx_alex_call_logs_twilio_call_sid;
DROP INDEX IF EXISTS idx_call_logs_vapi_id;
DROP INDEX IF EXISTS idx_call_logs_voice_agent;

CREATE INDEX idx_juno_call_logs_tenant_id ON juno_call_logs(tenant_id);
CREATE INDEX idx_juno_call_logs_customer ON juno_call_logs(customer_id);
CREATE INDEX idx_juno_call_logs_twilio_call_sid ON juno_call_logs(twilio_call_sid);
CREATE INDEX idx_juno_call_logs_vapi_id ON juno_call_logs(vapi_call_id);
CREATE INDEX idx_juno_call_logs_voice_agent ON juno_call_logs(voice_agent_id);

-- Email logs indexes
DROP INDEX IF EXISTS idx_alex_email_logs_tenant_id;
DROP INDEX IF EXISTS idx_email_logs_customer;

CREATE INDEX idx_juno_email_logs_tenant_id ON juno_email_logs(tenant_id);
CREATE INDEX idx_juno_email_logs_customer ON juno_email_logs(customer_id);

-- SMS logs indexes  
DROP INDEX IF EXISTS idx_alex_sms_logs_tenant_id;
DROP INDEX IF EXISTS idx_sms_logs_customer;

CREATE INDEX idx_juno_sms_logs_tenant_id ON juno_sms_logs(tenant_id);
CREATE INDEX idx_juno_sms_logs_customer ON juno_sms_logs(customer_id);

-- Step 5: Update all triggers to use new table names
DROP TRIGGER IF EXISTS update_call_logs_updated_at ON juno_call_logs;
DROP TRIGGER IF EXISTS update_email_logs_updated_at ON juno_email_logs;
DROP TRIGGER IF EXISTS update_sms_logs_updated_at ON juno_sms_logs;

CREATE TRIGGER update_juno_call_logs_updated_at
    BEFORE UPDATE ON juno_call_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_juno_email_logs_updated_at
    BEFORE UPDATE ON juno_email_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_juno_sms_logs_updated_at
    BEFORE UPDATE ON juno_sms_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Add conversation summary functionality
-- Add summary columns to all juno interaction tables
ALTER TABLE juno_call_logs 
ADD COLUMN IF NOT EXISTS conversation_summary TEXT,
ADD COLUMN IF NOT EXISTS call_sentiment TEXT CHECK (call_sentiment IN ('positive', 'neutral', 'negative')),
ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS call_outcome TEXT;

ALTER TABLE juno_email_logs
ADD COLUMN IF NOT EXISTS conversation_summary TEXT,
ADD COLUMN IF NOT EXISTS email_sentiment TEXT CHECK (email_sentiment IN ('positive', 'neutral', 'negative')),
ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT FALSE;

ALTER TABLE juno_sms_logs
ADD COLUMN IF NOT EXISTS conversation_summary TEXT,
ADD COLUMN IF NOT EXISTS sms_sentiment TEXT CHECK (sms_sentiment IN ('positive', 'neutral', 'negative')),
ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT FALSE;

-- Step 7: Create enhanced summary generation function
CREATE OR REPLACE FUNCTION generate_juno_conversation_summary(
    interaction_type TEXT,
    content TEXT,
    transcript TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    summary_result JSONB;
    word_count INTEGER;
    key_phrases TEXT[];
    sentiment TEXT := 'neutral';
    follow_up BOOLEAN := FALSE;
    outcome TEXT;
BEGIN
    -- Basic content analysis
    word_count := array_length(string_to_array(COALESCE(content, ''), ' '), 1);
    
    -- Extract key phrases (simplified approach)
    key_phrases := string_to_array(
        regexp_replace(
            COALESCE(content, ''), 
            '[^a-zA-Z\s]', '', 'g'
        ), 
        ' '
    );
    
    -- Sentiment analysis (keyword-based)
    IF content ~* '(great|excellent|wonderful|happy|satisfied|love|perfect|amazing)' THEN
        sentiment := 'positive';
    ELSIF content ~* '(problem|issue|frustrated|angry|disappointed|terrible|awful|hate)' THEN
        sentiment := 'negative';
    END IF;
    
    -- Follow-up detection
    IF content ~* '(call back|follow up|schedule|appointment|more information|questions|concerns)' THEN
        follow_up := TRUE;
    END IF;
    
    -- Call outcome detection (for calls)
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
    
    -- Generate structured summary
    summary_result := jsonb_build_object(
        'word_count', word_count,
        'sentiment', sentiment,
        'follow_up_required', follow_up,
        'outcome', outcome,
        'key_topics', key_phrases[1:5], -- First 5 words as topics
        'generated_at', NOW(),
        'summary_text', CASE 
            WHEN word_count > 50 THEN 
                left(content, 200) || '...'
            ELSE 
                content
        END
    );
    
    RETURN summary_result;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Update the customer summary function (rename from agent to juno)
CREATE OR REPLACE FUNCTION update_customer_juno_summary(
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
    FROM juno_call_logs 
    WHERE customer_id = p_customer_id AND tenant_id = p_tenant_id;

    -- Get email statistics
    SELECT COUNT(*)
    INTO v_email_count
    FROM juno_email_logs 
    WHERE customer_id = p_customer_id AND tenant_id = p_tenant_id;

    -- Get SMS statistics
    SELECT COUNT(*)
    INTO v_sms_count
    FROM juno_sms_logs 
    WHERE customer_id = p_customer_id AND tenant_id = p_tenant_id;

    -- Determine last interaction
    SELECT interaction_type, interaction_date
    INTO v_last_interaction_type, v_last_interaction_date
    FROM (
        SELECT 'call' as interaction_type, created_at as interaction_date
        FROM juno_call_logs 
        WHERE customer_id = p_customer_id AND tenant_id = p_tenant_id
        UNION ALL
        SELECT 'email' as interaction_type, created_at as interaction_date
        FROM juno_email_logs 
        WHERE customer_id = p_customer_id AND tenant_id = p_tenant_id  
        UNION ALL
        SELECT 'sms' as interaction_type, created_at as interaction_date
        FROM juno_sms_logs 
        WHERE customer_id = p_customer_id AND tenant_id = p_tenant_id
    ) latest_interactions
    ORDER BY interaction_date DESC
    LIMIT 1;

    -- Update customer summary with juno columns
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

-- Step 9: Create enhanced sync function with automatic summaries  
CREATE OR REPLACE FUNCTION sync_juno_interaction_to_general(
    p_customer_id UUID,
    p_interaction_type TEXT,
    p_details TEXT,
    p_interaction_date TIMESTAMPTZ,
    p_tenant_id TEXT,
    p_raw_content TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_summary JSONB;
BEGIN
    -- Generate automatic conversation summary
    v_summary := generate_juno_conversation_summary(
        p_interaction_type, 
        COALESCE(p_raw_content, p_details)
    );
    
    -- Insert or update general interaction record
    INSERT INTO interactions (
        customer_id,
        interaction_type,
        details,
        interaction_date,
        tenant_id,
        created_at,
        updated_at
    ) VALUES (
        p_customer_id,
        p_interaction_type::interaction_type,
        p_details || ' | Auto-Summary: ' || (v_summary->>'summary_text'),
        p_interaction_date,
        p_tenant_id,
        NOW(),
        NOW()
    )
    ON CONFLICT (customer_id, interaction_type, interaction_date) 
    DO UPDATE SET
        details = EXCLUDED.details,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create new triggers for juno tables
CREATE OR REPLACE FUNCTION trigger_sync_juno_call_to_interactions()
RETURNS TRIGGER AS $$
DECLARE
    v_summary JSONB;
BEGIN
    -- Generate automatic conversation summary
    v_summary := generate_juno_conversation_summary(
        'call', 
        COALESCE(NEW.call_transcript, NEW.call_summary, 'Voice call completed')
    );
    
    -- Update the call log with generated summary
    UPDATE juno_call_logs SET
        conversation_summary = v_summary->>'summary_text',
        call_sentiment = v_summary->>'sentiment',
        follow_up_required = (v_summary->>'follow_up_required')::boolean,
        call_outcome = v_summary->>'outcome'
    WHERE id = NEW.id;
    
    -- Sync to general interactions
    PERFORM sync_juno_interaction_to_general(
        NEW.customer_id,
        'call',
        COALESCE(NEW.call_summary, 'Juno voice call'),
        NEW.created_at,
        NEW.tenant_id,
        NEW.call_transcript
    );
    
    -- Update customer summary
    PERFORM update_customer_juno_summary(NEW.customer_id, NEW.tenant_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_sync_juno_email_to_interactions()
RETURNS TRIGGER AS $$
DECLARE
    v_summary JSONB;
BEGIN
    -- Generate automatic conversation summary
    v_summary := generate_juno_conversation_summary(
        'email', 
        COALESCE(NEW.email_body, NEW.email_subject, 'Email sent')
    );
    
    -- Update the email log with generated summary
    UPDATE juno_email_logs SET
        conversation_summary = v_summary->>'summary_text',
        email_sentiment = v_summary->>'sentiment', 
        follow_up_required = (v_summary->>'follow_up_required')::boolean
    WHERE id = NEW.id;
    
    -- Sync to general interactions
    PERFORM sync_juno_interaction_to_general(
        NEW.customer_id,
        'email',
        COALESCE(NEW.email_subject, 'Juno email sent'),
        NEW.created_at,
        NEW.tenant_id,
        NEW.email_body
    );
    
    -- Update customer summary
    PERFORM update_customer_juno_summary(NEW.customer_id, NEW.tenant_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_sync_juno_sms_to_interactions()
RETURNS TRIGGER AS $$
DECLARE
    v_summary JSONB;
BEGIN
    -- Generate automatic conversation summary
    v_summary := generate_juno_conversation_summary(
        'sms', 
        COALESCE(NEW.sms_content, 'SMS sent')
    );
    
    -- Update the SMS log with generated summary
    UPDATE juno_sms_logs SET
        conversation_summary = v_summary->>'summary_text',
        sms_sentiment = v_summary->>'sentiment',
        follow_up_required = (v_summary->>'follow_up_required')::boolean
    WHERE id = NEW.id;
    
    -- Sync to general interactions
    PERFORM sync_juno_interaction_to_general(
        NEW.customer_id,
        'sms',
        COALESCE(NEW.sms_summary, 'Juno SMS sent'),
        NEW.created_at,
        NEW.tenant_id,
        NEW.sms_content
    );
    
    -- Update customer summary
    PERFORM update_customer_juno_summary(NEW.customer_id, NEW.tenant_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Create the new triggers
DROP TRIGGER IF EXISTS trigger_alex_call_logs_sync ON juno_call_logs;
DROP TRIGGER IF EXISTS trigger_alex_email_logs_sync ON juno_email_logs;
DROP TRIGGER IF EXISTS trigger_alex_sms_logs_sync ON juno_sms_logs;

CREATE TRIGGER trigger_juno_call_logs_sync
    AFTER INSERT OR UPDATE ON juno_call_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_juno_call_to_interactions();

CREATE TRIGGER trigger_juno_email_logs_sync
    AFTER INSERT OR UPDATE ON juno_email_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_juno_email_to_interactions();

CREATE TRIGGER trigger_juno_sms_logs_sync
    AFTER INSERT OR UPDATE ON juno_sms_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_juno_sms_to_interactions();

-- Step 12: Update RLS policies for new table names
-- Drop old policies
DROP POLICY IF EXISTS "Users can only access call logs from their tenant" ON juno_call_logs;
DROP POLICY IF EXISTS "Users can only access email logs from their tenant" ON juno_email_logs;
DROP POLICY IF EXISTS "Users can only access SMS logs from their tenant" ON juno_sms_logs;
DROP POLICY IF EXISTS "Service role can access all call logs" ON juno_call_logs;
DROP POLICY IF EXISTS "Service role can access all email logs" ON juno_email_logs;
DROP POLICY IF EXISTS "Service role can access all SMS logs" ON juno_sms_logs;

-- Create new policies for juno tables
CREATE POLICY "Users can only access juno call logs from their tenant"
  ON juno_call_logs
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can only access juno email logs from their tenant"
  ON juno_email_logs
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can only access juno SMS logs from their tenant"
  ON juno_sms_logs
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Service role can access all juno call logs"
  ON juno_call_logs
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can access all juno email logs"
  ON juno_email_logs
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can access all juno SMS logs"
  ON juno_sms_logs
  FOR ALL
  TO service_role
  USING (true);

-- Step 13: Update the comprehensive customer view
DROP VIEW IF EXISTS customer_interaction_summary;
CREATE OR REPLACE VIEW customer_juno_interaction_summary AS
SELECT 
    c.id,
    c.first_name,
    c.last_name,
    c.email,
    c.phone_number,
    c.status,
    c.tenant_id,
    
    -- Juno interaction summary
    c.total_juno_calls,
    c.total_juno_emails,
    c.total_juno_sms,
    c.juno_call_duration_total,
    c.last_juno_call_date,
    c.last_juno_interaction_type,
    c.last_juno_interaction_date,
    
    -- General interaction counts
    (SELECT COUNT(*) FROM interactions WHERE customer_id = c.id) as total_interactions,
    (SELECT MAX(interaction_date) FROM interactions WHERE customer_id = c.id) as last_interaction_date,
    
    -- Recent juno interactions with summaries
    (SELECT conversation_summary FROM juno_call_logs WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1) as last_call_summary,
    (SELECT call_sentiment FROM juno_call_logs WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1) as last_call_sentiment,
    (SELECT conversation_summary FROM juno_email_logs WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1) as last_email_summary,
    (SELECT conversation_summary FROM juno_sms_logs WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1) as last_sms_summary,
    
    -- Follow-up tracking
    (SELECT COUNT(*) FROM juno_call_logs WHERE customer_id = c.id AND follow_up_required = true) as pending_call_followups,
    (SELECT COUNT(*) FROM juno_email_logs WHERE customer_id = c.id AND follow_up_required = true) as pending_email_followups,
    (SELECT COUNT(*) FROM juno_sms_logs WHERE customer_id = c.id AND follow_up_required = true) as pending_sms_followups
    
FROM customers c;

-- Step 14: Backfill existing data with summaries and update customer records

-- Backfill conversation summaries for existing juno interaction records
UPDATE juno_call_logs 
SET conversation_summary = (generate_juno_conversation_summary('call', COALESCE(call_transcript, call_summary, 'Call completed')))->>'summary_text',
    call_sentiment = (generate_juno_conversation_summary('call', COALESCE(call_transcript, call_summary, 'Call completed')))->>'sentiment',
    follow_up_required = ((generate_juno_conversation_summary('call', COALESCE(call_transcript, call_summary, 'Call completed')))->>'follow_up_required')::boolean,
    call_outcome = (generate_juno_conversation_summary('call', COALESCE(call_transcript, call_summary, 'Call completed')))->>'outcome'
WHERE conversation_summary IS NULL;

UPDATE juno_email_logs 
SET conversation_summary = (generate_juno_conversation_summary('email', COALESCE(email_body, email_subject, 'Email sent')))->>'summary_text',
    email_sentiment = (generate_juno_conversation_summary('email', COALESCE(email_body, email_subject, 'Email sent')))->>'sentiment',
    follow_up_required = ((generate_juno_conversation_summary('email', COALESCE(email_body, email_subject, 'Email sent')))->>'follow_up_required')::boolean
WHERE conversation_summary IS NULL;

UPDATE juno_sms_logs 
SET conversation_summary = (generate_juno_conversation_summary('sms', COALESCE(sms_content, 'SMS sent')))->>'summary_text',
    sms_sentiment = (generate_juno_conversation_summary('sms', COALESCE(sms_content, 'SMS sent')))->>'sentiment', 
    follow_up_required = ((generate_juno_conversation_summary('sms', COALESCE(sms_content, 'SMS sent')))->>'follow_up_required')::boolean
WHERE conversation_summary IS NULL;

-- Update customer summaries for all existing customers
DO $$
DECLARE
    customer_record RECORD;
BEGIN
    FOR customer_record IN 
        SELECT DISTINCT customer_id, tenant_id 
        FROM juno_call_logs 
        WHERE customer_id IS NOT NULL
        UNION
        SELECT DISTINCT customer_id, tenant_id 
        FROM juno_email_logs 
        WHERE customer_id IS NOT NULL
        UNION
        SELECT DISTINCT customer_id, tenant_id 
        FROM juno_sms_logs 
        WHERE customer_id IS NOT NULL
    LOOP
        PERFORM update_customer_juno_summary(
            customer_record.customer_id, 
            customer_record.tenant_id
        );
    END LOOP;
END;
$$;

-- Step 15: Grant permissions
GRANT SELECT ON customer_juno_interaction_summary TO authenticated;
GRANT EXECUTE ON FUNCTION generate_juno_conversation_summary TO authenticated;
GRANT EXECUTE ON FUNCTION sync_juno_interaction_to_general TO authenticated;
GRANT EXECUTE ON FUNCTION update_customer_juno_summary TO authenticated;

-- Step 16: Add comments for new columns and functions
COMMENT ON COLUMN customers.last_juno_call_date IS 'Date of the most recent Juno voice call';
COMMENT ON COLUMN customers.total_juno_calls IS 'Total number of Juno voice calls received';
COMMENT ON COLUMN customers.total_juno_emails IS 'Total number of Juno emails sent';
COMMENT ON COLUMN customers.total_juno_sms IS 'Total number of Juno SMS sent';
COMMENT ON COLUMN customers.last_juno_interaction_type IS 'Type of last Juno interaction (call/email/sms)';
COMMENT ON COLUMN customers.last_juno_interaction_date IS 'Date of last Juno interaction';
COMMENT ON COLUMN customers.juno_call_duration_total IS 'Total minutes of Juno calls';

COMMENT ON COLUMN juno_call_logs.conversation_summary IS 'AI-generated summary of call conversation';
COMMENT ON COLUMN juno_call_logs.call_sentiment IS 'Detected sentiment: positive, neutral, or negative';
COMMENT ON COLUMN juno_call_logs.follow_up_required IS 'Whether this interaction requires follow-up';
COMMENT ON COLUMN juno_call_logs.call_outcome IS 'Call result: qualified, not_qualified, follow_up_needed, etc.';

COMMENT ON FUNCTION generate_juno_conversation_summary IS 'Generates automatic conversation summaries with sentiment analysis';
COMMENT ON FUNCTION update_customer_juno_summary IS 'Updates customer interaction summary statistics';

-- Step 17: Clean up old columns (optional - run after confirming migration works)
-- Uncomment these lines after confirming the migration is successful:
-- ALTER TABLE customers DROP COLUMN IF EXISTS last_agent_call_date;
-- ALTER TABLE customers DROP COLUMN IF EXISTS total_agent_calls;
-- ALTER TABLE customers DROP COLUMN IF EXISTS total_agent_emails;
-- ALTER TABLE customers DROP COLUMN IF EXISTS total_agent_sms;
-- ALTER TABLE customers DROP COLUMN IF EXISTS last_agent_interaction_type;
-- ALTER TABLE customers DROP COLUMN IF EXISTS last_agent_interaction_date;
-- ALTER TABLE customers DROP COLUMN IF EXISTS agent_call_duration_total;

-- ===============================================================================
-- MIGRATION COMPLETE!
-- ===============================================================================

DO $$
BEGIN
    RAISE NOTICE '================================================================';
    RAISE NOTICE '✅ JUNO COMPREHENSIVE REBRANDING & ENHANCEMENT COMPLETE!';
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'TABLES RENAMED:';
    RAISE NOTICE '• alex_call_logs → juno_call_logs';
    RAISE NOTICE '• alex_email_logs → juno_email_logs';
    RAISE NOTICE '• alex_sms_logs → juno_sms_logs';
    RAISE NOTICE '';
    RAISE NOTICE 'CUSTOMER COLUMNS UPDATED:';
    RAISE NOTICE '• total_agent_* → total_juno_*';
    RAISE NOTICE '• last_agent_* → last_juno_*';
    RAISE NOTICE '• agent_call_duration_total → juno_call_duration_total';
    RAISE NOTICE '';
    RAISE NOTICE 'NEW FEATURES ADDED:';
    RAISE NOTICE '• Automatic conversation summaries';
    RAISE NOTICE '• Sentiment analysis (positive/neutral/negative)';
    RAISE NOTICE '• Follow-up detection';
    RAISE NOTICE '• Call outcome tracking';
    RAISE NOTICE '• Enhanced customer interaction view';
    RAISE NOTICE '';
    RAISE NOTICE 'FUNCTIONS CREATED:';
    RAISE NOTICE '• generate_juno_conversation_summary()';
    RAISE NOTICE '• update_customer_juno_summary()';
    RAISE NOTICE '• sync_juno_interaction_to_general()';
    RAISE NOTICE '';
    RAISE NOTICE 'TRIGGERS UPDATED:';
    RAISE NOTICE '• Auto-summary generation on new interactions';
    RAISE NOTICE '• Real-time customer summary updates';
    RAISE NOTICE '• Automatic interaction syncing';  
    RAISE NOTICE '';
    RAISE NOTICE 'VIEW CREATED:';
    RAISE NOTICE '• customer_juno_interaction_summary';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT NEXT STEPS:';
    RAISE NOTICE '1. Update all API endpoints to use juno_* table names';
    RAISE NOTICE '2. Update frontend components to use new column names';
    RAISE NOTICE '3. Test automatic summary generation';
    RAISE NOTICE '4. After testing, uncomment Step 17 to remove old columns';
    RAISE NOTICE '================================================================';
END $$; 