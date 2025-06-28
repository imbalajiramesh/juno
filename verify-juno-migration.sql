-- VERIFICATION SCRIPT - Check Juno Migration Status
-- Run this to see what tables exist and verify the migration worked

-- 1. Check if new Juno columns were added to customers table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'customers' 
  AND column_name LIKE '%juno%'
ORDER BY column_name;

-- 2. Check what interaction log tables exist
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_name IN ('alex_call_logs', 'alex_email_logs', 'alex_sms_logs', 
                     'juno_call_logs', 'juno_email_logs', 'juno_sms_logs')
ORDER BY table_name;

-- 3. Check if voice agents table exists
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_name = 'voice_agents';

-- 4. Check if interactions table exists
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_name = 'interactions';

-- 5. List all functions created
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%juno%'
ORDER BY routine_name; 