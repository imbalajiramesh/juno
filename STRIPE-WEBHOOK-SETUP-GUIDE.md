# Stripe Webhook Configuration Guide

## 🎯 **Overview**

Your auto-recharge system requires Stripe webhooks to process payments, save payment methods, and add credits automatically. This guide shows you exactly how to configure webhooks in your Stripe Dashboard.

## 🔧 **Webhook Endpoint**

Your webhook endpoint is already implemented at:
```
POST https://your-domain.com/api/stripe/webhooks
```

## 📋 **Required Webhook Events**

Configure these **5 essential events** in your Stripe Dashboard:

### ✅ **Core Auto-Recharge Events**
1. **`payment_intent.succeeded`** ⭐ **CRITICAL**
   - Adds credits to user accounts
   - Updates payment history
   - Processes tax data
   - Triggers after successful auto-recharge

2. **`payment_intent.payment_failed`** ⭐ **CRITICAL**
   - Updates payment status to failed
   - Logs failed auto-recharge attempts
   - Enables error handling/notifications

3. **`payment_method.attached`** ⭐ **CRITICAL**
   - Saves payment methods for auto-recharge
   - Enables future off-session payments
   - Required for auto-recharge functionality

### ✅ **Additional Recommended Events**
4. **`checkout.session.completed`**
   - Handles manual credit purchases
   - Saves payment methods from checkout
   - Processes tax data from manual purchases

5. **`customer.updated`**
   - Maintains customer data consistency
   - Handles customer information changes

## 🚀 **Step-by-Step Setup**

### **Step 1: Access Stripe Dashboard**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **Webhooks**
3. Click **"Add endpoint"**

### **Step 2: Configure Endpoint**
```
Endpoint URL: https://your-domain.com/api/stripe/webhooks
Description: Juno Auto-Recharge Webhooks
```

### **Step 3: Select Events**
In the **"Select events to listen to"** section:

**Option A: Select Specific Events (Recommended)**
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`  
- ✅ `payment_method.attached`
- ✅ `checkout.session.completed`
- ✅ `customer.updated`

**Option B: Listen to All Events (Easier)**
- Select **"Send me all events"**
- Your webhook handler will ignore unhandled events

### **Step 4: Get Webhook Secret**
1. After creating the webhook, click on it
2. Scroll to **"Signing secret"**
3. Click **"Reveal"** to show the secret
4. Copy the secret (starts with `whsec_`)

### **Step 5: Update Environment Variables**
Add to your `.env` file:
```bash
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret_here
```

## 🧪 **Testing Your Webhook**

### **Method 1: Stripe CLI (Recommended)**
```bash
# Install Stripe CLI
npm install -g stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local development
stripe listen --forward-to localhost:3000/api/stripe/webhooks

# Test with a sample event
stripe trigger payment_intent.succeeded
```

### **Method 2: Stripe Dashboard Test**
1. Go to **Developers** → **Webhooks**
2. Click your webhook endpoint
3. Click **"Send test webhook"**
4. Select `payment_intent.succeeded`
5. Click **"Send test webhook"**

### **Method 3: Test Auto-Recharge Flow**
1. Set up auto-recharge in your app
2. Manually trigger via "Test Auto-Recharge" button
3. Check webhook logs in Stripe Dashboard

## 📊 **Webhook Payload Examples**

### **Auto-Recharge Success (`payment_intent.succeeded`)**
```json
{
  "id": "pi_1234567890",
  "object": "payment_intent",
  "amount": 2033,
  "currency": "usd",
  "status": "succeeded",
  "metadata": {
    "tenant_id": "tenant_123",
    "credits": "1000",
    "description": "Auto-recharge: Business - 1000 credits",
    "is_auto_recharge": "true",
    "subtotal_usd_cents": "1799",
    "tax_amount_usd_cents": "234",
    "tax_rate": "0.13",
    "tax_name": "HST"
  }
}
```

### **Payment Method Attached**
```json
{
  "id": "pm_1234567890",
  "object": "payment_method",
  "card": {
    "brand": "visa",
    "last4": "4242",
    "exp_month": 12,
    "exp_year": 2025
  },
  "customer": "cus_1234567890"
}
```

## 🔍 **Monitoring & Debugging**

### **Stripe Dashboard Monitoring**
1. **Developers** → **Webhooks** → Your endpoint
2. Check **"Recent deliveries"** tab
3. View request/response details
4. Check for failed deliveries

### **Common Issues & Solutions**

**❌ Webhook Returns 400/500 Error**
```bash
# Check your logs
vercel logs --follow  # For Vercel
# OR
npm run dev  # Local development
```

**❌ `STRIPE_WEBHOOK_SECRET` Invalid**
- Regenerate secret in Stripe Dashboard
- Update environment variable
- Redeploy application

**❌ Events Not Being Processed**
- Verify event types are selected
- Check webhook endpoint URL is correct
- Ensure endpoint is publicly accessible

### **Webhook Logs Location**
Your webhook handler logs to:
- **Console**: Check your deployment logs
- **Stripe Dashboard**: View delivery attempts
- **Database**: Payment history updates

## 🛡️ **Security Best Practices**

### **Webhook Signature Verification**
Your webhook already includes signature verification:
```typescript
event = stripe.webhooks.constructEvent(
  body,
  signature!,
  process.env.STRIPE_WEBHOOK_SECRET!
);
```

### **Environment Security**
- ✅ Never commit webhook secrets to Git
- ✅ Use different secrets for test/live modes
- ✅ Rotate secrets periodically
- ✅ Monitor webhook delivery logs

## 📈 **Production Checklist**

### **Before Going Live**
- [ ] Webhook endpoint configured in Stripe Dashboard
- [ ] All 5 required events selected
- [ ] `STRIPE_WEBHOOK_SECRET` environment variable set
- [ ] Webhook tested with sample events
- [ ] Auto-recharge flow tested end-to-end
- [ ] Webhook monitoring set up

### **Live Mode Setup**
1. Switch Stripe Dashboard to **Live mode**
2. Create new webhook endpoint (same URL)
3. Select same events
4. Get new webhook secret (different from test)
5. Update `STRIPE_WEBHOOK_SECRET` in production environment
6. Test with real payment method

## 🚨 **Troubleshooting**

### **Auto-Recharge Not Working?**
1. Check webhook is receiving `payment_intent.succeeded`
2. Verify `tenant_id` in metadata
3. Check `update_credits` function is working
4. Verify payment method is saved correctly

### **Credits Not Added?**
1. Check webhook logs for errors
2. Verify database permissions
3. Check `credit_transactions` table
4. Verify `get_tenant_credit_balance` function

### **Payment Methods Not Saved?**
1. Check `payment_method.attached` event
2. Verify `savePaymentMethod` function
3. Check `payment_methods` table
4. Verify customer linking is correct

## 📞 **Support**

### **Stripe Support**
- Webhook delivery issues: Stripe Dashboard → Help
- Event not firing: Check event configuration
- Signature verification: Verify webhook secret

### **Application Logs**
```bash
# Check recent webhook processing
grep "webhook" your-app-logs.log

# Check payment processing
grep "payment_intent" your-app-logs.log

# Check auto-recharge triggers
grep "auto-recharge" your-app-logs.log
```

---

## ✅ **Quick Setup Summary**

1. **Stripe Dashboard** → **Developers** → **Webhooks** → **Add endpoint**
2. **URL**: `https://your-domain.com/api/stripe/webhooks`
3. **Events**: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_method.attached`, `checkout.session.completed`, `customer.updated`
4. **Copy webhook secret** → Update `STRIPE_WEBHOOK_SECRET` environment variable
5. **Test** with Stripe CLI or Dashboard
6. **Deploy** and monitor webhook deliveries

Your auto-recharge system will then work automatically! 🎉 