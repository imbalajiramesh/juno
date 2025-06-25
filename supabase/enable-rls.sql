-- Enable RLS and create policies for all tables
-- This script enables Row Level Security for multi-tenant isolation

-- =============================================================================
-- ENABLE RLS ON ALL TABLES
-- =============================================================================

-- Core tenant table (no RLS needed as it's managed by the application)
-- ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Customer management tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;

-- User and role management
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Alex (AI assistant) related tables
ALTER TABLE alex_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alex_email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alex_sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alex_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE alex_add_minutes ENABLE ROW LEVEL SECURITY;

-- Task management
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Migration table (usually should not have RLS)
-- ALTER TABLE _prisma_migrations ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- HELPER FUNCTION TO GET CURRENT USER'S TENANT_ID
-- =============================================================================

-- This function extracts the tenant_id from the JWT token claims
-- It assumes the tenant_id is stored in the user metadata or custom claims
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  -- Try to get tenant_id from JWT claims
  -- This assumes your application sets the tenant_id in the JWT
  RETURN (auth.jwt() ->> 'tenant_id')::UUID;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback: try to get from user metadata
    RETURN (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative function to get tenant_id from user_accounts table
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT tenant_id 
    FROM user_accounts 
    WHERE auth_id = auth.uid()::text
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- RLS POLICIES FOR TENANT-ISOLATED TABLES
-- =============================================================================

-- CUSTOMERS TABLE
CREATE POLICY "Users can only access customers from their tenant"
  ON customers
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- INTERACTIONS TABLE
CREATE POLICY "Users can only access interactions from their tenant"
  ON interactions
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- CUSTOM_FIELD_DEFINITIONS TABLE
CREATE POLICY "Users can only access custom field definitions from their tenant"
  ON custom_field_definitions
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- USER_ACCOUNTS TABLE
CREATE POLICY "Users can only access user accounts from their tenant"
  ON user_accounts
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- ALEX_CALL_LOGS TABLE
CREATE POLICY "Users can only access call logs from their tenant"
  ON alex_call_logs
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- ALEX_EMAIL_LOGS TABLE
CREATE POLICY "Users can only access email logs from their tenant"
  ON alex_email_logs
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- ALEX_SMS_LOGS TABLE
CREATE POLICY "Users can only access SMS logs from their tenant"
  ON alex_sms_logs
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- ALEX_TASKS TABLE
CREATE POLICY "Users can only access Alex tasks from their tenant"
  ON alex_tasks
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- TASKS TABLE
CREATE POLICY "Users can only access tasks from their tenant"
  ON tasks
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- =============================================================================
-- RLS POLICIES FOR GLOBAL TABLES (no tenant isolation)
-- =============================================================================

-- ROLES TABLE (global, all users can read)
CREATE POLICY "All authenticated users can read roles"
  ON roles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only service role can modify roles
CREATE POLICY "Only service role can modify roles"
  ON roles
  FOR ALL
  USING (auth.role() = 'service_role');

-- ALEX_ADD_MINUTES TABLE (global or per-tenant depending on your needs)
-- If this should be tenant-specific:
CREATE POLICY "Users can only access minutes from their tenant"
  ON alex_add_minutes
  FOR ALL
  USING (
    -- If alex_add_minutes should be tenant-specific, you might need to add tenant_id
    -- For now, allowing all authenticated users
    auth.role() = 'authenticated'
  );

-- =============================================================================
-- ADDITIONAL SECURITY POLICIES
-- =============================================================================

-- Policy for service role to bypass RLS (for admin operations)
-- This allows your application's service account to access all data

-- Enable service role bypass for all tables
CREATE POLICY "Service role can access all customers"
  ON customers
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can access all interactions"
  ON interactions
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can access all custom field definitions"
  ON custom_field_definitions
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can access all user accounts"
  ON user_accounts
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can access all call logs"
  ON alex_call_logs
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can access all email logs"
  ON alex_email_logs
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can access all SMS logs"
  ON alex_sms_logs
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can access all Alex tasks"
  ON alex_tasks
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can access all tasks"
  ON tasks
  FOR ALL
  TO service_role
  USING (true);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Add indexes on tenant_id columns for better RLS performance
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_interactions_tenant_id ON interactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_tenant_id ON custom_field_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_tenant_id ON user_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_auth_id ON user_accounts(auth_id);
CREATE INDEX IF NOT EXISTS idx_alex_call_logs_tenant_id ON alex_call_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alex_email_logs_tenant_id ON alex_email_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alex_sms_logs_tenant_id ON alex_sms_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alex_tasks_tenant_id ON alex_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON interactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON custom_field_definitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON alex_call_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON alex_email_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON alex_sms_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON alex_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO authenticated;
GRANT SELECT ON roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON alex_add_minutes TO authenticated;

-- Grant all permissions to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION get_current_tenant_id() IS 'Extracts tenant_id from JWT token claims';
COMMENT ON FUNCTION get_user_tenant_id() IS 'Gets tenant_id from user_accounts table based on auth.uid()';

-- =============================================================================
-- VERIFICATION QUERIES (for testing)
-- =============================================================================

/*
-- Test queries to verify RLS is working:

-- 1. Check if RLS is enabled on tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- 2. Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- 3. Test tenant isolation (run as different users)
SELECT * FROM customers; -- Should only return current user's tenant data
*/ 