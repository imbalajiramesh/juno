-- Essential Database Information for Customer Status System
-- Using standard SQL that works in script files

SELECT '=== TENANTS TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tenants' 
ORDER BY ordinal_position;

SELECT '=== CUSTOMERS TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'customers' 
ORDER BY ordinal_position;

SELECT '=== SAMPLE TENANT IDS ===' as info;
SELECT id, pg_typeof(id) as id_type FROM tenants LIMIT 3;

SELECT '=== CHECK IF SUPABASE AUTH EXISTS ===' as info;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users')
        THEN 'YES - Supabase detected'
        ELSE 'NO - Custom auth system'
    END as supabase_status;

SELECT '=== EXISTING TENANT-RELATED FUNCTIONS ===' as info;
SELECT routine_name, data_type as return_type
FROM information_schema.routines 
WHERE routine_name ILIKE '%tenant%' 
   OR routine_name ILIKE '%get_tenant%'
   OR routine_name = 'auth.uid'
ORDER BY routine_name;

SELECT '=== CURRENT RLS POLICIES ON KEY TABLES ===' as info;
SELECT tablename, policyname, cmd, qual
FROM pg_policies 
WHERE tablename IN ('customers', 'tenants', 'user_accounts')
ORDER BY tablename;

SELECT '=== CUSTOMER TABLE TENANT RELATIONSHIP ===' as info;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'tenant_id')
        THEN 'customers.tenant_id EXISTS'
        ELSE 'customers.tenant_id MISSING'
    END as tenant_relationship;

SELECT '=== FOREIGN KEYS TO TENANTS TABLE ===' as info;
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.column_name AS references_column
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND ccu.table_name = 'tenants';

SELECT '=== POSTGRESQL VERSION ===' as info;
SELECT version();

SELECT 'Done! This information will help create the correct migration.' as final_message; 