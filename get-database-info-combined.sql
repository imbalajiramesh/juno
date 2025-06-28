-- Essential Database Information - Combined Results
-- This version shows all information in fewer queries

-- 1. Table structures combined
SELECT 
    'TENANTS_TABLE' as table_info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'tenants'
UNION ALL
SELECT 
    'CUSTOMERS_TABLE' as table_info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'customers'
ORDER BY table_info, column_name;

-- 2. Sample tenant IDs and key checks
SELECT 
    'SAMPLE_TENANT_ID' as check_type,
    id as value,
    pg_typeof(id)::text as data_type
FROM tenants 
LIMIT 3
UNION ALL
SELECT 
    'SUPABASE_STATUS' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users')
        THEN 'YES - Supabase detected'
        ELSE 'NO - Custom auth system'
    END as value,
    'detection' as data_type
UNION ALL
SELECT 
    'TENANT_RELATIONSHIP' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'tenant_id')
        THEN 'customers.tenant_id EXISTS'
        ELSE 'customers.tenant_id MISSING'
    END as value,
    'relationship' as data_type;

-- 3. Functions and policies
SELECT 
    'FUNCTION' as item_type,
    routine_name as name,
    data_type as details
FROM information_schema.routines 
WHERE routine_name ILIKE '%tenant%' 
   OR routine_name ILIKE '%get_tenant%'
   OR routine_name = 'auth.uid'
UNION ALL
SELECT 
    'RLS_POLICY' as item_type,
    tablename || '.' || policyname as name,
    cmd || ': ' || COALESCE(qual, 'no condition') as details
FROM pg_policies 
WHERE tablename IN ('customers', 'tenants', 'user_accounts')
ORDER BY item_type, name;

-- 4. Foreign key relationships
SELECT 
    'FOREIGN_KEY' as relationship_type,
    tc.table_name || '.' || kcu.column_name as source,
    'references ' || ccu.table_name || '.' || ccu.column_name as target
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND ccu.table_name = 'tenants';

-- 5. PostgreSQL version
SELECT 
    'VERSION' as info_type,
    version() as details; 