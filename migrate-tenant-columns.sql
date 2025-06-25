-- Migration script to add organization setup columns to tenants table
-- Run this against your Supabase database

-- Add organization setup columns to tenants table
ALTER TABLE IF EXISTS tenants ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE IF EXISTS tenants ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE IF EXISTS tenants ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE IF EXISTS tenants ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE IF EXISTS tenants ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE;

-- Create custom field definitions table if it doesn't exist
CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    field_name TEXT NOT NULL,
    field_type TEXT NOT NULL, -- 'text', 'number', 'boolean', 'date', 'select'
    field_label TEXT NOT NULL,
    field_options JSONB, -- For select fields, stores the options
    is_required BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, field_name)
);

-- Enable RLS on custom field definitions
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;

-- Create policies for custom field definitions
CREATE POLICY "Users can view their tenant's custom fields" ON custom_field_definitions
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert custom fields for their tenant" ON custom_field_definitions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can update their tenant's custom fields" ON custom_field_definitions
    FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Users can delete their tenant's custom fields" ON custom_field_definitions
    FOR DELETE
    TO authenticated
    USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_custom_fields_tenant ON custom_field_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_setup ON tenants(setup_completed);

-- Update existing tenants to have setup_completed = false if null
UPDATE tenants SET setup_completed = FALSE WHERE setup_completed IS NULL; 