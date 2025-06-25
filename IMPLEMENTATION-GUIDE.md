# SMS Integration & Automated Billing Implementation Guide

## 🎯 Overview

This implementation adds three critical features to your Juno CRM:

1. **Monthly Phone Number Billing** - Automated via Vercel cron functions
2. **SMS Integration with Twilio** - Send/receive SMS with automatic credit deduction
3. **Low Balance Email Notifications** - Proactive alerts via Resend

## 📋 Prerequisites

- Existing Juno CRM with credits system
- Vercel deployment (Free account supported)
- Twilio account with SMS capabilities
- Resend account for email notifications

## 🔧 Setup Steps

### 1. Install Dependencies

```bash
npm install twilio resend
```

### 2. Database Schema Updates

Run the SMS logs schema migration:

```bash
# Apply the SMS schema
psql -d your_database -f sms-logs-schema.sql
```

### 3. Environment Variables

Add these environment variables to your Vercel project and `.env.local`:

```env
# Existing variables (ensure these are set)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
VAPI_API_KEY=your_vapi_api_key
NEXT_PUBLIC_APP_URL=https://juno.laxmint.com

# New required variables
CRON_SECRET=your_secure_random_string_for_cron_auth
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@laxmint.com
```

**🔒 Security Note**: Generate a strong `CRON_SECRET`:
```bash
# Generate a secure random string
openssl rand -base64 32
```

### 4. Vercel Configuration

The `vercel.json` file configures the cron jobs:

```json
{
  "crons": [
    {
      "path": "/api/cron/monthly-billing",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/auto-recharge-check",
      "schedule": "*/15 * * * *"
    }
  ],
  "env": {
    "CRON_SECRET": "@cron_secret"
  }
}
```

**Schedules**: 
- Monthly billing: Daily at 2 AM UTC
- Auto-recharge check: Every 15 minutes

### 5. Twilio Webhook Configuration

Configure Twilio webhooks for SMS:

1. **Go to Twilio Console** → Phone Numbers → Manage → Active Numbers
2. **Select your phone number**
3. **Set webhook URL**: `https://juno.laxmint.com/api/webhooks/twilio/sms`
4. **Set HTTP method**: POST
5. **Save configuration**

## ⚠️ Vercel Free Account Considerations

### Cron Job Limitations
- **Available**: Cron jobs are supported on free tier
- **Execution Time**: 10-second limit per function
- **Concurrency**: Limited concurrent executions
- **Reliability**: 99.9% uptime guaranteed

### Function Limits
- **Duration**: 10 seconds max execution time
- **Memory**: 1024 MB default
- **Bandwidth**: 100 GB/month
- **Invocations**: 1,000,000/month

### Optimization for Free Tier
```typescript
// Batch processing for monthly billing
const BATCH_SIZE = 10; // Process 10 phone numbers at a time
for (let i = 0; i < phoneNumbers.length; i += BATCH_SIZE) {
  const batch = phoneNumbers.slice(i, i + BATCH_SIZE);
  // Process batch...
}
```

## 📱 API Endpoints

### SMS Sending

**POST** `/api/sms/send`

```json
{
  "to": "+1234567890",
  "message": "Hello from Juno!",
  "from": "+1987654321" // Optional, uses first active number if not provided
}
```

**Response:**
```json
{
  "success": true,
  "messageSid": "SMxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "queued",
  "creditsDeducted": 5,
  "from": "+1987654321",
  "to": "+1234567890"
}
```

### SMS Statistics

**GET** `/api/sms/stats`

```json
{
  "currentMonth": {
    "sent": 25,
    "received": 15,
    "creditsSpent": 140,
    "successRate": 96
  },
  "breakdown": {
    "sentCredits": 125,
    "receivedCredits": 15
  },
  "recentMessages": [...],
  "period": {
    "start": "2024-01-01T00:00:00.000Z",
    "end": "2024-01-31T23:59:59.999Z"
  }
}
```

### Balance Check & Notifications

**GET** `/api/notifications/balance-check`

```json
{
  "balance": 150,
  "threshold": 100,
  "alertLevel": "low", // "good", "low", "warning", "critical"
  "message": "Your balance (150 credits) is getting low.",
  "recommendations": ["Consider adding credits soon"],
  "upcomingCosts": {
    "phoneNumbers": 200
  },
  "notifications": {
    "emailEnabled": true,
    "lastNotificationSent": null
  }
}
```

**POST** `/api/notifications/balance-check` - Update notification preferences

```json
{
  "threshold": 200,
  "emailNotifications": true,
  "notificationEmail": "admin@company.com"
}
```

## 🔄 How It Works

### Monthly Phone Number Billing

1. **Cron Trigger**: Vercel cron runs daily at 2 AM UTC
2. **Query**: Finds phone numbers with `next_billing_date <= NOW()`
3. **Balance Check**: Verifies sufficient credits for monthly fee
4. **Actions**:
   - **Sufficient credits**: Deduct 100 credits, update next billing date
   - **Insufficient credits**: Suspend phone number, send notification, retry in 7 days

### SMS Integration

#### Outbound SMS
1. **API Call**: `/api/sms/send` with message details
2. **Credit Check**: Verify sufficient balance (5 credits per SMS)
3. **Twilio Send**: Dispatch SMS via Twilio API
4. **Logging**: Record in `sms_logs` table
5. **Credit Deduction**: Deduct 5 credits on successful send

#### Inbound SMS
1. **Twilio Webhook**: Receives SMS at `/api/webhooks/twilio/sms`
2. **Tenant Lookup**: Find tenant by receiving phone number
3. **Credit Deduction**: Deduct 1 credit for received SMS
4. **Logging**: Record in `sms_logs` table
5. **Response**: Optional TwiML response

### Low Balance Notifications

#### Automatic Triggers
- **Monthly Billing**: When phone number suspended due to insufficient credits
- **Balance Check API**: When balance drops below threshold
- **Auto-recharge Check**: Every 15 minutes (if implemented)

#### Email Content
- **Detailed balance information**
- **Service impact warnings**
- **Direct link to add credits**
- **Recommendations to prevent future issues**

## 📊 Current Pricing

| Service | Cost | Description |
|---------|------|-------------|
| Voice Calls | 25 credits/minute | AI-powered conversations |
| Phone Setup | 500 credits | One-time number acquisition |
| Phone Monthly | 100 credits/month | Recurring number rental |
| SMS Outbound | 5 credits/message | Send text messages |
| SMS Inbound | 1 credit/message | Receive text messages |
| Email Send | 1 credit/email | Professional email delivery |

## 🛡️ Security Features

### Authentication
- **Cron endpoints**: Protected by `CRON_SECRET` bearer token
- **Twilio webhooks**: Signature validation (optional but recommended)
- **Database**: Row Level Security (RLS) enforced

### Data Protection
- **Tenant isolation**: Complete separation of data
- **Audit trails**: All transactions logged
- **Credit protection**: Prevents negative balances

## 🧪 Testing

### Test SMS Sending
```bash
curl -X POST https://juno.laxmint.com/api/sms/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{
    "to": "+1234567890",
    "message": "Test message from Juno CRM"
  }'
```

### Test Monthly Billing (Manual Trigger)
```bash
curl -X GET https://juno.laxmint.com/api/cron/monthly-billing \
  -H "Authorization: Bearer your_cron_secret"
```

### Test Low Balance Notification
```bash
curl -X GET https://juno.laxmint.com/api/notifications/balance-check \
  -H "Authorization: Bearer your_jwt_token"
```

## 📈 Monitoring & Analytics

### Vercel Analytics
Monitor function performance in Vercel dashboard:
- **Function executions**
- **Duration and memory usage**
- **Error rates**
- **Cron job success/failure**

### Key Metrics to Track
- **SMS delivery rates**
- **Credit consumption patterns**
- **Monthly billing success rates**
- **Notification delivery status**

### Dashboard Integration
Add SMS statistics cards to your dashboard:
```typescript
// Use /api/sms/stats endpoint
const smsStats = await fetch('/api/sms/stats');
```

## 🔔 Notification Management

### User Preferences
Users can configure:
- **Balance threshold** (default: 100 credits)
- **Email notifications** on/off
- **Notification email** (override default)

### Notification Types
1. **Phone Suspension**: Immediate critical alert
2. **General Low Balance**: Proactive warning
3. **Upcoming Charges**: Predictive alerts

## 🚀 Deployment Checklist

- [ ] Install dependencies (`twilio`, `resend`)
- [ ] Run database migration (`sms-logs-schema.sql`)
- [ ] Set environment variables in Vercel
- [ ] Deploy to Vercel (auto-configures cron)
- [ ] Configure Twilio SMS webhooks
- [ ] Test SMS sending/receiving
- [ ] Test monthly billing cron
- [ ] Verify email notifications
- [ ] Monitor logs for errors

## ⚠️ Important Notes

### Monthly Billing
- **Grace Period**: 7-day retry for insufficient balance
- **Service Impact**: Phone numbers suspended until credits added
- **Cost Calculation**: Based on `monthly_cost_credits` field

### SMS Limits
- **Rate Limiting**: Twilio enforces sending limits
- **International**: Additional charges may apply
- **Compliance**: Follow SMS regulations in your region

### Email Delivery
- **Domain Setup**: Configure SPF/DKIM records for better delivery
- **Resend Limits**: Monitor sending quotas
- **Bounce Handling**: Implement bounce webhook if needed

### Vercel Free Tier Optimization
- **Function Duration**: Keep under 10 seconds
- **Memory Usage**: Monitor and optimize
- **Batch Processing**: Process data in smaller chunks
- **Error Handling**: Robust retry mechanisms

## 🆘 Troubleshooting

### Common Issues

**1. Cron not running**
- Verify `CRON_SECRET` is set in Vercel environment variables
- Check Vercel Functions logs
- Ensure proper authentication header

**2. SMS not sending**
- Verify Twilio credentials
- Check phone number format
- Confirm sufficient credits

**3. Emails not delivered**
- Check Resend API key
- Verify sender email domain
- Review bounce/spam reports

**4. Credits not deducting**
- Check database function permissions
- Verify RLS policies
- Review transaction logs

**5. Function timeout (Vercel Free)**
- Optimize database queries
- Reduce batch sizes
- Implement pagination

### Log Monitoring
Monitor these logs in Vercel:
- `/api/cron/monthly-billing` - Billing process
- `/api/cron/auto-recharge-check` - Auto-recharge monitoring
- `/api/sms/send` - SMS sending
- `/api/webhooks/twilio/sms` - SMS receiving
- `/api/notifications/*` - Email notifications

## 📞 Support

For implementation questions or issues:
1. Check Vercel function logs at vercel.com/dashboard
2. Review database transaction logs
3. Test API endpoints individually
4. Verify environment variables are set correctly

## 🔮 Optional: Auto-Recharge Check

I noticed you added an auto-recharge cron job. Would you like me to implement automatic credit purchasing when balance drops below a threshold? This could include:

- **Stripe integration** for automatic payments
- **Configurable auto-recharge amounts**
- **Threshold-based triggers**
- **Payment failure handling**

This implementation provides a robust, scalable communication system with automated billing and proactive monitoring. All components are designed for high availability, tenant isolation, and Vercel free tier optimization. 