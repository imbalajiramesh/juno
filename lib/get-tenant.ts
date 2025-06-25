import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function getCurrentTenant() {
  const supabase = await createClient();
  
  // Get the current user from Supabase Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('Authentication error:', authError?.message);
    throw new Error('User not authenticated');
  }

  // Find the tenant associated with this user
  let { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('*')
    .eq('clerk_org_id', user.id)
    .single();

  if (tenantError && tenantError.code !== 'PGRST116') {
    console.error('Error fetching tenant:', tenantError?.message);
    throw new Error('Failed to fetch tenant');
  }

  if (!tenant) {
    // No tenant exists - treat like a new user and create a new tenant
    // This handles both first-time users and users whose organization was deleted
    const tenantId = crypto.randomUUID();
    console.log('Creating new tenant with ID:', tenantId);
    
    const { data: newTenant, error: createTenantError } = await supabase
      .from('tenants')
      .insert({
        id: tenantId,
        clerk_org_id: user.id,
        name: user.email?.split('@')[0] || 'My Organization',
        schema_name: `tenant_${tenantId.replace(/-/g, '_')}`,
        setup_completed: false,
        industry: null,
        description: null,
        size: null,
        location: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createTenantError) {
      // If it's a duplicate key error, try to fetch the existing tenant
      if (createTenantError.code === '23505') {
        console.log('Tenant already exists, fetching existing tenant');
        const { data: existingTenant, error: fetchError } = await supabase
          .from('tenants')
          .select('*')
          .eq('clerk_org_id', user.id)
          .single();
        
        if (fetchError || !existingTenant) {
          console.error('Failed to fetch existing tenant:', fetchError?.message);
          throw new Error('Failed to create or fetch tenant');
        }
        tenant = existingTenant;
      } else {
        console.error('Failed to create tenant:', createTenantError?.message);
        throw new Error('Failed to create tenant');
      }
    } else {
      tenant = newTenant;
      console.log('New tenant created successfully');
    }
  }

  console.log('Current tenant:', tenant?.id);

  // Get default role
  const { data: defaultRole, error: roleError } = await supabase
    .from('roles')
    .select('*')
    .eq('role_name', 'Owner')
    .single();

  const defaultRoleName = defaultRole?.role_name || 'Owner';

  if (roleError && roleError.code !== 'PGRST116') {
    console.warn('Error fetching default role:', roleError?.message);
  }

  // Check if user account exists for this tenant
  let { data: userAccount, error: userAccountError } = await supabase
    .from('user_accounts')
    .select('*')
    .eq('auth_id', user.id)
    .eq('tenant_id', tenant.id)
    .single();

  if (userAccountError && userAccountError.code !== 'PGRST116') {
    console.error('Error fetching user account:', userAccountError?.message);
  }

  if (userAccountError || !userAccount) {
    // Create user account with tenant association and role
    const userAccountId = crypto.randomUUID();
    console.log('Creating new user account with tenant association');
    
    const { data: newUserAccount, error: createUserError } = await supabase
      .from('user_accounts')
      .insert({
        id: userAccountId,
        auth_id: user.id,
        email: user.email || '',
        first_name: user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || '',
        last_name: user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
        tenant_id: tenant.id,
        role_id: defaultRole?.id || null,
        date_of_joining: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createUserError || !newUserAccount) {
      console.error('Failed to create user account:', createUserError?.message);
      throw new Error('Failed to create user account');
    }
    userAccount = newUserAccount;
    console.log('User account created with role:', defaultRoleName);
  }

  return {
    tenant,
    userAccount,
    defaultRole
  };
}

export function withTenant<T extends any[]>(
  handler: (tenantId: string, ...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      const { tenant } = await getCurrentTenant();
      return handler(tenant.id, ...args);
    } catch (error) {
      console.error('Tenant error:', error);
      return NextResponse.json(
        { error: 'Failed to get tenant information' },
        { status: 500 }
      );
    }
  };
} 