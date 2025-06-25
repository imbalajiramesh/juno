# Credits System & Phone Numbers Integration

## Overview

This update introduces a comprehensive credits-based billing system for voice agents and Twilio phone number management. The system replaces the previous cost input field with fixed credit pricing and adds full phone number purchasing capabilities.

## Key Features

### 🏦 Credits System
- **Integer-only credits** (no decimals)
- **Fixed pricing** for all services
- **Transaction logging** with detailed history
- **Automatic billing** on call completion
- **Insufficient balance protection**

### 📞 Phone Number Management
- **Twilio subaccount isolation** - Each tenant gets their own Twilio subaccount
- **Area code selection** for purchasing US/Canada numbers
- **Monthly billing** with credit deduction
- **Status tracking** (active/inactive/suspended)
- **Complete tenant isolation** at the Twilio level

### 🤖 Voice Agent Integration
- **Fixed cost display** instead of input field
- **Credit balance** prominently displayed
- **Automatic credit deduction** on call completion
- **Enhanced UI** with tabbed interface

## Database Schema

### New Tables

#### `credit_balances`
- Stores current credit balance per tenant
- Unique constraint on tenant_id
- Automatic timestamp tracking

#### `credit_transactions`
- Complete transaction history
- Transaction types: purchase, call_charge, phone_number_charge, refund, bonus
- Reference IDs for linking to calls/phone numbers

#### `pricing_config`
- Centralized pricing configuration
- Service types: voice_call, phone_number_monthly, phone_number_setup
- Admin-configurable rates

#### `tenant_phone_numbers`
- Twilio phone number records per tenant
- Integration with Vapi phone number IDs
- Monthly billing date tracking
- Twilio subaccount SID for complete isolation

## Pricing Structure

| Service | Credit Cost | Description |
|---------|------------|-------------|
| Voice Calls | 15 credits/minute | Charged per minute with 1-minute minimum |
| Phone Setup | 500 credits | One-time fee for new phone numbers |
| Phone Monthly | 100 credits/month | Recurring monthly charge |

## API Endpoints

### Credits Management

#### `GET /api/credits`
```json
{
  "balance": 1500,
  "transactions": [
    {
      "id": "uuid",
      "transaction_type": "call_charge",
      "amount": -45,
      "description": "Voice call with Sales Agent - 3 minute(s)",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### `POST /api/credits`
```json
{
  "amount": 1000,
  "transaction_type": "purchase",
  "description": "Credits purchase: 1000 credits",
  "reference_id": "optional"
}
```

### Phone Numbers

#### `GET /api/phone-numbers`
```json
{
  "phoneNumbers": [
    {
      "id": "uuid",
      "phone_number": "+14155551234",
      "status": "active",
      "monthly_cost_credits": 100,
      "setup_cost_credits": 500,
      "next_billing_date": "2024-02-15T00:00:00Z"
    }
  ]
}
```

#### `POST /api/phone-numbers`
```json
{
  "area_code": "415",
  "country": "US"
}
```

## UI Components

### Voice Agents Page Features

1. **Credit Balance Display**
   - Prominent credit counter in header
   - Quick "Add Credits" buttons
   - Real-time balance updates

2. **Tabbed Interface**
   - **Voice Agents**: Create and manage AI agents
   - **Phone Numbers**: Purchase and manage Twilio numbers
   - **Credits & Billing**: View balance, add credits, transaction history

3. **Fixed Cost Display**
   - Removed cost input field from agent creation
   - Shows fixed 15 credits/minute rate
   - Clear pricing information throughout UI

4. **Phone Number Management**
   - Area code selection for purchasing
   - Credit requirement validation
   - Status monitoring and billing dates

## Database Functions

### `get_tenant_credit_balance(tenant_id)`
Returns current credit balance for a tenant.

### `update_credits(tenant_id, amount, type, description, reference_id)`
Safely updates credit balance with transaction logging:
- Prevents negative balances for deductions
- Logs all transactions automatically
- Returns success/failure status

## Environment Variables

```env
# Existing Vapi variables
VAPI_API_KEY=your_vapi_api_key
VAPI_PHONE_NUMBER_ID=your_default_phone_id

# New Twilio variables (required)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token

# App URL for webhooks
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Installation & Setup

### 1. Database Migration
Run the schema files in order:
```sql
-- Run these in sequence
\i credits-system-schema.sql
\i add-twilio-subaccount-to-tenants.sql
\i update-call-logs-for-twilio.sql
```

### 2. Environment Configuration
Add Twilio credentials to your environment:
```bash
# .env.local
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
```

### 3. Initial Credits
Grant initial credits to existing tenants:
```sql
-- Example: Give 1000 credits to all existing tenants
INSERT INTO credit_balances (tenant_id, balance)
SELECT id, 1000 FROM tenants
ON CONFLICT (tenant_id) DO UPDATE SET balance = 1000;
```

## Credit Management

### Adding Credits
Users can add credits through the UI:
- Quick buttons for 500, 1000, 5000 credits
- Instant balance updates
- Transaction logging

### Automatic Deductions
Credits are automatically deducted:
- **Voice calls**: On call completion (minimum 1 minute)
- **Phone numbers**: On purchase (setup fee) and monthly billing
- **Failed calls**: Still charged minimum 1 minute

### Insufficient Balance Handling
- Voice agent creation: Not blocked (credits checked at call time)
- Phone number purchase: Blocked with clear error message
- Call attempts: Gracefully handled by Vapi

## Webhook Integration

The Vapi webhook automatically:
1. **Logs call start** with voice agent information
2. **Updates transcripts** in real-time during calls
3. **Calculates duration** and deducts credits on call end
4. **Handles billing** with minimum 1-minute charges

## Security & RLS

All tables implement Row Level Security:
- Tenants can only access their own data
- Service role has full access for system operations
- Credit functions use SECURITY DEFINER for safe operations

## Migration Notes

### Breaking Changes
- `VoiceAgent.costPerMinute` field removed
- Voice agent creation modal no longer accepts cost input
- Fixed pricing model replaces user-defined costs

### Backward Compatibility
- Existing voice agents continue to work
- Call logging enhanced but maintains compatibility
- No changes required to existing Vapi integrations

## Future Enhancements

### Planned Features
- **Payment integration** for credit purchases
- **Monthly billing cycles** for phone numbers
- **Usage analytics** and reporting
- **Credit expiration** policies
- **Bulk phone number** management
- **International phone** number support

### API Extensibility
The credits system is designed to support:
- Multiple currency options
- Tiered pricing models
- Enterprise billing features
- Integration with payment processors

## Troubleshooting

### Common Issues

1. **Insufficient Credits Error**
   - Check current balance via API or UI
   - Add credits before attempting operations
   - Verify pricing configuration

2. **Phone Number Purchase Fails**
   - Verify Twilio credentials
   - Check area code availability
   - Ensure webhook URLs are accessible

3. **Credits Not Deducting**
   - Check webhook configuration
   - Verify Vapi call completion events
   - Review database function permissions

### Debug Commands

```sql
-- Check credit balance
SELECT * FROM credit_balances WHERE tenant_id = 'tenant_id';

-- View recent transactions
SELECT * FROM credit_transactions 
WHERE tenant_id = 'tenant_id' 
ORDER BY created_at DESC LIMIT 10;

-- Check pricing config
SELECT * FROM pricing_config WHERE is_active = true;
```

## Support

For issues related to:
- **Credits system**: Check transaction logs and balance functions
- **Phone numbers**: Verify Twilio integration and webhook setup
- **Voice agents**: Ensure proper Vapi configuration and credit availability

The system provides comprehensive logging for troubleshooting and audit purposes. 