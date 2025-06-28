'use client';

import { useState } from 'react';
import { AlertTriangle, Trash2, Clock, DollarSign, Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface CampaignDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: {
    id: string;
    name: string;
    type: string;
    monthly_cost: number;
    phone_numbers: number;
    status: 'active' | 'pending' | 'suspended';
    last_billing_date: string;
  };
  onDelete: (campaignId: string, options: { immediate: boolean; reason?: string }) => Promise<void>;
}

export function CampaignDeletionModal({ 
  isOpen, 
  onClose, 
  campaign, 
  onDelete 
}: CampaignDeletionModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteOption, setDeleteOption] = useState<'immediate' | 'pause' | 'end_of_cycle'>('pause');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [reason, setReason] = useState('');

  const handleDelete = async () => {
    if (!confirmChecked) return;
    
    setIsDeleting(true);
    try {
      await onDelete(campaign.id, { 
        immediate: deleteOption === 'immediate',
        reason 
      });
      onClose();
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getImpactSummary = () => {
    const impacts = [];
    
    if (deleteOption === 'immediate') {
      impacts.push({
        icon: Shield,
        text: 'SMS messaging will be blocked immediately',
        severity: 'critical'
      });
      impacts.push({
        icon: DollarSign,
        text: `Monthly billing stops immediately (${campaign.monthly_cost} credits/month)`,
        severity: 'positive'
      });
    } else if (deleteOption === 'pause') {
      impacts.push({
        icon: Clock,
        text: 'SMS messaging paused (can be resumed within 30 days)',
        severity: 'warning'
      });
      impacts.push({
        icon: DollarSign,
        text: 'Monthly billing suspended temporarily',
        severity: 'neutral'
      });
    } else {
      impacts.push({
        icon: Clock,
        text: 'Campaign active until end of current billing cycle',
        severity: 'neutral'
      });
      impacts.push({
        icon: DollarSign,
        text: 'No refund for current month, billing stops next cycle',
        severity: 'warning'
      });
    }

    impacts.push({
      icon: Trash2,
      text: `${campaign.phone_numbers} phone number(s) affected`,
      severity: 'critical'
    });

    return impacts;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Campaign: {campaign.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Campaign Type:</span>
                <p className="text-gray-600">{campaign.type}</p>
              </div>
              <div>
                <span className="font-medium">Status:</span>
                <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                  {campaign.status}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Monthly Cost:</span>
                <p className="text-gray-600">{campaign.monthly_cost} credits/month</p>
              </div>
              <div>
                <span className="font-medium">Phone Numbers:</span>
                <p className="text-gray-600">{campaign.phone_numbers} numbers affected</p>
              </div>
            </div>
          </div>

          {/* Critical Warning */}
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Critical:</strong> Deleting this campaign will immediately stop all business SMS 
              messaging for associated phone numbers. Messages may be blocked or filtered by carriers.
            </AlertDescription>
          </Alert>

          {/* Deletion Options */}
          <div className="space-y-4">
            <h4 className="font-medium">Choose Deletion Method:</h4>
            
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="deleteOption"
                  value="pause"
                  checked={deleteOption === 'pause'}
                  onChange={(e) => setDeleteOption(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-orange-600">⏸️ Pause Campaign (Recommended)</div>
                  <p className="text-sm text-gray-600">
                    Temporarily suspend messaging and billing. Can be resumed within 30 days without re-registration.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="deleteOption"
                  value="end_of_cycle"
                  checked={deleteOption === 'end_of_cycle'}
                  onChange={(e) => setDeleteOption(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-blue-600">📅 Delete at End of Billing Cycle</div>
                  <p className="text-sm text-gray-600">
                    Continue service until {campaign.last_billing_date}, then permanently delete.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="deleteOption"
                  value="immediate"
                  checked={deleteOption === 'immediate'}
                  onChange={(e) => setDeleteOption(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-red-600">🗑️ Delete Immediately</div>
                  <p className="text-sm text-gray-600">
                    Permanently delete right now. Messaging stops immediately. Cannot be undone.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Impact Summary */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-3">Impact Summary:</h4>
            <div className="space-y-2">
              {getImpactSummary().map((impact, index) => {
                const Icon = impact.icon;
                const colorClass = {
                  critical: 'text-red-600',
                  warning: 'text-yellow-600',
                  positive: 'text-green-600',
                  neutral: 'text-gray-600'
                }[impact.severity];
                
                return (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Icon className={`h-4 w-4 ${colorClass}`} />
                    <span>{impact.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reason (Optional) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Reason for Deletion (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Help us improve by sharing why you're deleting this campaign..."
              className="w-full p-3 border rounded-lg text-sm"
              rows={3}
            />
          </div>

          {/* Confirmation */}
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <Checkbox
              id="confirm-deletion"
              checked={confirmChecked}
              onCheckedChange={(checked) => setConfirmChecked(checked === true)}
            />
            <label htmlFor="confirm-deletion" className="text-sm text-red-800 cursor-pointer">
              I understand that this action will affect {campaign.phone_numbers} phone number(s) and 
              {deleteOption === 'immediate' ? ' immediately stop' : ' impact'} business messaging capabilities.
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
              disabled={!confirmChecked || isDeleting}
            >
              {isDeleting ? 'Processing...' : 
               deleteOption === 'pause' ? 'Pause Campaign' :
               deleteOption === 'end_of_cycle' ? 'Schedule Deletion' :
               'Delete Immediately'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 