'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IconUserPlus, IconMail, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { usePermissions, PERMISSIONS, getRoleColor } from '@/lib/permissions';

interface Role {
  id: string;
  role_name: string;
}

interface InviteTeamMemberModalProps {
  trigger?: React.ReactNode;
  onInviteSent?: () => void;
}

export default function InviteTeamMemberModal({ 
  trigger, 
  onInviteSent 
}: InviteTeamMemberModalProps) {
  const { permissions, loading: permissionsLoading } = usePermissions();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    role_id: '',
  });

  useEffect(() => {
    if (open) {
      fetchRoles();
    }
  }, [open]);

  const fetchRoles = async () => {
    try {
      // For now, use hardcoded roles until we have a proper roles API
      // In production, you should create an API endpoint to fetch roles
      const defaultRoles = [
        { id: 'admin-role-id', role_name: 'admin' },
        { id: 'manager-role-id', role_name: 'manager' },
        { id: 'agent-role-id', role_name: 'agent' },
        { id: 'support-role-id', role_name: 'support' },
      ];
      setRoles(defaultRoles);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setError('Failed to load roles');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (value: string) => {
    setFormData({ ...formData, role_id: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.email || !formData.role_id) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send invitation');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setFormData({ email: '', role_id: '' });
      
      if (onInviteSent) {
        onInviteSent();
      }

      // Close modal after short delay
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error sending invitation:', error);
      setError('Failed to send invitation');
      setLoading(false);
    }
  };

  // Check permissions
  if (permissionsLoading) {
    return <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div>;
  }

  if (!permissions?.canAccess(PERMISSIONS.TEAM_INVITE)) {
    return null; // Don't show the button if user can't invite
  }

  const defaultTrigger = (
    <Button className="bg-black hover:bg-gray-800 text-white">
      <IconUserPlus className="mr-2 h-4 w-4" />
      Invite Team Member
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <IconMail className="h-5 w-5" />
            <span>Invite Team Member</span>
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center space-y-4 py-6">
            <IconCheck className="h-12 w-12 text-green-500" />
            <h3 className="text-lg font-medium text-gray-900">Invitation Sent!</h3>
            <p className="text-center text-gray-600">
              An invitation email has been sent to {formData.email}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="colleague@company.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role_id} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center space-x-2">
                        <div 
                          className={`w-2 h-2 rounded-full ${getRoleColor(role.role_name)}`}
                        />
                        <span className="capitalize">{role.role_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium text-sm text-gray-700 mb-2">Role Permissions:</h4>
              {formData.role_id && (
                <div className="text-xs text-gray-600">
                  {getRolePermissionsDescription(
                    roles.find(r => r.id === formData.role_id)?.role_name || ''
                  )}
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <IconAlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-black hover:bg-gray-800 text-white"
              >
                {loading ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function getRolePermissionsDescription(roleName: string): string {
  const descriptions: Record<string, string> = {
    admin: 'Full access to all features including organization settings, billing, and team management.',
    manager: 'Access to most features including customer management, voice agents, and basic team operations.',
    agent: 'Access to customer management, voice calling, email/SMS, and analytics.',
    support: 'Read-only access to customers, calls, and basic analytics.',
  };
  
  return descriptions[roleName] || 'Basic access to the platform.';
} 