'use client';

import { useState } from 'react';
import { AlertTriangle, Building, Trash2, DollarSign, Phone, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface OrganizationDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: {
    id: string;
    name: string;
    campaigns: Array<{
      id: string;
      name: string;
      monthly_cost: number;
      status: string;
    }>;
    phone_numbers: number;
    total_monthly_cost: number;
    brand_registrations: number;
  };
  onDelete: (orgId: string, options: { 
    cancel_campaigns: boolean; 
    release_numbers: boolean; 
    reason?: string;
  }) => Promise<void>;
}

export function OrganizationDeletionModal({ 
  isOpen, 
  onClose, 
  organization, 
  onDelete 
}: OrganizationDeletionModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [cancelCampaigns, setCancelCampaigns] = useState(true);
  const [releaseNumbers, setReleaseNumbers] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [reason, setReason] = useState('');

  const handleDelete = async () => {
    if (!confirmChecked) return;
    
    setIsDeleting(true);
    try {
      await onDelete(organization.id, {
        cancel_campaigns: cancelCampaigns,
        release_numbers: releaseNumbers,
        reason
      });
      onClose();
    } catch (error) {
      console.error('Failed to delete organization:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const activeCampaigns = organization.campaigns.filter(c => c.status === 'active');
  const totalMonthlySavings = cancelCampaigns ? organization.total_monthly_cost : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Building className="h-5 w-5" />
            Delete Organization: {organization.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Organization Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{organization.campaigns.length}</div>
                <div className="text-gray-600">Active Campaigns</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{organization.phone_numbers}</div>
                <div className="text-gray-600">Phone Numbers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{organization.brand_registrations}</div>
                <div className="text-gray-600">Brand Registrations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{organization.total_monthly_cost}</div>
                <div className="text-gray-600">Credits/Month</div>
              </div>
            </div>
          </div>

          {/* Critical Warning */}
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Warning:</strong> Deleting this organization will permanently remove all data, 
              cancel active campaigns, and may release phone numbers. This action cannot be undone.
            </AlertDescription>
          </Alert>

          {/* Active Campaigns List */}
          {activeCampaigns.length > 0 && (
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Active Campaigns ({activeCampaigns.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {activeCampaigns.map((campaign) => (
                  <div key={campaign.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{campaign.name}</span>
                      <Badge variant="secondary" className="ml-2">{campaign.status}</Badge>
                    </div>
                    <span className="text-sm text-gray-600">{campaign.monthly_cost} credits/month</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deletion Options */}
          <div className="space-y-4">
            <h4 className="font-medium">Deletion Options:</h4>
            
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <Checkbox
                  checked={cancelCampaigns}
                  onCheckedChange={(checked) => setCancelCampaigns(checked === true)}
                />
                <div>
                  <div className="font-medium text-red-600">Cancel All Campaigns</div>
                  <p className="text-sm text-gray-600">
                    Immediately cancel {organization.campaigns.length} campaigns and stop monthly billing 
                    ({organization.total_monthly_cost} credits/month). Required for organization deletion.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <Checkbox
                  checked={releaseNumbers}
                  onCheckedChange={(checked) => setReleaseNumbers(checked === true)}
                />
                <div>
                  <div className="font-medium text-orange-600">Release Phone Numbers</div>
                  <p className="text-sm text-gray-600">
                    Release {organization.phone_numbers} phone numbers back to inventory. 
                    If unchecked, numbers will be suspended but retained for 30 days.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Impact Summary */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-3">🚨 Deletion Impact:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-red-600" />
                <span>All SMS messaging will stop immediately</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span>Monthly billing stops: {totalMonthlySavings} credits/month saved</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-orange-600" />
                <span>
                  {releaseNumbers 
                    ? `${organization.phone_numbers} phone numbers will be released`
                    : `${organization.phone_numbers} phone numbers suspended (30-day retention)`
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-purple-600" />
                <span>{organization.brand_registrations} brand registrations will be deactivated</span>
              </div>
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-red-600" />
                <span>All organization data permanently deleted</span>
              </div>
            </div>
          </div>

          {/* Estimated Costs */}
          {organization.total_monthly_cost > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">💰 Billing Impact</h4>
              <div className="text-sm text-green-700">
                <div>Monthly savings: <strong>{organization.total_monthly_cost} credits/month</strong></div>
                <div>Annual savings: <strong>{organization.total_monthly_cost * 12} credits/year</strong></div>
                <div className="text-xs mt-1">Billing stops immediately upon deletion</div>
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Reason for Deletion (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Help us improve by sharing why you're deleting this organization..."
              className="w-full p-3 border rounded-lg text-sm"
              rows={3}
            />
          </div>

          {/* Final Confirmation */}
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <Checkbox
              id="confirm-org-deletion"
              checked={confirmChecked}
              onCheckedChange={(checked) => setConfirmChecked(checked === true)}
            />
            <label htmlFor="confirm-org-deletion" className="text-sm text-red-800 cursor-pointer">
              <strong>I understand this is permanent and will:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Cancel {organization.campaigns.length} campaigns immediately</li>
                <li>Stop {organization.total_monthly_cost} credits/month in billing</li>
                <li>{releaseNumbers ? 'Release' : 'Suspend'} {organization.phone_numbers} phone numbers</li>
                <li>Permanently delete all organization data</li>
              </ul>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!confirmChecked || !cancelCampaigns || isDeleting}
            >
              {isDeleting ? 'Deleting Organization...' : 'Delete Organization'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 