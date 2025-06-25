# Environment Setup for Stripe Integration

## Required Environment Variables

To fix the Stripe configuration error you're seeing, add these environment variables to your `.env.local` file:

```bash
# Stripe Configuration (REQUIRED)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Existing environment variables (if not already set)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# For auto-recharge cron jobs
CRON_SECRET=your_random_secret_string
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Other integrations (existing)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
VAPI_API_KEY=your_vapi_api_key
RESEND_API_KEY=your_resend_api_key
```

## Getting Stripe Keys

### 1. Create a Stripe Account
1. Go to [stripe.com](https://stripe.com)
2. Sign up for a free account
3. Complete account verification

### 2. Get API Keys
1. Go to Stripe Dashboard → Developers → API Keys
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)

### 3. Set Up Webhook Endpoint
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Set URL: `http://localhost:3000/api/stripe/webhooks` (for dev)
4. Select these events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_method.attached`
   - `customer.updated`
5. Copy the webhook signing secret (starts with `whsec_`)

## Create .env.local File

Create a `.env.local` file in your project root with the Stripe keys:

```bash
# .env.local
STRIPE_SECRET_KEY=sk_test_your_actual_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret_here
CRON_SECRET=some_random_string_for_security
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Testing

After adding the environment variables:

1. **Restart your development server**:
   ```bash
   npm run dev
   ```

2. **Test the integration**:
   - Go to Settings → Credits & Billing
   - You should see the purchase options enabled
   - Use Stripe test card: `4242424242424242`

## Test Cards

For testing payments, use these Stripe test cards:

- **Success**: `4242424242424242`
- **Declined**: `4000000000000002`
- **Insufficient funds**: `4000000000009995`
- **Any future expiry date and any 3-digit CVC**

## Troubleshooting

### Still seeing "Neither apiKey nor config.authenticator provided"?

1. **Check environment variable names**:
   - Must be `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (with NEXT_PUBLIC_ prefix)
   - Check for typos in variable names

2. **Restart development server**:
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

3. **Verify in browser console**:
   ```javascript
   // Open browser console and run:
   console.log(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
   // Should show your publishable key
   ```

### Environment not loading?

1. Make sure `.env.local` is in your project root (same level as package.json)
2. Make sure there are no spaces around the `=` sign
3. Make sure the file is named exactly `.env.local` (not `.env.local.txt`)

## Production Setup

For production deployment:

1. **Vercel**: Add environment variables in Vercel Dashboard → Settings → Environment Variables
2. **Other platforms**: Follow their specific environment variable setup process
3. **Use production Stripe keys**: Replace `sk_test_` and `pk_test_` with `sk_live_` and `pk_live_`
4. **Update webhook URL**: Point to your production domain

## Security Notes

- ✅ **Never commit `.env.local`** to git (it's in .gitignore)
- ✅ **Use test keys** for development
- ✅ **Use live keys** only in production
- ✅ **Keep webhook secrets secure**
- ✅ **Rotate keys** if compromised 