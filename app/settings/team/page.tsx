'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { IconMail, IconX, IconClock } from '@tabler/icons-react';
import InviteTeamMemberModal from '@/components/invite-team-member-modal';
import { usePermissions, PERMISSIONS, PermissionGuard, getRoleColor } from '@/lib/permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TeamMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role?: {
    role_name: string;
  };
  role_id?: string;
  status: string;
  date_of_joining: string;
}

interface Invitation {
  id: string;
  email: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
  role: {
    role_name: string;
  };
  invited_by_user: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function TeamPage() {
  const { permissions, loading: permissionsLoading } = usePermissions();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members');
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [roles, setRoles] = useState<Array<{id: string, role_name: string}>>([]);

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      await Promise.all([
        fetchTeamMembers(),
        fetchInvitations(),
        fetchRoles(),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles');
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/team');
      if (!response.ok) throw new Error('Failed to fetch team members');
      const data = await response.json();
      setMembers(data);
    } catch (error) {
      toast.error('Failed to fetch team members');
    }
  };

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/invitations');
      if (!response.ok) throw new Error('Failed to fetch invitations');
      const data = await response.json();
      setInvitations(data.filter((inv: Invitation) => inv.accepted_at === null));
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
      // Don't show error toast for invitations as it might not be critical
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/invitations?id=${invitationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to cancel invitation');

      toast.success('Invitation cancelled');
      fetchInvitations(); // Refresh invitations
    } catch (error) {
      toast.error('Failed to cancel invitation');
    }
  };

  const handleInviteSent = () => {
    toast.success('Invitation sent successfully!');
    fetchInvitations(); // Refresh invitations to show the new one
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member);
  };

  const handleUpdateMember = async (updatedData: Partial<TeamMember>) => {
    if (!editingMember) return;

    try {
      const response = await fetch('/api/team', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMember.id,
          ...updatedData,
        }),
      });

      if (!response.ok) throw new Error('Failed to update team member');

      toast.success('Team member updated successfully');
      setEditingMember(null);
      fetchTeamMembers(); // Refresh the team members list
    } catch (error) {
      toast.error('Failed to update team member');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-500', text: 'Active' },
      inactive: { color: 'bg-gray-500', text: 'Inactive' },
      pending: { color: 'bg-yellow-500', text: 'Pending' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    
    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    );
  };

  const isInvitationExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (permissionsLoading || isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-200 h-8 w-48 rounded"></div>
        <div className="animate-pulse bg-gray-200 h-64 w-full rounded"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Team Management</h1>
          <p className="text-gray-600">Manage your team members and invitations</p>
        </div>
        <PermissionGuard 
          permission={PERMISSIONS.TEAM_INVITE}
          fallback={
            <Button disabled variant="outline">
              <IconMail className="mr-2 h-4 w-4" />
              Invite Member (No Permission)
            </Button>
          }
        >
          <InviteTeamMemberModal onInviteSent={handleInviteSent} />
        </PermissionGuard>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="members">
            Team Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Pending Invitations ({invitations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No team members found
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="font-medium">
                            {member.first_name} {member.last_name}
                          </div>
                        </TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>
                          {member.role ? (
                            <div className="flex items-center space-x-2">
                              <div 
                                className={`w-2 h-2 rounded-full ${getRoleColor(member.role.role_name)}`}
                              />
                              <span className="capitalize">{member.role.role_name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500">No Role</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(member.status)}
                        </TableCell>
                        <TableCell>
                          {new Date(member.date_of_joining).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <PermissionGuard 
                            permission={PERMISSIONS.TEAM_UPDATE}
                            fallback={<span className="text-gray-400 text-sm">No access</span>}
                          >
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditMember(member)}
                            >
                              Edit
                            </Button>
                          </PermissionGuard>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Invited By</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No pending invitations
                      </TableCell>
                    </TableRow>
                  ) : (
                    invitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <IconMail className="h-4 w-4 text-gray-500" />
                            <span>{invitation.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div 
                              className={`w-2 h-2 rounded-full ${getRoleColor(invitation.role.role_name)}`}
                            />
                            <span className="capitalize">{invitation.role.role_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {invitation.invited_by_user.first_name} {invitation.invited_by_user.last_name}
                        </TableCell>
                        <TableCell>
                          {new Date(invitation.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {isInvitationExpired(invitation.expires_at) ? (
                              <IconX className="h-4 w-4 text-red-500" />
                            ) : (
                              <IconClock className="h-4 w-4 text-yellow-500" />
                            )}
                            <span className={isInvitationExpired(invitation.expires_at) ? 'text-red-500' : ''}>
                              {new Date(invitation.expires_at).toLocaleDateString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <PermissionGuard 
                            permission={PERMISSIONS.TEAM_INVITE}
                            fallback={<span className="text-gray-400 text-sm">No access</span>}
                          >
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleCancelInvitation(invitation.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <IconX className="h-4 w-4" />
                            </Button>
                          </PermissionGuard>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Member Modal */}
      <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
          </DialogHeader>
          {editingMember && (
            <EditMemberForm
              member={editingMember}
              roles={roles}
              onSave={handleUpdateMember}
              onCancel={() => setEditingMember(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Edit Member Form Component
interface EditMemberFormProps {
  member: TeamMember;
  roles: Array<{id: string, role_name: string}>;
  onSave: (data: Partial<TeamMember>) => void;
  onCancel: () => void;
}

function EditMemberForm({ member, roles, onSave, onCancel }: EditMemberFormProps) {
  const [formData, setFormData] = useState({
    first_name: member.first_name || '',
    last_name: member.last_name || '',
    email: member.email,
    role_id: member.role?.role_name || '',
    status: member.status,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find the role ID from role name
    const selectedRole = roles.find(role => role.role_name === formData.role_id);
    
    onSave({
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      role_id: selectedRole?.id,
      status: formData.status,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="last_name">Last Name</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="role">Role</Label>
        <Select value={formData.role_id} onValueChange={(value) => setFormData(prev => ({ ...prev, role_id: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select a role..." />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.role_name}>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getRoleColor(role.role_name)}`} />
                  <span className="capitalize">{role.role_name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save Changes
        </Button>
      </div>
    </form>
  );
} 