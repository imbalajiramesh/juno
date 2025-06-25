-- Fix the RLS functions to return TEXT instead of UUID
-- This fixes the type mismatch error in RLS policies

-- Drop and recreate both functions with correct return type
DROP FUNCTION IF EXISTS get_current_tenant_id();
DROP FUNCTION IF EXISTS get_user_tenant_id();

-- Fix get_current_tenant_id to return TEXT
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS TEXT AS $$
BEGIN
  -- Try to get tenant_id from JWT claims
  -- This assumes your application sets the tenant_id in the JWT
  RETURN (auth.jwt() ->> 'tenant_id')::TEXT;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback: try to get from user metadata
    RETURN (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix get_user_tenant_id to return TEXT
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT tenant_id::TEXT 
    FROM user_accounts 
    WHERE auth_id = auth.uid()::text
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION get_current_tenant_id() IS 'Gets tenant_id as TEXT from JWT claims';
COMMENT ON FUNCTION get_user_tenant_id() IS 'Gets tenant_id as TEXT from user_accounts table based on auth.uid()'; 