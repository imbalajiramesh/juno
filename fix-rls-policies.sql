-- Fix RLS policies and user_accounts table
-- Run this against your Supabase database

-- First, let's check if tenant_id column exists in user_accounts
-- If it doesn't exist, we're good. If it does, we need to handle it properly

-- Remove the tenant_id constraint from user_accounts if it exists
-- (This will be handled gracefully if the column doesn't exist)
ALTER TABLE user_accounts DROP COLUMN IF EXISTS tenant_id;

-- Update RLS policies to be more permissive for user creation
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_accounts;
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON user_accounts;
DROP POLICY IF EXISTS "Users can insert their own account" ON user_accounts;
DROP POLICY IF EXISTS "Users can update their own account" ON user_accounts;

-- Create more permissive policies for user_accounts
CREATE POLICY "Users can view all user accounts" ON user_accounts
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert user accounts" ON user_accounts
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can update their own user account" ON user_accounts
    FOR UPDATE
    TO authenticated
    USING (auth_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can delete their own user account" ON user_accounts
    FOR DELETE
    TO authenticated
    USING (auth_id = auth.jwt() ->> 'sub');

-- Update tenants policies to be more permissive
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON tenants;
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON tenants;

CREATE POLICY "Users can view all tenants" ON tenants
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert tenants" ON tenants
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can update tenants" ON tenants
    FOR UPDATE
    TO authenticated
    USING (true);

-- Clean up any duplicate tenants (keep the first one for each user)
WITH duplicates AS (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY clerk_org_id ORDER BY created_at) as rn
    FROM tenants
)
DELETE FROM tenants 
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- Clean up any duplicate user accounts (keep the first one for each user)
WITH duplicates AS (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY auth_id ORDER BY created_at) as rn
    FROM user_accounts
)
DELETE FROM user_accounts 
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
); 