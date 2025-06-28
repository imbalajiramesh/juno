'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, AlertCircle, CheckCircle, XCircle, FileText } from 'lucide-react';
import Link from 'next/link';

interface OrganizationStatus {
  approval_status: string;
  rejection_reason?: string;
  additional_info_requested?: string;
  pending_documents?: number;
}

export default function OrganizationStatusBanner() {
  const [status, setStatus] = useState<OrganizationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganizationStatus();
  }, []);

  const fetchOrganizationStatus = async () => {
    try {
      const response = await fetch('/api/organization/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch organization status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !status) return null;

  // Don't show banner for approved organizations
  if (status.approval_status === 'approved') return null;

  const getStatusConfig = () => {
    switch (status.approval_status) {
      case 'pending':
        return {
          icon: Clock,
          variant: 'default' as const,
          bgColor: 'bg-blue-50 border-blue-200',
          iconColor: 'text-blue-600',
          title: 'Organization Approval Pending',
          message: 'Your organization is under review. This typically takes 2-3 business days.',
          action: 'Upload Documents'
        };
      case 'requires_more_info':
        return {
          icon: AlertCircle,
          variant: 'default' as const,
          bgColor: 'bg-orange-50 border-orange-200',
          iconColor: 'text-orange-600',
          title: 'Additional Information Required',
          message: status.additional_info_requested || 'Please provide additional documentation.',
          action: 'Review Requirements'
        };
      case 'rejected':
        return {
          icon: XCircle,
          variant: 'destructive' as const,
          bgColor: 'bg-red-50 border-red-200',
          iconColor: 'text-red-600',
          title: 'Application Rejected',
          message: status.rejection_reason || 'Please contact support for assistance.',
          action: 'Contact Support'
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={`border-b ${config.bgColor}`}>
      <div className="container py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 ${config.iconColor}`} />
            <div>
              <h3 className="font-medium text-gray-900">{config.title}</h3>
              <p className="text-sm text-gray-700">{config.message}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {status.pending_documents && status.pending_documents > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {status.pending_documents} documents pending
              </Badge>
            )}
            
            <Link href="/settings/documents">
              <Button variant="outline" size="sm">
                {config.action}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 