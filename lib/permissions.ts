import React from 'react';
import { createClient as createClientClient } from '@/utils/supabase/client';

// Permission definitions
export const PERMISSIONS = {
  // Customer management
  CUSTOMERS_READ: 'customers.read',
  CUSTOMERS_CREATE: 'customers.create',
  CUSTOMERS_UPDATE: 'customers.update',
  CUSTOMERS_DELETE: 'customers.delete',
  CUSTOMERS_EXPORT: 'customers.export',
  CUSTOMERS_IMPORT: 'customers.import',

  // Team management
  TEAM_READ: 'team.read',
  TEAM_INVITE: 'team.invite',
  TEAM_UPDATE: 'team.update',
  TEAM_DELETE: 'team.delete',
  TEAM_MANAGE_ROLES: 'team.manage_roles',

  // Settings
  SETTINGS_ORGANIZATION: 'settings.organization',
  SETTINGS_CUSTOM_FIELDS: 'settings.custom_fields',
  SETTINGS_INTEGRATIONS: 'settings.integrations',
  SETTINGS_BILLING: 'settings.billing',

  // Voice agents
  VOICE_AGENTS_READ: 'voice_agents.read',
  VOICE_AGENTS_CREATE: 'voice_agents.create',
  VOICE_AGENTS_UPDATE: 'voice_agents.update',
  VOICE_AGENTS_DELETE: 'voice_agents.delete',
  VOICE_AGENTS_TEST: 'voice_agents.test',

  // Phone numbers
  PHONE_NUMBERS_READ: 'phone_numbers.read',
  PHONE_NUMBERS_PURCHASE: 'phone_numbers.purchase',
  PHONE_NUMBERS_MANAGE: 'phone_numbers.manage',

  // Mailbox
  MAILBOX_READ: 'mailbox.read',
  MAILBOX_SEND: 'mailbox.send',
  MAILBOX_MANAGE_DOMAINS: 'mailbox.manage_domains',

  // Analytics
  ANALYTICS_READ: 'analytics.read',
  ANALYTICS_EXPORT: 'analytics.export',

  // Credits
  CREDITS_READ: 'credits.read',
  CREDITS_PURCHASE: 'credits.purchase',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export interface UserPermissions {
  permissions: string[];
  role: string;
  canAccess: (permission: Permission) => boolean;
}

// Client-side permission checking hook
export function usePermissions() {
  const [permissions, setPermissions] = React.useState<UserPermissions | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchPermissions() {
      try {
        const supabase = createClientClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          setPermissions(null);
          setLoading(false);
          return;
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
          console.warn('User account not found or missing role:', userError?.message);
          setPermissions({
            permissions: [],
            role: 'none',
            canAccess: () => false,
          });
          setLoading(false);
          return;
        }

        // Get permissions via API endpoint (since we can't use RPC from client)
        const permissionsResponse = await fetch('/api/user/permissions');
        
        if (!permissionsResponse.ok) {
          console.warn('Failed to fetch permissions from API');
          setPermissions({
            permissions: [],
            role: userAccount.roles?.role_name || 'none',
            canAccess: () => false,
          });
          setLoading(false);
          return;
        }

        const { permissions: userPermissions } = await permissionsResponse.json();
        const permissionList = userPermissions?.map((p: any) => p.permission_name) || [];

        setPermissions({
          permissions: permissionList,
          role: userAccount.roles?.role_name || 'none',
          canAccess: (permission: Permission) => permissionList.includes(permission),
        });
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
        setPermissions({
          permissions: [],
          role: 'none',
          canAccess: () => false,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchPermissions();
  }, []);

  return { permissions, loading };
}

// Helper function to get role hierarchy level (for UI styling, etc.)
export function getRoleLevel(role: string): number {
  const levels: Record<string, number> = {
    'admin': 4,
    'manager': 3,
    'agent': 2,
    'support': 1,
  };
  return levels[role] || 1;
}

// Helper function to get role color for UI
export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    'admin': 'bg-red-500',
    'manager': 'bg-blue-500',
    'agent': 'bg-green-500',
    'support': 'bg-gray-500',
  };
  return colors[role] || 'bg-gray-500';
}

// Permission-based component wrapper
interface PermissionGuardProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  role?: string; // Optional role-based check
}

export function PermissionGuard({ 
  permission, 
  children, 
  fallback = null,
  role 
}: PermissionGuardProps) {
  const { permissions, loading } = usePermissions();

  if (loading) {
    return React.createElement('div', { className: 'animate-pulse bg-gray-200 h-4 w-24 rounded' });
  }

  if (!permissions) {
    return React.createElement(React.Fragment, null, fallback);
  }

  const hasPermission = permissions.canAccess(permission);
  const hasRole = role ? permissions.role === role : true;

  if (hasPermission && hasRole) {
    return React.createElement(React.Fragment, null, children);
  }

  return React.createElement(React.Fragment, null, fallback);
}

export default PERMISSIONS; 