-- Simple migration to add missing columns to user_accounts table
-- Run this FIRST before running the full role-based-permissions-schema.sql

-- Enable uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add tenant_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_accounts' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE user_accounts ADD COLUMN tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_user_accounts_tenant_id ON user_accounts(tenant_id);
    END IF;
END $$;

-- Add role_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_accounts' AND column_name = 'role_id'
    ) THEN
        ALTER TABLE user_accounts ADD COLUMN role_id UUID;
        CREATE INDEX IF NOT EXISTS idx_user_accounts_role_id ON user_accounts(role_id);
    END IF;
END $$;

-- Drop existing role_id column if it exists and has wrong type
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_accounts' 
        AND column_name = 'role_id' 
        AND data_type != 'uuid'
    ) THEN
        ALTER TABLE user_accounts DROP COLUMN role_id;
        ALTER TABLE user_accounts ADD COLUMN role_id UUID;
        CREATE INDEX IF NOT EXISTS idx_user_accounts_role_id ON user_accounts(role_id);
    END IF;
END $$;

-- Add date_of_joining column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_accounts' AND column_name = 'date_of_joining'
    ) THEN
        ALTER TABLE user_accounts ADD COLUMN date_of_joining TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Drop existing roles table if it exists (to recreate properly)
DROP TABLE IF EXISTS roles CASCADE;

-- Create roles table with proper UUID generation
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (role_name, description) VALUES
('admin', 'Full access to all features and settings'),
('manager', 'Access to most features except critical admin functions'),
('agent', 'Access to customer management and basic features'),
('support', 'Read-only access for support operations');

-- Add foreign key constraint for role_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_accounts_role_id_fkey'
    ) THEN
        ALTER TABLE user_accounts ADD CONSTRAINT user_accounts_role_id_fkey 
        FOREIGN KEY (role_id) REFERENCES roles(id);
    END IF;
END $$; 