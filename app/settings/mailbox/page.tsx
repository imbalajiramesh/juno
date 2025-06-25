'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconPlus, IconMail, IconSettings, IconTrash, IconCheck, IconExternalLink } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface MailboxConfig {
  id: string;
  email_address: string;
  domain: string;
  provider: 'gmail' | 'outlook';
  status: 'active' | 'pending' | 'error';
  connected_at: string;
  last_sync: string;
  unread_count: number;
}

interface DomainConfig {
  domain: string;
  verified: boolean;
  mx_records_configured: boolean;
  spf_configured: boolean;
  dkim_configured: boolean;
}

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  ttl: number;
  description: string;
}

interface DnsRecordsResponse {
  domain: string;
  records: DnsRecord[];
  instructions: {
    title: string;
    steps: string[];
    notes: string[];
  };
}

export default function MailboxPage() {
  const [mailboxes, setMailboxes] = useState<MailboxConfig[]>([]);
  const [domains, setDomains] = useState<DomainConfig[]>([]);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
  const [isDnsModalOpen, setIsDnsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [dnsRecords, setDnsRecords] = useState<DnsRecordsResponse | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('');

  const [connectForm, setConnectForm] = useState({
    provider: '',
    domain: '',
    create_address: 'juno',
    connectionMethod: 'domain' as 'domain' | 'direct',
  });

  const [domainForm, setDomainForm] = useState({
    domain: '',
  });

  useEffect(() => {
    fetchMailboxData();
  }, []);

  const fetchMailboxData = async () => {
    try {
      const [mailboxResponse, domainsResponse] = await Promise.all([
        fetch('/api/mailbox'),
        fetch('/api/mailbox/domains')
      ]);
      
      if (mailboxResponse.ok) {
        const mailboxData = await mailboxResponse.json();
        setMailboxes(mailboxData);
      }
      
      if (domainsResponse.ok) {
        const domainsData = await domainsResponse.json();
        setDomains(domainsData);
      }
    } catch (error) {
      console.error('Error fetching mailbox data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectProvider = async () => {
    if (!connectForm.provider) {
      toast.error('Please select a provider');
      return;
    }
    
    if (connectForm.connectionMethod === 'domain' && !connectForm.domain) {
      toast.error('Please select a domain');
      return;
    }

    setIsConnecting(true);
    try {
      const response = await fetch('/api/mailbox/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: connectForm.provider,
          connection_method: connectForm.connectionMethod,
          domain: connectForm.domain,
          email_prefix: connectForm.create_address,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.auth_url) {
          // Redirect to OAuth flow
          window.location.href = result.auth_url;
        } else {
          toast.success('Mailbox connected successfully!');
          setIsConnectModalOpen(false);
          fetchMailboxData();
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to connect mailbox');
      }
    } catch (error) {
      console.error('Error connecting mailbox:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect mailbox');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAddDomain = async () => {
    if (!domainForm.domain) {
      toast.error('Please enter a domain name');
      return;
    }

    try {
      const response = await fetch('/api/mailbox/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainForm.domain }),
      });

      if (response.ok) {
        toast.success('Domain added! Please configure DNS records to verify.');
        setIsDomainModalOpen(false);
        setDomainForm({ domain: '' });
        fetchMailboxData();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add domain');
      }
    } catch (error) {
      console.error('Error adding domain:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add domain');
    }
  };

  const handleConfigureDns = async (domain: string) => {
    setSelectedDomain(domain);
    try {
      const response = await fetch(`/api/mailbox/domains/${domain}/dns`);
      if (response.ok) {
        const dnsData = await response.json();
        setDnsRecords(dnsData);
        setIsDnsModalOpen(true);
      } else {
        throw new Error('Failed to fetch DNS records');
      }
    } catch (error) {
      console.error('Error fetching DNS records:', error);
      toast.error('Failed to load DNS configuration');
    }
  };

  const verifiedDomains = domains.filter(d => d.verified);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Juno Mailbox</h1>
          <p className="text-muted-foreground">
            Connect your email providers and create professional mailboxes with custom domains
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsDomainModalOpen(true)}>
            <IconPlus className="mr-2 h-4 w-4" />
            Add Domain
          </Button>
          <Button onClick={() => setIsConnectModalOpen(true)}>
            <IconPlus className="mr-2 h-4 w-4" />
            Connect Mailbox
          </Button>
        </div>
      </div>

      {/* Email Pricing Information */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center mb-3">
                <IconMail className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="font-semibold text-blue-900">Email Pricing</h3>
              </div>
              <div className="text-2xl font-bold text-blue-900 mb-1">1</div>
              <p className="text-sm text-blue-700">credit per email sent</p>
                             <div className="mt-2 text-xs text-blue-600">
                 • Professional email delivery
                 • High deliverability rates & authentication
                 • Real-time sending with detailed analytics
               </div>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Mailboxes */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Connected Mailboxes</h2>
        
        {isLoading ? (
          <Card className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </CardContent>
          </Card>
        ) : mailboxes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <IconMail className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No mailboxes connected</h3>
              <p className="text-muted-foreground text-center mb-4">
                Connect Google Workspace or Microsoft Outlook to create professional email addresses for your team
              </p>
              <Button onClick={() => setIsConnectModalOpen(true)}>
                <IconMail className="mr-2 h-4 w-4" />
                Connect Your First Mailbox
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mailboxes.map((mailbox) => (
              <Card key={mailbox.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{mailbox.email_address}</CardTitle>
                      <div className="flex items-center gap-2">
                        {mailbox.provider === 'gmail' ? (
                          <div className="w-4 h-4 bg-red-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">G</div>
                        ) : (
                          <div className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center text-white text-xs font-bold">O</div>
                        )}
                        <p className="text-sm text-muted-foreground">
                          via {mailbox.provider === 'gmail' ? 'Google Workspace' : 'Microsoft Outlook'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={mailbox.status === 'active' ? 'default' : 'secondary'}>
                      {mailbox.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Unread emails</span>
                      <span className="font-medium">{mailbox.unread_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Last sync</span>
                      <span className="text-sm">{new Date(mailbox.last_sync).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <IconSettings className="mr-2 h-4 w-4" />
                        Configure
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => window.open(`/mailbox/${mailbox.id}`, '_blank')}
                      >
                        <IconExternalLink className="mr-2 h-4 w-4" />
                        Open Mailbox
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Domain Configuration */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Custom Domains</h2>
        
        {domains.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                Add a custom domain to create professional email addresses like juno@yourcompany.com
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {domains.map((domain) => (
              <Card key={domain.domain}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{domain.domain}</h3>
                      <div className="flex gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          {domain.verified ? <IconCheck className="h-4 w-4 text-green-500" /> : <div className="w-4 h-4 rounded-full bg-gray-300" />}
                          <span className="text-sm">Verified</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {domain.mx_records_configured ? <IconCheck className="h-4 w-4 text-green-500" /> : <div className="w-4 h-4 rounded-full bg-gray-300" />}
                          <span className="text-sm">MX Records</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {domain.spf_configured ? <IconCheck className="h-4 w-4 text-green-500" /> : <div className="w-4 h-4 rounded-full bg-gray-300" />}
                          <span className="text-sm">SPF</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {domain.dkim_configured ? <IconCheck className="h-4 w-4 text-green-500" /> : <div className="w-4 h-4 rounded-full bg-gray-300" />}
                          <span className="text-sm">DKIM</span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleConfigureDns(domain.domain)}
                    >
                      Configure DNS
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Connect Mailbox Modal */}
      <Dialog open={isConnectModalOpen} onOpenChange={setIsConnectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Email Provider</DialogTitle>
            <DialogDescription>
              Connect Google Workspace or Microsoft Outlook to create a professional mailbox with your custom domain
            </DialogDescription>
          </DialogHeader>

                      <div className="space-y-4">
              <div className="space-y-2">
                <Label>Connection Method</Label>
                <Select 
                  value={connectForm.connectionMethod || 'domain'} 
                  onValueChange={(value) => setConnectForm(prev => ({ ...prev, connectionMethod: value as 'domain' | 'direct' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose connection method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="domain">Use Custom Domain (Advanced)</SelectItem>
                    <SelectItem value="direct">Sign In with Existing Account (Simple)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {connectForm.connectionMethod === 'direct' 
                    ? 'Sign in with an existing juno@yourdomain.com email account - emails sync automatically in real-time'
                    : 'Connect a custom domain and create new email addresses - requires DNS configuration'
                  }
                </p>
              </div>

              <div className="space-y-2">
                <Label>Email Provider</Label>
                <Select value={connectForm.provider} onValueChange={(value) => setConnectForm(prev => ({ ...prev, provider: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">G</div>
                        Google Workspace
                      </div>
                    </SelectItem>
                    <SelectItem value="outlook">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center text-white text-xs font-bold">O</div>
                        Microsoft Outlook
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

            {connectForm.connectionMethod === 'domain' && (
              <>
                <div className="space-y-2">
                  <Label>Domain</Label>
                  <Select 
                    value={connectForm.domain} 
                    onValueChange={(value) => setConnectForm(prev => ({ ...prev, domain: value }))}
                    disabled={verifiedDomains.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={verifiedDomains.length === 0 ? "No verified domains" : "Select domain"} />
                    </SelectTrigger>
                    <SelectContent>
                      {verifiedDomains.map((domain) => (
                        <SelectItem key={domain.domain} value={domain.domain}>
                          {domain.domain}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {verifiedDomains.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Please add and verify a domain first
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Email Address Prefix</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={connectForm.create_address}
                      onChange={(e) => setConnectForm(prev => ({ ...prev, create_address: e.target.value }))}
                      placeholder="juno"
                    />
                    <span className="text-muted-foreground">@{connectForm.domain || 'domain.com'}</span>
                  </div>
                </div>
              </>
            )}

            {connectForm.connectionMethod === 'direct' && (
              <div className="space-y-2">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Quick Setup Instructions:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Create a new email account: <code className="bg-blue-100 px-1 rounded">juno@yourdomain.com</code></li>
                    <li>Use this same email for your {connectForm.provider === 'gmail' ? 'Google Workspace' : 'Microsoft Outlook'} account</li>
                    <li>Click "Connect" below to sign in with that account</li>
                  </ol>
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                    <p className="text-xs text-green-700 font-medium">✓ Real-time Email Sync</p>
                    <p className="text-xs text-green-600">
                      New emails automatically appear in Juno. Send and receive seamlessly.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsConnectModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConnectProvider} 
              disabled={isConnecting || !connectForm.provider || (connectForm.connectionMethod === 'domain' && !connectForm.domain)}
            >
              {isConnecting ? 'Connecting...' : (connectForm.connectionMethod === 'direct' ? 'Sign In' : 'Connect')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Domain Modal */}
      <Dialog open={isDomainModalOpen} onOpenChange={setIsDomainModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Domain</DialogTitle>
            <DialogDescription>
              Add your custom domain to create professional email addresses
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Domain Name</Label>
              <Input
                value={domainForm.domain}
                onChange={(e) => setDomainForm({ domain: e.target.value })}
                placeholder="yourcompany.com"
              />
              <p className="text-sm text-muted-foreground">
                Enter your domain name without "www" or "http://"
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsDomainModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDomain} disabled={!domainForm.domain}>
              Add Domain
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DNS Configuration Modal */}
      <Dialog open={isDnsModalOpen} onOpenChange={setIsDnsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>DNS Configuration for {selectedDomain}</DialogTitle>
            <DialogDescription>
              Add these DNS records to your domain registrar to enable email functionality
            </DialogDescription>
          </DialogHeader>

          {dnsRecords && (
            <div className="space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">{dnsRecords.instructions.title}</h3>
                <ol className="text-sm text-blue-800 space-y-1 mb-3">
                  {dnsRecords.instructions.steps.map((step, index) => (
                    <li key={index} className="flex">
                      <span className="font-medium mr-2">{index + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-1">Important Notes:</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    {dnsRecords.instructions.notes.map((note, index) => (
                      <li key={index} className="flex">
                        <span className="mr-2">•</span>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* DNS Records */}
              <div className="space-y-4">
                <h3 className="font-semibold">DNS Records to Add</h3>
                {dnsRecords.records.map((record, index) => (
                  <Card key={index} className="border">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <Badge variant="secondary" className="text-xs">
                            {record.type}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            {record.description}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(record.value);
                            toast.success('Value copied to clipboard!');
                          }}
                        >
                          Copy Value
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <Label className="text-xs text-muted-foreground">Name/Host</Label>
                          <code className="block bg-gray-100 p-2 rounded text-xs mt-1 break-all">
                            {record.name}
                          </code>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-xs text-muted-foreground">Value</Label>
                          <code className="block bg-gray-100 p-2 rounded text-xs mt-1 break-all">
                            {record.value}
                          </code>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-3 pt-3 border-t">
                        <div className="text-xs text-muted-foreground">
                          TTL: {record.ttl} seconds
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const recordText = `Type: ${record.type}\nName: ${record.name}\nValue: ${record.value}\nTTL: ${record.ttl}`;
                            navigator.clipboard.writeText(recordText);
                            toast.success('Record details copied!');
                          }}
                        >
                          Copy Record
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Verification Status */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2">Verification</h4>
                <p className="text-sm text-yellow-800 mb-3">
                  After adding all DNS records, it may take 24-48 hours for changes to propagate. 
                  You can check verification status on the main mailbox page.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    fetchMailboxData();
                    toast.info('Domain status refreshed');
                  }}
                >
                  Refresh Status
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsDnsModalOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 