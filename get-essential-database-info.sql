-- Essential Database Information for Customer Status System
-- Simple queries that will definitely show output

\echo '=== TENANTS TABLE STRUCTURE ==='
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tenants' 
ORDER BY ordinal_position;

\echo '=== CUSTOMERS TABLE STRUCTURE ==='
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'customers' 
ORDER BY ordinal_position;

\echo '=== SAMPLE TENANT IDS ==='
SELECT id, pg_typeof(id) as id_type FROM tenants LIMIT 3;

\echo '=== CHECK IF SUPABASE AUTH EXISTS ==='
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users')
        THEN 'YES - Supabase detected'
        ELSE 'NO - Custom auth system'
    END as supabase_status;

\echo '=== EXISTING TENANT-RELATED FUNCTIONS ==='
SELECT routine_name, data_type as return_type
FROM information_schema.routines 
WHERE routine_name ILIKE '%tenant%' 
   OR routine_name ILIKE '%get_tenant%'
   OR routine_name = 'auth.uid'
ORDER BY routine_name;

\echo '=== CURRENT RLS POLICIES ON KEY TABLES ==='
SELECT tablename, policyname, cmd, qual
FROM pg_policies 
WHERE tablename IN ('customers', 'tenants', 'user_accounts')
ORDER BY tablename;

\echo '=== CUSTOMER TABLE TENANT RELATIONSHIP ==='
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'tenant_id')
        THEN 'customers.tenant_id EXISTS'
        ELSE 'customers.tenant_id MISSING'
    END as tenant_relationship;

\echo '=== FOREIGN KEYS TO TENANTS TABLE ==='
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

\echo '=== POSTGRESQL VERSION ==='
SELECT version();

\echo 'Done! This information will help create the correct migration.' 