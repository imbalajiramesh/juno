# Row Level Security (RLS) Setup

This document explains the Row Level Security implementation for the Juno multi-tenant application.

## Overview

Row Level Security (RLS) has been enabled on all relevant tables to ensure proper tenant isolation. This means users can only access data that belongs to their organization/tenant.

## Files

- `supabase/enable-rls.sql` - SQL script that enables RLS and creates policies
- `scripts/enable-rls.sh` - Shell script to execute the SQL file
- `supabase/RLS-README.md` - This documentation file

## Tables with RLS Enabled

### Tenant-Isolated Tables
These tables have RLS policies that restrict access based on `tenant_id`:

- `customers` - Customer records
- `interactions` - Customer interactions
- `custom_field_definitions` - Custom field configurations
- `user_accounts` - User account information
- `alex_call_logs` - AI call logs
- `alex_email_logs` - AI email logs
- `alex_sms_logs` - AI SMS logs
- `alex_tasks` - AI-generated tasks
- `tasks` - General task management

### Global Tables
These tables have different access patterns:

- `roles` - Read-only for all authenticated users
- `alex_add_minutes` - Accessible to all authenticated users
- `tenants` - No RLS (managed by application logic)
- `_prisma_migrations` - No RLS (system table)

## How RLS Works

### Tenant Identification
The system uses two helper functions to identify the current user's tenant:

1. `get_current_tenant_id()` - Extracts tenant_id from JWT token claims
2. `get_user_tenant_id()` - Looks up tenant_id from user_accounts table

### Policy Structure
Each tenant-isolated table has policies that:
- Allow users to access only their tenant's data
- Allow the service role to access all data (for admin operations)

### Example Policy
```sql
CREATE POLICY "Users can only access customers from their tenant"
  ON customers
  FOR ALL
  USING (tenant_id = get_user_tenant_id());
```

## Installation

### Prerequisites
- PostgreSQL client tools (`psql`)
- Access to your Supabase database
- Database password

### Steps

1. **Install PostgreSQL client** (if not already installed):
   ```bash
   # macOS
   brew install postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql-client
   ```

2. **Set your database password**:
   ```bash
   export SUPABASE_DB_PASSWORD='your_database_password_here'
   ```

3. **Run the RLS setup script**:
   ```bash
   ./scripts/enable-rls.sh
   ```

### Manual Installation
If you prefer to run the SQL manually:

```bash
psql -h supabase.juno.laxmint.com -p 5432 -d postgres -U postgres -f supabase/enable-rls.sql
```

## Verification

After installation, verify RLS is working:

### 1. Check RLS Status
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;
```

### 2. Check Policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public';
```

### 3. Test Tenant Isolation
Log in as different users and verify they only see their tenant's data:
```sql
SELECT COUNT(*) FROM customers; -- Should only show current tenant's customers
```

## Application Integration

### JWT Token Requirements
For RLS to work properly, your application needs to ensure that:

1. **User Authentication**: Users must be properly authenticated through Supabase Auth
2. **Tenant Association**: Each user must be associated with a tenant in the `user_accounts` table
3. **JWT Claims**: Optionally, you can include `tenant_id` in JWT custom claims for better performance

### Supabase Client Configuration
Your Supabase client should use the authenticated user's token:

```typescript
// This is already handled in your utils/supabase/client.ts and server.ts files
const supabase = createClientComponentClient()
// or
const supabase = createServerComponentClient({ cookies })
```

### Service Role Usage
For admin operations that need to bypass RLS, use the service role:

```typescript
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

## Performance Considerations

### Indexes
The RLS setup includes performance indexes on all `tenant_id` columns:
- `idx_customers_tenant_id`
- `idx_interactions_tenant_id`
- `idx_user_accounts_tenant_id`
- And more...

### Query Performance
RLS policies are applied to every query, so:
- Always include `tenant_id` in WHERE clauses when possible
- Use the service role for bulk operations
- Monitor query performance and add additional indexes if needed

## Security Benefits

With RLS enabled, you get:

1. **Automatic Tenant Isolation** - Users can't access other tenants' data
2. **Defense in Depth** - Even if application logic fails, database enforces isolation
3. **Audit Trail** - All access is logged at the database level
4. **Compliance** - Helps meet data privacy requirements

## Troubleshooting

### Common Issues

1. **No Data Returned**: User might not be associated with a tenant in `user_accounts`
2. **Permission Denied**: Check if user is properly authenticated
3. **Performance Issues**: Ensure indexes on `tenant_id` columns exist
4. **Admin Operations Failing**: Use service role for admin operations

### Debug Queries

```sql
-- Check current user
SELECT auth.uid(), auth.role();

-- Check user's tenant association
SELECT * FROM user_accounts WHERE auth_id = auth.uid()::text;

-- Check tenant function
SELECT get_user_tenant_id();
```

## Maintenance

### Adding New Tables
When adding new tenant-isolated tables:

1. Add `tenant_id` column
2. Enable RLS: `ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;`
3. Create policies similar to existing tables
4. Add performance index on `tenant_id`
5. Grant appropriate permissions

### Updating Policies
To modify existing policies:
```sql
DROP POLICY "policy_name" ON table_name;
CREATE POLICY "new_policy_name" ON table_name FOR ALL USING (condition);
```

## Support

If you encounter issues:
1. Check the verification queries above
2. Review application logs for authentication issues  
3. Verify database connectivity
4. Check that all required environment variables are set 