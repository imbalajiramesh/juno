-- =============================================================================
-- FIX: AI INTERACTION SYNC TO MAIN INTERACTIONS TABLE
-- =============================================================================
-- This fixes the AI triggers to create concise summary records in the main
-- interactions table, not store full content, making CRM interactions useful
-- =============================================================================

-- Step 1: Create improved sync function that stores ONLY summaries
CREATE OR REPLACE FUNCTION sync_ai_summary_to_interactions(
    p_customer_id UUID,
    p_interaction_type TEXT,
    p_ai_summary TEXT,
    p_ai_next_steps TEXT,
    p_interaction_date TIMESTAMPTZ,
    p_tenant_id TEXT
) RETURNS VOID AS $$
BEGIN
    -- Insert ONLY the AI summary (not full content) into interactions table
    INSERT INTO interactions (
        id,
        customer_id,
        interaction_type,
        details,
        interaction_date,
        tenant_id,
        ai_summary,
        ai_next_steps,
        interaction_source,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        p_customer_id,
        p_interaction_type::interaction_type,
        p_ai_summary, -- ONLY the 1-2 line summary, not full content
        p_interaction_date,
        p_tenant_id,
        p_ai_summary,
        p_ai_next_steps,
        'juno_agent',
        NOW(),
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Step 2: Update AI triggers to sync summaries to interactions
CREATE OR REPLACE FUNCTION trigger_ai_enhanced_juno_call()
RETURNS TRIGGER AS $$
DECLARE
    ai_analysis JSONB;
    content_for_ai TEXT;
BEGIN
    -- Prepare content for AI analysis
    content_for_ai := COALESCE(NEW.call_transcript, NEW.call_summary, 'Voice call completed');
    
    -- Generate AI analysis
    ai_analysis := generate_ai_interaction_analysis('call', content_for_ai);
    
    -- Update the call log with AI insights (full content stays here)
    UPDATE juno_call_logs SET
        ai_summary = ai_analysis->>'ai_summary',
        ai_next_steps = ai_analysis->>'ai_next_steps',
        conversation_summary = ai_analysis->>'ai_summary',
        call_sentiment = ai_analysis->>'sentiment',
        follow_up_required = (ai_analysis->>'follow_up_required')::boolean,
        call_outcome = ai_analysis->>'outcome'
    WHERE id = NEW.id;
    
    -- NEW: Sync ONLY the summary to interactions table (not full transcript)
    PERFORM sync_ai_summary_to_interactions(
        NEW.customer_id,
        'call',
        ai_analysis->>'ai_summary',
        ai_analysis->>'ai_next_steps',
        NEW.created_at,
        NEW.tenant_id
    );
    
    -- Update customer overall AI summary
    PERFORM update_customer_ai_summary(NEW.customer_id, NEW.tenant_id);
    
    -- Update customer interaction stats
    PERFORM update_customer_juno_summary(NEW.customer_id, NEW.tenant_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_ai_enhanced_juno_email()
RETURNS TRIGGER AS $$
DECLARE
    ai_analysis JSONB;
    content_for_ai TEXT;
BEGIN
    content_for_ai := COALESCE(NEW.email_body, NEW.email_subject, 'Email sent');
    ai_analysis := generate_ai_interaction_analysis('email', content_for_ai);
    
    -- Update email log with AI insights (full content stays here)
    UPDATE juno_email_logs SET
        ai_summary = ai_analysis->>'ai_summary',
        ai_next_steps = ai_analysis->>'ai_next_steps',
        conversation_summary = ai_analysis->>'ai_summary',
        email_sentiment = ai_analysis->>'sentiment',
        follow_up_required = (ai_analysis->>'follow_up_required')::boolean
    WHERE id = NEW.id;
    
    -- NEW: Sync ONLY the summary to interactions table (not full email body)
    PERFORM sync_ai_summary_to_interactions(
        NEW.customer_id,
        'email',
        ai_analysis->>'ai_summary',
        ai_analysis->>'ai_next_steps',
        NEW.created_at,
        NEW.tenant_id
    );
    
    PERFORM update_customer_ai_summary(NEW.customer_id, NEW.tenant_id);
    PERFORM update_customer_juno_summary(NEW.customer_id, NEW.tenant_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_ai_enhanced_juno_sms()
RETURNS TRIGGER AS $$
DECLARE
    ai_analysis JSONB;
    content_for_ai TEXT;
BEGIN
    content_for_ai := COALESCE(NEW.sms_content, 'SMS sent');
    ai_analysis := generate_ai_interaction_analysis('sms', content_for_ai);
    
    -- Update SMS log with AI insights (full content stays here)
    UPDATE juno_sms_logs SET
        ai_summary = ai_analysis->>'ai_summary',
        ai_next_steps = ai_analysis->>'ai_next_steps',
        conversation_summary = ai_analysis->>'ai_summary',
        sms_sentiment = ai_analysis->>'sentiment',
        follow_up_required = (ai_analysis->>'follow_up_required')::boolean
    WHERE id = NEW.id;
    
    -- NEW: Sync ONLY the summary to interactions table (not full SMS content)
    PERFORM sync_ai_summary_to_interactions(
        NEW.customer_id,
        'sms',
        ai_analysis->>'ai_summary',
        ai_analysis->>'ai_next_steps',
        NEW.created_at,
        NEW.tenant_id
    );
    
    PERFORM update_customer_ai_summary(NEW.customer_id, NEW.tenant_id);
    PERFORM update_customer_juno_summary(NEW.customer_id, NEW.tenant_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Update/recreate the triggers
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'juno_call_logs') THEN
        DROP TRIGGER IF EXISTS trigger_juno_call_logs_sync ON juno_call_logs;
        CREATE TRIGGER trigger_juno_call_logs_sync
            AFTER INSERT OR UPDATE ON juno_call_logs
            FOR EACH ROW
            EXECUTE FUNCTION trigger_ai_enhanced_juno_call();
        RAISE NOTICE 'Updated AI trigger for juno_call_logs to sync summaries';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'juno_email_logs') THEN
        DROP TRIGGER IF EXISTS trigger_juno_email_logs_sync ON juno_email_logs;
        CREATE TRIGGER trigger_juno_email_logs_sync
            AFTER INSERT OR UPDATE ON juno_email_logs
            FOR EACH ROW
            EXECUTE FUNCTION trigger_ai_enhanced_juno_email();
        RAISE NOTICE 'Updated AI trigger for juno_email_logs to sync summaries';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'juno_sms_logs') THEN
        DROP TRIGGER IF EXISTS trigger_juno_sms_logs_sync ON juno_sms_logs;
        CREATE TRIGGER trigger_juno_sms_logs_sync
            AFTER INSERT OR UPDATE ON juno_sms_logs
            FOR EACH ROW
            EXECUTE FUNCTION trigger_ai_enhanced_juno_sms();
        RAISE NOTICE 'Updated AI trigger for juno_sms_logs to sync summaries';
    END IF;
END $$;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION sync_ai_summary_to_interactions TO authenticated;

-- Step 5: Comments
COMMENT ON FUNCTION sync_ai_summary_to_interactions IS 'Syncs AI-generated summaries to interactions table (summaries only, not full content)';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🔧 AI INTERACTION SYNC FIX COMPLETE!';
    RAISE NOTICE '✅ Juno agent interactions now create summary records in interactions table';
    RAISE NOTICE '✅ Only 1-2 line AI summaries stored, not full content';
    RAISE NOTICE '✅ Full content remains in juno_*_logs for reference';
    RAISE NOTICE '✅ CRM interactions view now shows actionable summaries';
    RAISE NOTICE '';
    RAISE NOTICE 'BEHAVIOR:';
    RAISE NOTICE '• Juno call → AI summary in interactions table';
    RAISE NOTICE '• Juno email → AI summary in interactions table';  
    RAISE NOTICE '• Juno SMS → AI summary in interactions table';
    RAISE NOTICE '• Full transcripts/content stay in juno_*_logs';
END $$; 