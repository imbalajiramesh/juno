# Stripe Integration for Credit System

## Overview

This integration adds comprehensive Stripe payment processing to the existing credits system, including:

- 💳 **Secure Payment Processing**: Stripe Elements for card payments
- 🔒 **Saved Payment Methods**: Store cards for future use
- ⚡ **Auto-Recharge**: Automatic credit top-ups when balance gets low
- 📱 **Mobile-Optimized**: Responsive payment forms
- 🔄 **Webhook Processing**: Real-time payment confirmations

## Features

### 🏦 Payment Processing
- **Stripe Elements Integration**: Modern, secure payment forms
- **Multiple Credit Packages**: Predefined packages with tiered pricing  
- **Custom Amounts**: Allow custom credit purchases (can be implemented)
- **Payment Intent API**: Secure server-side payment processing

### 💳 Saved Payment Methods
- **Card Storage**: Securely save payment methods with Stripe
- **Multiple Cards**: Support multiple saved cards per tenant
- **Default Cards**: Set preferred payment method
- **Card Management**: Add, remove, and set default cards

### ⚡ Auto-Recharge System
- **Automatic Top-ups**: Recharge when balance drops below threshold
- **Configurable Settings**: Set minimum balance and recharge amounts
- **Payment Method Selection**: Choose which saved card to use
- **Manual Triggers**: Test auto-recharge functionality
- **Smart Matching**: Uses credit packages that best match recharge amount

### 🔄 Webhook Integration
- **Real-time Processing**: Immediate credit addition on successful payments
- **Payment Status Tracking**: Handle succeeded, failed, and pending payments
- **Automatic Card Saving**: Save payment methods from successful payments
- **Error Handling**: Comprehensive error handling and logging

## Setup Instructions

### 1. Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Database Migration

Run the Stripe integration schema:

```sql
-- Apply the Stripe integration schema
\i stripe-integration-schema.sql
```

This creates the following tables:
- `stripe_customers` - Links tenants to Stripe customers
- `payment_methods` - Stores saved payment method information
- `auto_recharge_settings` - Auto-recharge configuration per tenant
- `payment_history` - Complete payment transaction history

### 3. Stripe Dashboard Configuration

#### Create Webhooks
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhooks`
3. Select these events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_method.attached`
   - `customer.updated`

#### Payment Methods Configuration
1. Enable desired payment methods in Stripe Dashboard
2. Configure automatic payment methods in your integration

### 4. Test the Integration

#### Test Cards
Use Stripe's test cards for development:
- `4242424242424242` - Visa (succeeds)
- `4000000000000002` - Visa (declined)
- `4000000000009995` - Visa (insufficient funds)

#### Test Webhooks
Use Stripe CLI to test webhooks locally:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhooks
```

## API Endpoints

### Payment Processing
- `POST /api/stripe/create-payment-intent` - Create payment for credit packages
- `POST /api/stripe/webhooks` - Process Stripe webhooks

### Payment Methods Management
- `GET /api/stripe/payment-methods` - List saved payment methods
- `POST /api/stripe/payment-methods` - Create setup intent or set default
- `DELETE /api/stripe/payment-methods` - Remove payment method

### Auto-Recharge
- `GET /api/stripe/auto-recharge` - Get auto-recharge settings
- `POST /api/stripe/auto-recharge` - Update settings or trigger recharge

## Usage Guide

### For Users

#### Purchasing Credits
1. Navigate to Settings → Credits & Billing
2. Click "Purchase Credits" tab
3. Select a credit package
4. Complete payment with Stripe Elements form
5. Choose to save card for future use

#### Managing Saved Cards
1. Go to "Saved Cards" tab
2. Add new cards using the "Add Card" button
3. Set default payment method with star icon
4. Remove cards with trash icon

#### Setting Up Auto-Recharge
1. Navigate to "Auto-Recharge" tab
2. Toggle "Enable Auto-Recharge"
3. Set minimum balance threshold
4. Set recharge amount
5. Select saved payment method
6. Save settings

### For Developers

#### Adding Custom Payment Amounts
```typescript
// In your component
<StripePaymentForm
  customAmount={50} // $50
  customCredits={2500} // 2500 credits
  onSuccess={handleSuccess}
  onCancel={handleCancel}
/>
```

#### Triggering Auto-Recharge Manually
```typescript
const triggerAutoRecharge = async () => {
  const response = await fetch('/api/stripe/auto-recharge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ triggerNow: true }),
  });
  // Handle response
};
```

## Security Considerations

### PCI Compliance
- ✅ Stripe Elements handles sensitive card data
- ✅ No card details stored in your database
- ✅ PCI compliance handled by Stripe

### Data Protection
- 🔒 All payment processing server-side
- 🔒 Webhook signature verification
- 🔒 Row-level security on all tables
- 🔒 Tenant isolation for all payment data

### Error Handling
- 🛡️ Comprehensive error logging
- 🛡️ Graceful failure handling
- 🛡️ User-friendly error messages
- 🛡️ Automatic retry mechanisms

## Monitoring & Analytics

### Payment Tracking
- Track successful/failed payments
- Monitor auto-recharge performance
- Payment method usage analytics
- Credit consumption patterns

### Webhook Monitoring
- Webhook delivery status
- Processing time metrics
- Error rates and types
- Automatic retry handling

## Troubleshooting

### Common Issues

#### Webhook Not Receiving Events
1. Check webhook URL is accessible
2. Verify STRIPE_WEBHOOK_SECRET is correct
3. Check webhook event selection in Stripe Dashboard
4. Test with Stripe CLI

#### Payment Intent Creation Fails
1. Verify STRIPE_SECRET_KEY is correct
2. Check tenant exists in database
3. Verify credit package is active
4. Check Stripe API logs

#### Auto-Recharge Not Working
1. Verify payment method is saved and active
2. Check auto-recharge settings are enabled
3. Verify balance is below threshold
4. Check for sufficient credit packages

### Debug Mode
Enable debug logging by setting:
```bash
NODE_ENV=development
```

## Future Enhancements

### Planned Features
- 📊 Payment analytics dashboard
- 📧 Email notifications for payments
- 🎯 Usage-based auto-recharge
- 💰 Enterprise billing features
- 📱 Mobile app payment integration

### Integration Extensions
- Apple Pay / Google Pay support  
- Bank transfer payments
- Cryptocurrency payments
- Invoice generation
- Tax calculation integration

## Support

For issues related to:
- **Stripe Integration**: Check webhook logs and Stripe Dashboard
- **Database Issues**: Verify table permissions and RLS policies
- **Frontend Issues**: Check browser console for errors
- **API Issues**: Check server logs and response codes

## Contributing

When contributing to the Stripe integration:
1. Test with Stripe test cards
2. Verify webhook handling
3. Check database transaction integrity
4. Update documentation
5. Add proper error handling 