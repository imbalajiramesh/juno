-- Migration to remove hardcoded energy-specific fields from customers table
-- Run this against your Supabase database

-- Remove energy-specific fields that should be custom fields instead
ALTER TABLE customers DROP COLUMN IF EXISTS hydro_bill;
ALTER TABLE customers DROP COLUMN IF EXISTS gas_bill;
ALTER TABLE customers DROP COLUMN IF EXISTS home_age;
ALTER TABLE customers DROP COLUMN IF EXISTS attic_insulation;

-- Remove appliance-specific fields
ALTER TABLE customers DROP COLUMN IF EXISTS ac_age;
ALTER TABLE customers DROP COLUMN IF EXISTS ac_ownership;
ALTER TABLE customers DROP COLUMN IF EXISTS ac_rent_amount;
ALTER TABLE customers DROP COLUMN IF EXISTS furnace_age;
ALTER TABLE customers DROP COLUMN IF EXISTS furnace_ownership;
ALTER TABLE customers DROP COLUMN IF EXISTS furnace_rent_amount;
ALTER TABLE customers DROP COLUMN IF EXISTS water_heater_age;
ALTER TABLE customers DROP COLUMN IF EXISTS water_heater_ownership;
ALTER TABLE customers DROP COLUMN IF EXISTS water_heater_rent_amount;

-- Remove energy-specific status fields
ALTER TABLE customers DROP COLUMN IF EXISTS ownership_status;
ALTER TABLE customers DROP COLUMN IF EXISTS knows_about_program;
ALTER TABLE customers DROP COLUMN IF EXISTS applied_for_program;

-- Also remove unused status_id and sub_status_id columns
ALTER TABLE customers DROP COLUMN IF EXISTS status_id;
ALTER TABLE customers DROP COLUMN IF EXISTS sub_status_id;

-- Add a JSONB column for custom field data (if not already exists)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- Create index on custom_fields for better performance
CREATE INDEX IF NOT EXISTS idx_customers_custom_fields ON customers USING GIN (custom_fields);

-- Add helpful comment
COMMENT ON COLUMN customers.custom_fields IS 'JSON storage for tenant-specific custom field values'; 