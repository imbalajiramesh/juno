'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertCircle, Clock, FileText, Users, Building2, TrendingUp, Phone, CreditCard, Trash2, Plus, Minus, DollarSign, ExternalLink, Shield, Database } from 'lucide-react';
import { SuperAdminDashboardSkeleton, DocumentsSkeleton } from '@/components/skeletons/super-admin-skeleton';

interface Organization {
  id: string;
  name: string;
  approval_status: string;
  created_at: string;
  business_use_case?: string;
  messaging_volume_monthly?: number;
  admin_email: string;
  admin_name: string;
  document_count: number;
  rejection_reason?: string;
  additional_info_requested?: string;
  external_accounts: {
    vapi_org_id?: string;
    twilio_subaccount_sid?: string;
    resend_domain_id?: string;
  };
  credit_balance: number;
}

interface PhoneNumber {
  id: string;
  phone_number: string;
  status: string;
  created_at: string;
  twilio_sid?: string;
  vapi_phone_number_id?: string;
}

interface CreditTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

interface Stats {
  pending_approvals: number;
  info_required: number;
  approved_orgs: number;
  rejected_orgs: number;
  total_organizations: number;
  avg_approval_days: number;
}

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  file_size: number;
  status: string;
  upload_date: string;
  rejection_reason?: string;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject' | 'request_info';
    reason: string;
  }>({ open: false, action: 'approve', reason: '' });

  // Enhanced management state
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [managementDialog, setManagementDialog] = useState<{
    open: boolean;
    type: 'credit' | 'delete_account' | 'delete_phone';
    data?: any;
  }>({ open: false, type: 'credit' });
  const [creditForm, setCreditForm] = useState({
    amount: '',
    reason: '',
    transaction_type: 'credit_adjustment'
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({ open: false, title: '', message: '', action: () => {} });

  useEffect(() => {
    checkSuperAdminAccess();
    fetchData();
  }, []);

  const checkSuperAdminAccess = async () => {
    try {
      const response = await fetch('/api/super-admin/auth-check');
      if (!response.ok) {
        toast.error('Access denied. Super admin privileges required.');
        router.push('/settings');
        return;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/settings');
    }
  };

  const fetchData = async () => {
    try {
      const [orgsResponse, statsResponse] = await Promise.all([
        fetch('/api/super-admin/organizations'),
        fetch('/api/super-admin/stats')
      ]);

      if (orgsResponse.ok && statsResponse.ok) {
        const orgsData = await orgsResponse.json();
        const statsData = await statsResponse.json();
        setOrganizations(orgsData);
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (tenantId: string) => {
    setDocumentsLoading(true);
    try {
      const response = await fetch(`/api/super-admin/organizations/${tenantId}/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const fetchPhoneNumbers = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/super-admin/organizations/${tenantId}/phone-numbers`);
      if (response.ok) {
        const data = await response.json();
        setPhoneNumbers(data.phone_numbers || []);
      }
    } catch (error) {
      console.error('Failed to fetch phone numbers:', error);
    }
  };

  const fetchCreditDetails = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/super-admin/organizations/${tenantId}/credits`);
      if (response.ok) {
        const data = await response.json();
        setCreditTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Failed to fetch credit details:', error);
    }
  };

  const handleOrgClick = (org: Organization) => {
    setSelectedOrg(org);
    setDocuments([]);
    setPhoneNumbers([]);
    setCreditTransactions([]);
    // Fetch all organization details
    fetchDocuments(org.id);
    fetchPhoneNumbers(org.id);
    fetchCreditDetails(org.id);
  };

  const handleStatusUpdate = async () => {
    if (!selectedOrg) return;

    try {
      const response = await fetch('/api/super-admin/organizations/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: selectedOrg.id,
          status: actionDialog.action,
          reason: actionDialog.reason
        })
      });

      if (response.ok) {
        toast.success(`Organization ${actionDialog.action}d successfully`);
        setActionDialog({ open: false, action: 'approve', reason: '' });
        setSelectedOrg(null);
        fetchData(); // Refresh data
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Status update failed:', error);
      toast.error('Failed to update organization status');
    }
  };

  const handleCreditManagement = async () => {
    if (!selectedOrg) return;

    const amount = parseFloat(creditForm.amount);
    if (isNaN(amount) || amount === 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const response = await fetch(`/api/super-admin/organizations/${selectedOrg.id}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          reason: creditForm.reason,
          transaction_type: creditForm.transaction_type
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setManagementDialog({ open: false, type: 'credit' });
        setCreditForm({ amount: '', reason: '', transaction_type: 'credit_adjustment' });
        // Refresh data
        fetchData();
        fetchCreditDetails(selectedOrg.id);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update credits');
      }
    } catch (error) {
      console.error('Credit management failed:', error);
      toast.error('Failed to update credits');
    }
  };

  const handleDeleteExternalAccount = async (accountType: 'vapi' | 'twilio' | 'resend') => {
    if (!selectedOrg) return;

    try {
      const response = await fetch(`/api/super-admin/organizations/${selectedOrg.id}/external-accounts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_type: accountType })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        fetchData(); // Refresh organization data
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to delete ${accountType} account`);
      }
    } catch (error) {
      console.error(`${accountType} deletion failed:`, error);
      toast.error(`Failed to delete ${accountType} account`);
    }
  };

  const handleDeletePhoneNumber = async (phoneNumberId: string) => {
    if (!selectedOrg) return;

    try {
      const response = await fetch(`/api/super-admin/organizations/${selectedOrg.id}/phone-numbers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number_id: phoneNumberId })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        fetchPhoneNumbers(selectedOrg.id); // Refresh phone numbers
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete phone number');
      }
    } catch (error) {
      console.error('Phone number deletion failed:', error);
      toast.error('Failed to delete phone number');
    }
  };

  const confirmAction = (title: string, message: string, action: () => void) => {
    setConfirmDialog({
      open: true,
      title,
      message,
      action
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      approved: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      rejected: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
      requires_more_info: { variant: 'outline' as const, icon: AlertCircle, color: 'text-orange-600' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`w-3 h-3 ${config.color}`} />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getDocumentTypeName = (type: string) => {
    const types: Record<string, string> = {
      business_registration: 'Business Registration',
      tax_id: 'Tax ID',
      address_proof: 'Address Proof',
      business_license: 'Business License',
      partnership_agreement: 'Partnership Agreement',
      utility_bill: 'Utility Bill',
      lease_agreement: 'Lease Agreement',
      duns_number: 'DUNS Number',
      website_verification: 'Website Verification',
      privacy_policy: 'Privacy Policy',
      terms_of_service: 'Terms of Service',
      message_templates: 'Message Templates',
      opt_in_flow: 'Opt-in Flow'
    };
    return types[type] || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return <SuperAdminDashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage organization approvals and system oversight</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending_approvals}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Info Required</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.info_required}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved Organizations</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved_orgs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Approval Time</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.avg_approval_days ? `${stats.avg_approval_days.toFixed(1)}d` : 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Organizations List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>Click on an organization to view details and manage</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pending" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="requires_more_info">Info Required</TabsTrigger>
                  <TabsTrigger value="approved">Approved</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected</TabsTrigger>
                </TabsList>

                {['pending', 'requires_more_info', 'approved', 'rejected'].map(status => (
                  <TabsContent key={status} value={status}>
                    <div className="space-y-4">
                      {organizations
                        .filter(org => org.approval_status === status)
                        .map(org => (
                          <div
                            key={org.id}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                              selectedOrg?.id === org.id ? 'border-blue-500 bg-blue-50' : ''
                            }`}
                            onClick={() => handleOrgClick(org)}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{org.name}</h3>
                                <p className="text-sm text-gray-600">{org.admin_email}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Created: {new Date(org.created_at).toLocaleDateString()}
                                </p>
                                
                                {/* Credit Balance */}
                                <div className="flex items-center gap-2 mt-2">
                                  <CreditCard className="w-4 h-4 text-green-600" />
                                  <span className="text-sm font-medium text-green-600">
                                    {org.credit_balance.toLocaleString()} credits
                                  </span>
                                </div>

                                {/* External Accounts Status */}
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="flex gap-1">
                                    {org.external_accounts.vapi_org_id && (
                                      <Badge variant="outline" className="text-xs">VAPI</Badge>
                                    )}
                                    {org.external_accounts.twilio_subaccount_sid && (
                                      <Badge variant="outline" className="text-xs">Twilio</Badge>
                                    )}
                                    {org.external_accounts.resend_domain_id && (
                                      <Badge variant="outline" className="text-xs">Resend</Badge>
                                    )}
                                  </div>
                                </div>

                                {org.business_use_case && (
                                  <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                                    {org.business_use_case}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {getStatusBadge(org.approval_status)}
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <FileText className="w-3 h-3" />
                                  {org.document_count} docs
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                      {organizations.filter(org => org.approval_status === status).length === 0 && (
                        <p className="text-gray-500 text-center py-8">
                          No organizations with {status.replace('_', ' ')} status
                        </p>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Organization Details */}
        <div>
          {selectedOrg ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {selectedOrg.name}
                </CardTitle>
                <CardDescription>
                  Manage organization details and external accounts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Organization Info */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Organization Status</h4>
                    {getStatusBadge(selectedOrg.approval_status)}
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Admin:</span> {selectedOrg.admin_name}</p>
                    <p><span className="font-medium">Email:</span> {selectedOrg.admin_email}</p>
                    <p><span className="font-medium">Created:</span> {new Date(selectedOrg.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Credit Management */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Credits
                    </h4>
                    <span className="text-lg font-bold text-green-600">
                      {selectedOrg.credit_balance.toLocaleString()}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setManagementDialog({ open: true, type: 'credit' })}
                    className="w-full"
                  >
                    <DollarSign className="w-4 h-4 mr-1" />
                    Manage Credits
                  </Button>
                </div>

                {/* External Accounts */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    External Accounts
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">VAPI</span>
                      {selectedOrg.external_accounts.vapi_org_id ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="text-xs">Connected</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => confirmAction(
                              'Delete VAPI Account',
                              'Are you sure you want to delete the VAPI organization? This action cannot be undone.',
                              () => handleDeleteExternalAccount('vapi')
                            )}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Not Connected</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Twilio</span>
                      {selectedOrg.external_accounts.twilio_subaccount_sid ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="text-xs">Connected</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => confirmAction(
                              'Delete Twilio Account',
                              'Are you sure you want to close the Twilio subaccount? This action cannot be undone.',
                              () => handleDeleteExternalAccount('twilio')
                            )}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Not Connected</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm">Resend</span>
                      {selectedOrg.external_accounts.resend_domain_id ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="text-xs">Connected</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => confirmAction(
                              'Delete Resend Domain',
                              'Are you sure you want to delete the Resend domain? This action cannot be undone.',
                              () => handleDeleteExternalAccount('resend')
                            )}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Not Connected</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Phone Numbers */}
                {phoneNumbers.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone Numbers ({phoneNumbers.length})
                    </h4>
                    <div className="space-y-2">
                      {phoneNumbers.map(phone => (
                        <div key={phone.id} className="flex items-center justify-between text-sm">
                          <span className="font-mono">{phone.phone_number}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => confirmAction(
                              'Delete Phone Number',
                              `Are you sure you want to delete ${phone.phone_number}? This will release it from all services.`,
                              () => handleDeletePhoneNumber(phone.id)
                            )}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents Tab */}
                <Tabs defaultValue="documents" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="credits">Credits</TabsTrigger>
                    <TabsTrigger value="actions">Actions</TabsTrigger>
                  </TabsList>

                  <TabsContent value="documents" className="mt-4">
                    {documentsLoading ? (
                      <DocumentsSkeleton />
                    ) : (
                      <div className="space-y-3">
                        {documents.length > 0 ? (
                          documents.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between text-sm p-2 border rounded">
                              <div>
                                <p className="font-medium">{getDocumentTypeName(doc.document_type)}</p>
                                <p className="text-xs text-gray-500">{doc.file_name}</p>
                              </div>
                              <Badge variant={doc.status === 'approved' ? 'default' : doc.status === 'rejected' ? 'destructive' : 'secondary'}>
                                {doc.status}
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-center py-4">No documents uploaded</p>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="credits" className="mt-4">
                    <div className="space-y-3">
                      {creditTransactions.length > 0 ? (
                        creditTransactions.slice(0, 10).map(transaction => (
                          <div key={transaction.id} className="flex items-center justify-between text-sm p-2 border rounded">
                            <div>
                              <p className="font-medium">{transaction.description}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(transaction.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <span className={`font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">No credit transactions</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="actions" className="mt-4">
                    <div className="space-y-3">
                      {selectedOrg.approval_status === 'pending' && (
                        <Button
                          onClick={() => setActionDialog({ open: true, action: 'approve', reason: '' })}
                          className="w-full"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve Organization
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        onClick={() => setActionDialog({ open: true, action: 'request_info', reason: '' })}
                        className="w-full"
                      >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Request Additional Info
                      </Button>
                      
                      <Button
                        variant="destructive"
                        onClick={() => setActionDialog({ open: true, action: 'reject', reason: '' })}
                        className="w-full"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Organization
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Organization Selected</h3>
                <p className="text-gray-500">
                  Select an organization from the list to view details and manage accounts
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Status Update Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === 'approve' && 'Approve Organization'}
              {actionDialog.action === 'reject' && 'Reject Organization'}
              {actionDialog.action === 'request_info' && 'Request Additional Information'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === 'approve' && 'This will approve the organization and provision external accounts.'}
              {actionDialog.action === 'reject' && 'Provide a reason for rejecting this organization.'}
              {actionDialog.action === 'request_info' && 'Specify what additional information is needed.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">
                {actionDialog.action === 'approve' ? 'Approval Notes (Optional)' : 'Reason'}
              </Label>
              <Textarea
                id="reason"
                value={actionDialog.reason}
                onChange={(e) => setActionDialog({ ...actionDialog, reason: e.target.value })}
                placeholder={
                  actionDialog.action === 'approve' 
                    ? 'Optional notes for approval...'
                    : actionDialog.action === 'reject'
                    ? 'Explain why this organization is being rejected...'
                    : 'Specify what additional information or documents are needed...'
                }
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ ...actionDialog, open: false })}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate}>
              {actionDialog.action === 'approve' && 'Approve'}
              {actionDialog.action === 'reject' && 'Reject'}
              {actionDialog.action === 'request_info' && 'Request Info'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Management Dialog */}
      <Dialog open={managementDialog.open && managementDialog.type === 'credit'} onOpenChange={(open) => setManagementDialog({ ...managementDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Credits</DialogTitle>
            <DialogDescription>
              Add or remove credits for {selectedOrg?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={creditForm.amount}
                onChange={(e) => setCreditForm({ ...creditForm, amount: e.target.value })}
                placeholder="Enter amount (positive to add, negative to remove)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter positive numbers to add credits, negative numbers to remove credits
              </p>
            </div>
            <div>
              <Label htmlFor="transaction_type">Transaction Type</Label>
              <Select
                value={creditForm.transaction_type}
                onValueChange={(value) => setCreditForm({ ...creditForm, transaction_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_adjustment">Credit Adjustment</SelectItem>
                  <SelectItem value="credit_bonus">Credit Bonus</SelectItem>
                  <SelectItem value="credit_refund">Credit Refund</SelectItem>
                  <SelectItem value="credit_penalty">Credit Penalty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="credit_reason">Reason</Label>
              <Textarea
                id="credit_reason"
                value={creditForm.reason}
                onChange={(e) => setCreditForm({ ...creditForm, reason: e.target.value })}
                placeholder="Explain the reason for this credit adjustment..."
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManagementDialog({ ...managementDialog, open: false })}>
              Cancel
            </Button>
            <Button onClick={handleCreditManagement}>
              Update Credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>
              {confirmDialog.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                confirmDialog.action();
                setConfirmDialog({ ...confirmDialog, open: false });
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 