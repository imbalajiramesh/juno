import { createClient } from '@/utils/supabase/server';
import { PERMISSIONS, Permission, type UserPermissions } from './permissions';

// Server-side permission checking
export async function checkUserPermission(permission: Permission): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return false;
    }

    const { data, error: permError } = await supabase.rpc('user_has_permission', {
      user_auth_id: user.id,
      permission_name: permission
    });

    if (permError) {
      console.error('Permission check error:', permError);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
}

// Get all user permissions (server-side)
export async function getUserPermissions(): Promise<UserPermissions | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    // Get user account with role
    const { data: userAccount, error: userError } = await supabase
      .from('user_accounts')
      .select(`
        role_id,
        roles:role_id (
          role_name
        )
      `)
      .eq('auth_id', user.id)
      .single();

    if (userError || !userAccount) {
      return null;
    }

    // Get permissions
    const { data: permissions, error: permError } = await supabase.rpc('get_user_permissions', {
      user_auth_id: user.id
    });

    if (permError) {
      console.error('Failed to get user permissions:', permError);
      return null;
    }

    const permissionList = permissions?.map((p: any) => p.permission_name) || [];

    return {
      permissions: permissionList,
      role: userAccount.roles?.role_name || 'agent',
      canAccess: (permission: Permission) => permissionList.includes(permission),
    };
  } catch (error) {
    console.error('Failed to get user permissions:', error);
    return null;
  }
}

// Permission-based route protection middleware
export function createPermissionMiddleware(requiredPermission: Permission) {
  return async function permissionMiddleware() {
    const hasPermission = await checkUserPermission(requiredPermission);
    
    if (!hasPermission) {
      throw new Error(`Access denied. Required permission: ${requiredPermission}`);
    }
    
    return true;
  };
} 