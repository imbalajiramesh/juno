-- Database Structure Analysis
-- This script analyzes the current database structure to understand tenant management

-- 1. Check all relevant table structures
SELECT 
    'TABLE STRUCTURES' as analysis_type,
    '==================' as separator;

-- Show tenants table structure
SELECT 
    'TENANTS TABLE' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tenants'
ORDER BY ordinal_position;

-- Show customers table structure
SELECT 
    'CUSTOMERS TABLE' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'customers'
ORDER BY ordinal_position;

-- Show user_accounts table structure
SELECT 
    'USER_ACCOUNTS TABLE' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_accounts'
ORDER BY ordinal_position;

-- Show custom_field_definitions table structure
SELECT 
    'CUSTOM_FIELD_DEFINITIONS TABLE' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'custom_field_definitions'
ORDER BY ordinal_position;

-- 2. Check existing RLS policies
SELECT 
    'EXISTING RLS POLICIES' as analysis_type,
    '===================' as separator;

SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('tenants', 'customers', 'user_accounts', 'custom_field_definitions')
ORDER BY tablename, policyname;

-- 3. Check for existing tenant-related functions
SELECT 
    'EXISTING FUNCTIONS' as analysis_type,
    '==================' as separator;

SELECT 
    routine_name,
    routine_type,
    data_type as return_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name ILIKE '%tenant%' 
   OR routine_name ILIKE '%get_%'
   OR routine_definition ILIKE '%tenant%'
ORDER BY routine_name;

-- 4. Check foreign key relationships
SELECT 
    'FOREIGN KEY RELATIONSHIPS' as analysis_type,
    '=========================' as separator;

SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND (tc.table_name IN ('customers', 'user_accounts', 'custom_field_definitions')
     OR ccu.table_name = 'tenants')
ORDER BY tc.table_name, kcu.column_name;

-- 5. Check if RLS is enabled on tables
SELECT 
    'RLS STATUS' as analysis_type,
    '==========' as separator;

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    hasrls
FROM pg_tables 
WHERE tablename IN ('tenants', 'customers', 'user_accounts', 'custom_field_definitions')
ORDER BY tablename;

-- 6. Check for JWT or session-related configurations
SELECT 
    'DATABASE SETTINGS' as analysis_type,
    '=================' as separator;

SELECT 
    name,
    setting,
    context
FROM pg_settings 
WHERE name ILIKE '%jwt%' 
   OR name ILIKE '%session%'
   OR name ILIKE '%app%'
ORDER BY name;

-- 7. Check for existing triggers
SELECT 
    'TRIGGERS' as analysis_type,
    '========' as separator;

SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('tenants', 'customers', 'user_accounts', 'custom_field_definitions')
ORDER BY event_object_table, trigger_name;

-- 8. Sample data to understand current tenant relationships
SELECT 
    'SAMPLE DATA RELATIONSHIPS' as analysis_type,
    '=========================' as separator;

-- Count of tenants
SELECT 'Tenant count' as metric, COUNT(*) as value FROM tenants;

-- Count of customers per tenant (if tenant_id exists)
SELECT 
    'Customer distribution' as metric,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'tenant_id')
        THEN 'tenant_id column exists'
        ELSE 'tenant_id column missing'
    END as status;

-- Show sample tenant IDs and their types
SELECT 
    'Sample tenant IDs' as info,
    id,
    pg_typeof(id) as id_type
FROM tenants 
LIMIT 3;

SELECT 'Analysis complete! Review the output above to understand your current database structure.' as final_message; 