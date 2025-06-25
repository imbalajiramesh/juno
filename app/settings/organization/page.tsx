'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  IconDeviceFloppy, 
  IconAlertTriangle, 
  IconBuildingStore, 
  IconSettings, 
  IconUsers, 
  IconPhone, 
  IconMail, 
  IconChartBar, 
  IconTrendingUp, 
  IconMessage, 
  IconCircleCheck 
} from '@tabler/icons-react';

interface Organization {
  id: string;
  name: string;
  schema_name: string;
  clerk_org_id: string;
  industry?: string;
  description?: string;
  size?: string;
  location?: string;
  setup_completed?: boolean;
  vapi_org_id?: string;
  twilio_subaccount_sid?: string;
  created_at: string;
  updated_at: string;
}

interface OrganizationStats {
  customers: {
    total: number;
    new: number;
    qualified: number;
    closedWon: number;
    recent30Days: number;
  };
  communications: {
    calls: {
      total: number;
      totalMinutes: number;
      recent30Days: number;
    };
    emails: {
      total: number;
      recent30Days: number;
    };
    sms: {
      total: number;
      recent30Days: number;
    };
  };
  team: {
    totalMembers: number;
  };
  tasks: {
    total: number;
    completed: number;
    pending: number;
  };
  customization: {
    customFields: number;
  };
}

const industries = [
  'Healthcare',
  'Energy & Utilities',
  'Real Estate',
  'Financial Services',
  'Retail & E-commerce',
  'Technology',
  'Manufacturing',
  'Education',
  'Non-profit',
  'Professional Services',
  'Hospitality',
  'Transportation',
  'Construction',
  'Agriculture',
  'Media & Entertainment',
  'Other'
];

const companySizes = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '500+ employees'
];

export default function OrganizationPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Organization>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  useEffect(() => {
    Promise.all([fetchOrganization(), fetchStats()]);
  }, []);

  const fetchOrganization = async () => {
    try {
      const response = await fetch('/api/organization');
      if (!response.ok) throw new Error('Failed to fetch organization');
      const data = await response.json();
      setOrg(data);
      setFormData(data);
    } catch (error) {
      toast.error('Failed to fetch organization details');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/organization/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch organization stats:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/organization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to update organization');
      
      const updatedOrg = await response.json();
      setOrg(updatedOrg);
      setFormData(updatedOrg);
      setIsEditing(false);
      toast.success('Organization updated successfully');
    } catch (error) {
      toast.error('Failed to update organization');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(org || {});
    setIsEditing(false);
  };

  const handleInputChange = (field: keyof Organization, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDeleteOrganization = async () => {
    if (!org) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch('/api/organization', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: org.name,
          confirmDeletion: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete organization');
      }
      
      toast.success(result.message || 'Organization deleted successfully');
      
      // Show cleanup results if available
      if (result.cleanupResults) {
        const cleanupMapping = {
          vapiOrg: 'Voice calling integration',
          twilioSubaccount: 'SMS messaging integration', 
          resendDomains: 'Email domains',
          voiceAgents: 'Voice agents',
          phoneNumbers: 'Phone numbers'
        };
        
        const cleanedUp = Object.entries(result.cleanupResults)
          .filter(([_, success]) => success)
          .map(([key, _]) => cleanupMapping[key as keyof typeof cleanupMapping] || key);
        
        if (cleanedUp.length > 0) {
          toast.success(`External resources cleaned up: ${cleanedUp.join(', ')}`);
        }
      }

      // Show user note
      if (result.userNote) {
        toast.info(result.userNote, { duration: 5000 });
      }
      
      // Redirect to dashboard - user will get a new organization created automatically
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete organization');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmation('');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <IconBuildingStore className="h-6 w-6" />
            Organization Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your organization details and configuration
          </p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            <IconSettings className="h-4 w-4 mr-2" />
            Edit
          </Button>
        ) : (
          <div className="space-x-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <IconDeviceFloppy className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      {/* Organization Overview */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconChartBar className="h-5 w-5" />
              Organization Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <IconUsers className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">Customers</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{stats.customers.total}</div>
                <div className="text-xs text-blue-600">
                  +{stats.customers.recent30Days} this month
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <IconPhone className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Calls</span>
                </div>
                <div className="text-2xl font-bold text-green-900">{stats.communications.calls.total}</div>
                <div className="text-xs text-green-600">
                  {stats.communications.calls.totalMinutes} minutes total
                </div>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <IconMail className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-600">Emails</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">{stats.communications.emails.total}</div>
                <div className="text-xs text-purple-600">
                  +{stats.communications.emails.recent30Days} this month
                </div>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <IconMessage className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-600">SMS</span>
                </div>
                <div className="text-2xl font-bold text-orange-900">{stats.communications.sms.total}</div>
                <div className="text-xs text-orange-600">
                  +{stats.communications.sms.recent30Days} this month
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <IconUsers className="h-4 w-4" />
                  <span className="font-medium">Team Members</span>
                </div>
                <div className="text-xl font-bold">{stats.team.totalMembers}</div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <IconCircleCheck className="h-4 w-4" />
                  <span className="font-medium">Tasks</span>
                </div>
                <div className="text-xl font-bold">{stats.tasks.total}</div>
                <div className="text-xs text-muted-foreground">
                  {stats.tasks.completed} completed, {stats.tasks.pending} pending
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <IconSettings className="h-4 w-4" />
                  <span className="font-medium">Custom Fields</span>
                </div>
                <div className="text-xl font-bold">{stats.customization.customFields}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconBuildingStore className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={isEditing ? formData.name || '' : org?.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={!isEditing}
                  placeholder="Your organization name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                {isEditing ? (
                  <Select
                    value={formData.industry || ''}
                    onValueChange={(value) => handleInputChange('industry', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={org?.industry || 'Not specified'}
                    disabled
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="size">Company Size</Label>
                {isEditing ? (
                  <Select
                    value={formData.size || ''}
                    onValueChange={(value) => handleInputChange('size', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent>
                      {companySizes.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={org?.size || 'Not specified'}
                    disabled
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Primary Location</Label>
                <Input
                  id="location"
                  value={isEditing ? formData.location || '' : org?.location || ''}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  disabled={!isEditing}
                  placeholder="City, State/Country"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Business Description</Label>
              <Textarea
                id="description"
                value={isEditing ? formData.description || '' : org?.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                disabled={!isEditing}
                placeholder="Describe what your business does..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconSettings className="h-5 w-5" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="id">Organization ID</Label>
                <Input
                  id="id"
                  value={org?.id || ''}
                  disabled
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schema">Database Schema</Label>
                <Input
                  id="schema"
                  value={org?.schema_name || ''}
                  disabled
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="created">Created At</Label>
                <Input
                  id="created"
                  value={org ? new Date(org.created_at).toLocaleString() : ''}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="updated">Last Updated</Label>
                <Input
                  id="updated"
                  value={org ? new Date(org.updated_at).toLocaleString() : ''}
                  disabled
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Setup Status</Label>
              <div className="flex items-center gap-2">
                <Badge variant={org?.setup_completed ? "default" : "secondary"}>
                  {org?.setup_completed ? "Complete" : "Incomplete"}
                </Badge>
                {!org?.setup_completed && (
                  <span className="text-sm text-muted-foreground">
                    Complete the organization setup to unlock all features
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integration Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconUsers className="h-5 w-5" />
              Integration Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Voice Integration */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <IconPhone className="h-4 w-4" />
                  <span className="font-medium">Voice Calls</span>
                </div>
                <Badge variant={org?.vapi_org_id ? "default" : "secondary"}>
                  {org?.vapi_org_id ? "Connected" : "Not Connected"}
                </Badge>
                {org?.vapi_org_id && (
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {org.vapi_org_id}
                  </p>
                )}
              </div>

              {/* SMS Integration */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <IconMessage className="h-4 w-4" />
                  <span className="font-medium">SMS Messages</span>
                </div>
                <Badge variant={org?.twilio_subaccount_sid ? "default" : "secondary"}>
                  {org?.twilio_subaccount_sid ? "Connected" : "Not Connected"}
                </Badge>
                {org?.twilio_subaccount_sid && (
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {org.twilio_subaccount_sid}
                  </p>
                )}
              </div>

              {/* Email Integration */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <IconMail className="h-4 w-4" />
                  <span className="font-medium">Email</span>
                </div>
                <Badge variant="secondary">
                  Not Connected
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <IconAlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              These actions are destructive and cannot be undone. Please proceed with caution.
            </p>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Delete Organization</h3>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your organization and all associated data including customers, calls, emails, and team members.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Delete Organization</Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4">
                      <div>
                        This action cannot be undone. This will permanently delete your
                        organization <strong>&ldquo;{org?.name}&rdquo;</strong> and remove all data including:
                      </div>
                      <ul className="text-sm space-y-1 list-disc pl-4">
                        <li>All customer records and interactions</li>
                        <li>Call logs, email logs, and SMS logs</li>
                        <li>Team members and user accounts</li>
                        <li>Custom fields and configurations</li>
                        <li>Voice agents and phone numbers</li>
                        <li>External integrations (voice, SMS, email)</li>
                      </ul>

                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-red-600">💳</span>
                          <div>
                            <h4 className="font-semibold text-red-800 text-sm">Credits Expiration Warning</h4>
                            <p className="text-red-700 text-xs mt-1">
                              <strong>All credits will expire immediately</strong> and cannot be recovered or transferred. Credits are tied to organizations and will be permanently lost.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-blue-600">📧</span>
                          <div>
                            <h4 className="font-semibold text-blue-800 text-sm">Feedback Welcome</h4>
                            <p className="text-blue-700 text-xs mt-1">
                              You&apos;ll receive a farewell email with our contact info (<strong>contact@laxmint.com</strong>) to share feedback about your experience.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Label htmlFor="delete-confirmation" className="text-sm font-medium">
                          Type <strong>{org?.name}</strong> to confirm deletion:
                        </Label>
                        <Input
                          id="delete-confirmation"
                          value={deleteConfirmation}
                          onChange={(e) => setDeleteConfirmation(e.target.value)}
                          placeholder="Organization name"
                          className="mt-2"
                          autoComplete="off"
                        />
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteOrganization} 
                      disabled={deleteConfirmation !== org?.name || isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Organization'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 