# Campaign & Organization Deletion Workflows Implementation Guide

## Overview

This document outlines the comprehensive deletion workflow system for managing campaign and organization deletions with proper billing implications, Twilio cleanup, and user safety measures.

## 🎯 Key Features Implemented

### 1. UI Components

#### Campaign Deletion Modal (`components/verification/campaign-deletion-modal.tsx`)
- **Three deletion options:**
  - ⏸️ **Pause Campaign (Recommended)**: Suspend messaging and billing for 30 days
  - 📅 **Delete at End of Billing Cycle**: Continue until current cycle ends
  - 🗑️ **Delete Immediately**: Permanent deletion with immediate billing stop

- **Safety Features:**
  - Impact summary with visual icons and severity indicators
  - Billing impact calculations (monthly/annual savings)
  - Phone number impact warnings
  - Required confirmation checkbox with detailed consequences
  - Optional deletion reason collection

#### Organization Deletion Modal (`components/verification/organization-deletion-modal.tsx`)
- **Visual organization summary:**
  - Active campaigns count with monthly costs
  - Phone numbers affected
  - Brand registrations impact
  - Total monthly billing at risk

- **Deletion Options:**
  - Cancel all campaigns (required for org deletion)
  - Release vs suspend phone numbers (30-day retention)
  - Immediate vs graceful shutdown

- **Financial Impact Display:**
  - Monthly savings calculation
  - Annual impact projection
  - Campaign-by-campaign breakdown

## 🔧 Technical Implementation Requirements

### Database Schema Updates Needed

```sql
-- Add deletion tracking columns to voice_agents
ALTER TABLE voice_agents ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active';
ALTER TABLE voice_agents ADD COLUMN IF NOT EXISTS monthly_cost INTEGER DEFAULT 0;
ALTER TABLE voice_agents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE voice_agents ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;
ALTER TABLE voice_agents ADD COLUMN IF NOT EXISTS resume_deadline TIMESTAMPTZ;

-- Add deletion tracking to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Update credit_transactions to include deletion events
-- (Assuming transaction_type column exists, add these types:)
-- 'campaign_deletion', 'campaign_suspension', 'org_deletion_savings'
```

### API Endpoints Implementation

#### 1. Campaign Deletion API (`app/api/voice-agents/[id]/delete/route.ts`)

**Request Body:**
```typescript
{
  immediate: boolean;  // true = delete now, false = pause
  reason?: string;     // Optional feedback
}
```

**Key Operations:**
1. **Immediate Deletion:**
   - Cancel Twilio 10DLC campaign registration
   - Set `status = 'deleted'`, `monthly_cost = 0`
   - Remove phone number associations
   - Create billing stop record
   - Log monthly savings

2. **Pause Campaign:**
   - Set `status = 'paused'`, `monthly_cost = 0`
   - Set 30-day resume deadline
   - Keep Twilio registrations intact
   - Create billing suspension record

**Twilio Integration:**
```typescript
// Cancel 10DLC campaign
await twilioClient.messaging.v1
  .a2pBrandRegistrations(brandSid)
  .campaignVerifications(campaignSid)
  .remove();
```

#### 2. Organization Deletion API (`app/api/organization/delete/route.ts`)

**Request Body:**
```typescript
{
  organization_id: string;
  cancel_campaigns: boolean;
  release_numbers: boolean;
  reason?: string;
}
```

**Operations:**
1. Cancel all active campaigns (required)
2. Handle phone numbers (release or suspend)
3. Calculate total monthly savings
4. Create comprehensive billing record
5. Soft delete organization

## 💰 Billing & Financial Impact

### Monthly Recurring Charges Affected
- **Brand Registration**: 800-10,000 credits/month
- **Campaign Fees**: 400-2,500 credits/month per campaign
- **Phone Number Fees**: Variable based on provider

### Billing Stop Mechanisms
1. **Immediate Stop**: Set `monthly_cost = 0` on deletion
2. **Cycle End**: Continue current month, stop next cycle
3. **Pause**: Temporarily stop, can resume within 30 days

### Financial Records
```typescript
// Example billing record
{
  tenant_id: "org-id",
  transaction_type: "campaign_deletion",
  amount: 0, // No charge/refund
  description: "Campaign deleted - stopped 1500 credits/month",
  created_by: "system"
}
```

## 🔒 Safety & Compliance Measures

### User Confirmations Required
1. **Campaign Impact**: Number of phone numbers affected
2. **Billing Impact**: Monthly/annual savings calculations
3. **Service Impact**: SMS messaging will stop immediately
4. **Irreversibility**: Clear warning about permanent actions

### Data Retention (30 Days)
- **Paused Campaigns**: Full restoration possible
- **Suspended Numbers**: Can be reactivated
- **Deleted Organizations**: Audit trail preserved

### Twilio Compliance
- **10DLC Campaigns**: Properly cancelled to avoid ongoing fees
- **Brand Registrations**: Deactivated but registration preserved
- **Phone Numbers**: Graceful release or suspension

## 🚀 Integration with Existing System

### Prerequisites
1. **Database Schema**: Add status and deletion tracking columns
2. **Twilio API**: Configure proper permissions for campaign cancellation
3. **Billing System**: Integrate with existing credit transaction system
4. **User Permissions**: Ensure proper access controls

### Component Integration
```typescript
// Example usage in settings page
import { CampaignDeletionModal } from '@/components/verification/campaign-deletion-modal';
import { OrganizationDeletionModal } from '@/components/verification/organization-deletion-modal';

// Handle campaign deletion
const handleCampaignDelete = async (campaignId: string, options: { immediate: boolean; reason?: string }) => {
  const response = await fetch(`/api/voice-agents/${campaignId}/delete`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  });
  
  if (response.ok) {
    // Refresh campaign list, show success message
    router.refresh();
  }
};
```

### Cron Job for Cleanup
```typescript
// Monthly cleanup of expired paused campaigns
// Check for campaigns with resume_deadline < now() and auto-delete
```

## 📊 Analytics & Monitoring

### Deletion Metrics to Track
- **Campaign Pause vs Delete Rates**: Understanding user preferences
- **Reactivation Rates**: How many paused campaigns are resumed
- **Monthly Savings**: Total billing reductions from deletions
- **Common Deletion Reasons**: Feedback analysis for improvements

### Monitoring Alerts
- **Failed Twilio Cancellations**: Retry mechanisms needed
- **Billing Stop Failures**: Financial impact monitoring
- **High Deletion Rates**: Potential product issues

## 🎨 UI/UX Best Practices

### Visual Hierarchy
1. **Critical Warnings**: Red alerts for irreversible actions
2. **Financial Impact**: Green for savings, yellow for caution
3. **Service Impact**: Clear icons for messaging disruption
4. **Confirmation Flow**: Multi-step with increasing seriousness

### Business-Friendly Language
- "Pause Campaign" instead of "Soft Delete"
- "Business SMS License" instead of "10DLC Campaign"
- "Monthly Service Fees" instead of "Recurring Charges"
- "Professional Caller ID" instead of "Brand Registration"

## 🔄 Future Enhancements

### Phase 2 Features
1. **Bulk Operations**: Delete multiple campaigns at once
2. **Scheduled Deletions**: Set future deletion dates
3. **Cost Optimization**: Suggest cheaper alternatives before deletion
4. **Migration Tools**: Move campaigns between organizations

### Advanced Billing
1. **Pro-rated Refunds**: Partial month credits for immediate deletions
2. **Downgrade Options**: Reduce service level instead of deletion
3. **Usage Analytics**: Show cost per message before deletion decision

## 📋 Implementation Checklist

- [x] Campaign deletion UI component with safety measures
- [x] Organization deletion UI component with impact analysis
- [x] API endpoint structure for campaign deletion
- [x] API endpoint for organization deletion
- [ ] Database schema updates for status tracking
- [ ] Twilio integration for campaign cancellation
- [ ] Billing system integration for recurring charge stops
- [ ] User permission checks and access controls
- [ ] Cron job for expired campaign cleanup
- [ ] Analytics dashboard for deletion metrics
- [ ] Testing with actual Twilio campaigns
- [ ] Documentation for customer support team

This implementation provides a comprehensive, user-friendly, and financially responsible deletion workflow system that protects both the business and customers from accidental data loss and billing issues. 