-- Fix team member visibility issue by ensuring proper tenant associations
-- This script addresses users not appearing in team lists due to missing tenant_id relationships

-- First, let's identify and fix user accounts without tenant associations
DO $$
DECLARE
    orphaned_users CURSOR FOR
        SELECT ua.id, ua.auth_id, ua.email, ua.tenant_id
        FROM user_accounts ua
        WHERE ua.tenant_id IS NULL 
           OR ua.tenant_id NOT IN (SELECT id FROM tenants);
    
    user_record RECORD;
    default_tenant_id TEXT;
BEGIN
    -- Get or create a default tenant for orphaned users
    -- Check if there's already a tenant we can use
    SELECT id INTO default_tenant_id
    FROM tenants
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- If no tenant exists, create one
    IF default_tenant_id IS NULL THEN
        default_tenant_id := gen_random_uuid()::text;
        INSERT INTO tenants (id, clerk_org_id, name, schema_name, created_at, updated_at)
        VALUES (
            default_tenant_id,
            'default-org-' || default_tenant_id,
            'Default Organization',
            'tenant_default',
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Created default tenant: %', default_tenant_id;
    END IF;
    
    -- Fix orphaned user accounts
    FOR user_record IN orphaned_users LOOP
        -- Try to find the appropriate tenant for this user
        -- First, check if there's a tenant with their auth_id as clerk_org_id
        SELECT id INTO default_tenant_id
        FROM tenants
        WHERE clerk_org_id = user_record.auth_id
        LIMIT 1;
        
        -- If no specific tenant found, use the first available tenant
        IF default_tenant_id IS NULL THEN
            SELECT id INTO default_tenant_id
            FROM tenants
            ORDER BY created_at ASC
            LIMIT 1;
        END IF;
        
        -- Update the user account with the correct tenant_id
        UPDATE user_accounts
        SET tenant_id = default_tenant_id,
            updated_at = NOW()
        WHERE id = user_record.id;
        
        RAISE NOTICE 'Fixed user % - assigned to tenant %', user_record.email, default_tenant_id;
    END LOOP;
END $$;

-- Ensure all users have proper role assignments
DO $$
DECLARE
    default_role_id UUID;
BEGIN
    -- Get default role (create if doesn't exist)
    SELECT id INTO default_role_id
    FROM roles
    WHERE role_name = 'agent'
    LIMIT 1;
    
    IF default_role_id IS NULL THEN
        -- Create default roles if they don't exist
        INSERT INTO roles (id, role_name, description, created_at, updated_at)
        VALUES 
            (gen_random_uuid(), 'admin', 'Administrator with full access', NOW(), NOW()),
            (gen_random_uuid(), 'manager', 'Manager with team oversight', NOW(), NOW()),
            (gen_random_uuid(), 'agent', 'Agent with standard access', NOW(), NOW()),
            (gen_random_uuid(), 'support', 'Support staff with limited access', NOW(), NOW())
        ON CONFLICT (role_name) DO NOTHING;
        
        -- Get the agent role
        SELECT id INTO default_role_id
        FROM roles
        WHERE role_name = 'agent'
        LIMIT 1;
    END IF;
    
    -- Assign default role to users without roles
    UPDATE user_accounts
    SET role_id = default_role_id,
        updated_at = NOW()
    WHERE role_id IS NULL;
    
    RAISE NOTICE 'Assigned default roles to users without role assignments';
END $$;

-- Clean up any duplicate user accounts (keep the most recent one for each auth_id + tenant_id combo)
WITH ranked_users AS (
    SELECT id,
           auth_id,
           tenant_id,
           ROW_NUMBER() OVER (PARTITION BY auth_id, tenant_id ORDER BY created_at DESC) as rn
    FROM user_accounts
)
DELETE FROM user_accounts
WHERE id IN (
    SELECT id FROM ranked_users WHERE rn > 1
);

-- Update statistics to reflect proper team member counts (if materialized view exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_matviews WHERE matviewname = 'user_stats_mv'
    ) THEN
        REFRESH MATERIALIZED VIEW user_stats_mv;
        RAISE NOTICE 'Refreshed materialized view user_stats_mv';
    END IF;
END $$;

-- Verify the fixes
DO $$
DECLARE
    total_users INTEGER;
    users_without_tenant INTEGER;
    users_without_role INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_users FROM user_accounts;
    SELECT COUNT(*) INTO users_without_tenant FROM user_accounts WHERE tenant_id IS NULL;
    SELECT COUNT(*) INTO users_without_role FROM user_accounts WHERE role_id IS NULL;
    
    RAISE NOTICE 'Team visibility fix completed:';
    RAISE NOTICE 'Total users: %', total_users;
    RAISE NOTICE 'Users without tenant: %', users_without_tenant;
    RAISE NOTICE 'Users without role: %', users_without_role;
    
    IF users_without_tenant > 0 OR users_without_role > 0 THEN
        RAISE WARNING 'Some users still need manual intervention';
    ELSE
        RAISE NOTICE 'All users have proper tenant and role associations';
    END IF;
END $$; 