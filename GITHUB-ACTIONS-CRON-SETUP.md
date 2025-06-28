# GitHub Actions Cron Job Setup for Campaign Cleanup

## Overview

This guide shows how to set up automated cleanup of expired paused campaigns using GitHub Actions, since Supabase doesn't have built-in cron job functionality.

## 🔧 Setup Instructions

### 1. **Configure GitHub Secrets**

Go to your GitHub repository → Settings → Secrets and variables → Actions, then add:

```
CLEANUP_API_KEY=your-secure-random-key-here
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Generate a secure API key:**
```bash
# Generate a random 32-character key
openssl rand -hex 32
```

### 2. **Add Environment Variable to Your App**

Add to your `.env.local` and Vercel environment variables:
```
CLEANUP_API_KEY=your-secure-random-key-here
```

⚠️ **Important:** Use the same key in both GitHub secrets and your app environment.

### 3. **Verify the Workflow File**

The workflow is located at `.github/workflows/cleanup-paused-campaigns.yml`:

- **Schedule**: Runs daily at 2 AM UTC
- **Manual Trigger**: Can be triggered manually from GitHub Actions tab
- **Security**: Protected with API key authentication
- **Monitoring**: Logs results and fails on errors

### 4. **Test the Setup**

#### Manual Test via GitHub Actions:
1. Go to GitHub → Actions tab
2. Select "Cleanup Expired Paused Campaigns"
3. Click "Run workflow" → "Run workflow"
4. Check the logs for success/failure

#### Test the API Endpoint Directly:
```bash
curl -X POST \
  -H "Authorization: Bearer your-cleanup-api-key" \
  -H "Content-Type: application/json" \
  https://your-app.vercel.app/api/cron/cleanup-paused-campaigns
```

#### Health Check:
```bash
curl https://your-app.vercel.app/api/cron/cleanup-paused-campaigns
```

## 📋 Current Implementation Status

### ✅ **Ready:**
- GitHub Actions workflow configured
- Protected API endpoint created
- Database cleanup function exists
- Error handling and logging

### 🚧 **Pending TypeScript Type Updates:**
The current implementation is simplified because the new database columns (`status`, `monthly_cost`, etc.) aren't reflected in the TypeScript types yet.

**To complete the implementation:**

1. **Regenerate Supabase types:**
```bash
npx supabase gen types typescript --project-id your-project-id > types/supabase.ts
```

2. **Or manually update the types** to include the new columns from the migration

3. **Update the API endpoint** to use the full cleanup logic

### 🔄 **Full Implementation (Coming Soon):**
```typescript
// This will be enabled once types are updated:
const { data: expiredCampaigns } = await supabase
  .from('voice_agents')
  .select('id, name, tenant_id')
  .eq('status', 'paused')
  .lt('resume_deadline', new Date().toISOString());

// Auto-delete expired campaigns and log billing changes
```

## 📊 Monitoring & Alerts

### **GitHub Actions Monitoring:**
- ✅ **Success**: Green checkmark, logs cleanup count
- ❌ **Failure**: Red X, sends failure notification
- 📧 **Notifications**: Configure in workflow for Slack/email alerts

### **Application Logs:**
Monitor your Vercel/hosting logs for:
```
🧹 Cleanup completed: X expired campaigns deleted
```

### **Database Audit Trail:**
Check `credit_transactions` table for:
- `transaction_type = 'campaign_deletion'`
- `created_by = 'system-cron'`

## 🔒 Security Features

### **API Key Protection:**
- Endpoint requires `Authorization: Bearer` header
- Returns 401 for invalid/missing keys
- Key stored securely in GitHub Secrets

### **Error Handling:**
- Graceful failure handling
- Detailed error logging
- No sensitive data in logs

### **Rate Limiting:**
- Runs only once per day
- Can't be spammed externally
- Manual triggers logged in GitHub

## 🚀 Alternative Approaches

### **Option 1: Supabase Edge Functions**
```sql
-- Create a Supabase Edge Function (requires Deno)
-- More complex but runs natively in Supabase
```

### **Option 2: Vercel Cron Jobs**
```javascript
// vercel.json cron configuration
// Requires Vercel Pro plan
{
  "crons": [{
    "path": "/api/cron/cleanup-paused-campaigns",
    "schedule": "0 2 * * *"
  }]
}
```

### **Option 3: External Cron Service**
- Use services like cron-job.org
- Less control, but simpler setup
- Good for simple use cases

## 📈 Future Enhancements

### **Planned Features:**
1. **Notification System**: Email admins when campaigns are auto-deleted
2. **Analytics Dashboard**: Track cleanup statistics over time
3. **Configurable Schedules**: Allow different cleanup intervals per organization
4. **Recovery Options**: Provide 48-hour recovery window for accidentally deleted campaigns

### **Performance Optimizations:**
1. **Batch Processing**: Handle large numbers of expired campaigns efficiently
2. **Parallel Processing**: Clean up multiple organizations simultaneously
3. **Database Indexing**: Optimize queries for large datasets

## 📞 Troubleshooting

### **Common Issues:**

#### "Unauthorized" Error:
- Check API key matches in GitHub secrets and app environment
- Verify `CLEANUP_API_KEY` environment variable is set

#### "Function not found" Error:
- Ensure the database migration was run successfully
- Check that `cleanup_expired_paused_campaigns()` function exists

#### "No campaigns found" (expected):
- Normal when no campaigns have expired
- Check logs for "0 campaigns deleted"

#### GitHub Action Fails:
- Check GitHub Actions logs for detailed error messages
- Verify `NEXT_PUBLIC_APP_URL` points to correct deployment
- Ensure app is deployed and accessible

### **Debugging Commands:**
```sql
-- Check for paused campaigns that should be cleaned up
SELECT id, name, status, resume_deadline 
FROM voice_agents 
WHERE status = 'paused' 
AND resume_deadline < NOW();

-- Manual cleanup (if needed)
SELECT cleanup_expired_paused_campaigns();
```

## 🎯 Success Metrics

Track these metrics to ensure the system is working:

- **Cleanup Frequency**: Daily executions without failures
- **Campaign Volume**: Number of campaigns cleaned up over time  
- **Billing Impact**: Credits saved from stopped monthly charges
- **Error Rate**: Should be near 0% for production stability

The GitHub Actions approach provides reliable, auditable, and secure automated cleanup that integrates well with your existing Next.js/Vercel deployment architecture. 