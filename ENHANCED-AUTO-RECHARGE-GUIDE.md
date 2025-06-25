# Enhanced Auto-Recharge System Guide

## 🚀 **Overview**

The enhanced auto-recharge system provides intelligent, balance-aware credit management with real-time monitoring, smart recommendations, and full tax compliance.

## ✨ **Key Features**

### 1. **Real-Time Balance Monitoring**
- Displays current credit balance with status indicators
- Color-coded warnings (Critical: ≤50, Low: ≤200, Good: >200)
- One-click balance refresh
- Automatic balance updates after transactions

### 2. **Intelligent Recommendations**
- **Smart minimum balance**: Suggests 25% of current balance (50-500 range)
- **Package selection**: Visual credit package chooser with pricing
- **Balance-aware suggestions**: Recommendations based on usage patterns

### 3. **Enhanced User Experience**
- **Visual package selection**: Cards showing credits, pricing, and popularity
- **Live preview**: Shows exactly what will happen when auto-recharge triggers
- **Validation**: Prevents invalid configurations (min ≥ recharge amount)
- **Tax transparency**: Clear breakdown of costs including HST

### 4. **Tax Compliance**
- **Ontario HST**: Automatic 13% tax calculation
- **Tax breakdown**: Clear display of subtotal + tax = total
- **Compliance tracking**: All tax data stored for CRA reporting
- **Receipt information**: Complete tax details in notifications

## 🔧 **How It Works**

### **Setup Process**
```
1. User opens Auto-Recharge settings
2. System fetches current balance + available packages
3. User sees balance status with intelligent recommendations
4. User selects minimum threshold (with suggested value)
5. User chooses credit package from visual selector
6. User selects saved payment method
7. System shows complete preview of auto-recharge behavior
8. User saves settings → stored in database
```

### **Auto-Recharge Trigger**
```
Balance Check → Threshold Met → Package Selection → Tax Calculation → Payment Processing → Credits Added
     ↓              ↓                 ↓                 ↓                  ↓                ↓
Current: 95    Min: 100        Business: 1000    $17.99 + $2.34 HST   Stripe Payment   1000 credits
```

### **Database Integration**
```sql
-- Auto-recharge settings stored in:
auto_recharge_settings (
  tenant_id,
  is_enabled,
  minimum_balance,     -- User-defined threshold
  recharge_amount,     -- Credits from selected package
  payment_method_id,   -- Saved card reference
  last_triggered_at    -- Prevents duplicate triggers
)

-- Payment records with tax breakdown:
payment_history (
  subtotal_usd_cents,    -- Base package price
  tax_amount_usd_cents,  -- HST amount
  tax_rate,              -- 0.13 for Ontario
  amount_usd_cents,      -- Total charged
  is_auto_recharge       -- Distinguishes auto vs manual
)
```

## 🎯 **User Interface Components**

### **Balance Display**
```
┌─────────────────────────────────────┐
│ 🪙 Current Balance          🔄      │
│                                     │
│ ⚠️  127 credits                     │
│     Low balance - consider enabling │
│     auto-recharge                   │
└─────────────────────────────────────┘
```

### **Package Selection**
```
┌─────────────────┐  ┌─────────────────┐
│ Business        │  │ Professional    │
│ 📈 Popular      │  │                 │
│ 1,000 credits   │  │ 2,500 credits   │
│ $17.99          │  │ $39.99          │
│ Great for...    │  │ Perfect for...  │
└─────────────────┘  └─────────────────┘
```

### **Auto-Recharge Preview**
```
┌─────────────────────────────────────┐
│ ⚡ Auto-Recharge Summary            │
│                                     │
│ • When balance drops below 100      │
│ • Automatically purchase 1,000     │
│ • Charge VISA ****1234             │
│ • Cost: $17.99 + tax               │
└─────────────────────────────────────┘
```

## 🔄 **Cron Job Integration**

The enhanced system works seamlessly with existing cron jobs:

### **Daily Check (8 AM UTC)**
```typescript
// api/cron/auto-recharge-check.ts
1. Query all tenants with auto-recharge enabled
2. For each tenant:
   - Get current balance via get_tenant_credit_balance()
   - Check if balance ≤ minimum_balance
   - Verify payment method is valid
   - Calculate tax on recharge amount
   - Process payment with tax
   - Add credits to account
   - Update last_triggered_at
```

### **Real-Time Monitoring**
```typescript
// Triggered during SMS/Call usage
1. Credit deduction occurs
2. Check if auto-recharge needed
3. Trigger immediately if threshold met
4. Prevent duplicate triggers (1-hour cooldown)
```

## 💳 **Payment Processing**

### **Tax Calculation**
```typescript
// lib/tax-calculator.ts
const taxCalculation = calculateTax(subtotalCents);
// Returns: { subtotal, taxAmount, total, taxRate, taxName }

// Example for Business package ($17.99):
{
  subtotal: 1799,      // $17.99 in cents
  taxAmount: 234,      // $2.34 HST (13%)
  total: 2033,         // $20.33 total
  taxRate: 0.13,       // 13%
  taxName: "HST"       // Ontario HST
}
```

### **Stripe Payment Intent**
```typescript
stripe.paymentIntents.create({
  amount: 2033,                    // Total with tax
  currency: 'usd',
  customer: 'cus_...',
  payment_method: 'pm_...',
  off_session: true,               // Saved card payment
  confirm: true,                   // Process immediately
  metadata: {
    subtotal_usd_cents: '1799',
    tax_amount_usd_cents: '234',
    tax_rate: '0.13',
    tax_name: 'HST',
    is_auto_recharge: 'true'
  }
})
```

## 📊 **Validation & Error Handling**

### **Pre-Save Validation**
- ✅ Payment method selected
- ✅ Minimum balance ≥ 10 credits
- ✅ Recharge amount ≥ 100 credits
- ✅ Recharge amount > minimum balance
- ✅ Valid credit package selected

### **Runtime Error Handling**
- 💳 **Card declined**: Graceful error message, disable auto-recharge
- 🔄 **Duplicate trigger**: 1-hour cooldown prevents multiple charges
- 📊 **Balance check failure**: Logs error, continues with other tenants
- 🏦 **Stripe API error**: Retry logic with exponential backoff

## 🎯 **User Benefits**

### **For Users**
- **Intelligent setup**: Smart recommendations based on current usage
- **Visual clarity**: See exactly what will happen before enabling
- **Tax transparency**: Clear breakdown of all costs
- **Peace of mind**: Never run out of credits unexpectedly

### **For Business**
- **Higher retention**: Users less likely to churn due to empty balances
- **Predictable revenue**: Regular auto-recharge payments
- **Tax compliance**: Complete audit trail for CRA reporting
- **Reduced support**: Fewer "out of credits" tickets

## 🔧 **Technical Implementation**

### **Files Modified/Created**
```
components/auto-recharge-settings.tsx     # Enhanced UI component
app/api/stripe/auto-recharge/route.ts     # Updated with tax support
add-tax-columns-to-payment-history.sql   # Database migration
lib/tax-calculator.ts                     # Tax calculation service
```

### **Database Schema Updates**
```sql
-- New columns in payment_history
ALTER TABLE payment_history ADD COLUMN subtotal_usd_cents INTEGER NOT NULL;
ALTER TABLE payment_history ADD COLUMN tax_amount_usd_cents INTEGER DEFAULT 0;
ALTER TABLE payment_history ADD COLUMN tax_rate DECIMAL(5,4) DEFAULT 0;
```

### **API Endpoints Used**
- `GET /api/credits` - Current balance
- `GET /api/credit-packages` - Available packages
- `GET /api/stripe/auto-recharge` - Current settings
- `POST /api/stripe/auto-recharge` - Save settings & trigger

## 🚀 **Deployment Checklist**

### **Database Migration**
```bash
# Run the tax columns migration
psql -d your_database -f add-tax-columns-to-payment-history.sql
```

### **Environment Variables**
```bash
MANUAL_TAX_ENABLED=true
ONTARIO_HST_RATE=0.13
TAX_REGISTRATION_NUMBER=your_hst_number
BUSINESS_ADDRESS=Ontario, Canada
```

### **Testing**
1. ✅ Load auto-recharge settings page
2. ✅ Verify balance displays correctly
3. ✅ Test package selection updates recharge amount
4. ✅ Verify tax calculation in preview
5. ✅ Test manual trigger with tax
6. ✅ Confirm cron job processes with tax
7. ✅ Verify payment history includes tax breakdown

## 📈 **Success Metrics**

### **User Engagement**
- **Setup completion rate**: % of users who complete auto-recharge setup
- **Balance maintenance**: Average balance maintained by auto-recharge users
- **Churn reduction**: Lower churn rate for auto-recharge enabled users

### **Revenue Impact**
- **Auto-recharge volume**: Monthly credits purchased via auto-recharge
- **Average transaction size**: Typical package selected for auto-recharge
- **Payment success rate**: % of auto-recharge attempts that succeed

### **Operational Efficiency**
- **Support ticket reduction**: Fewer "out of credits" support requests
- **Tax compliance**: Complete audit trail for all transactions
- **System reliability**: 99.9%+ uptime for auto-recharge processing

---

## 🎉 **Result**

The enhanced auto-recharge system provides a **professional, intelligent, and tax-compliant** solution that:

- **Reduces user friction** with smart recommendations
- **Increases revenue** through higher engagement
- **Ensures compliance** with Canadian tax requirements
- **Improves user experience** with clear, transparent pricing
- **Reduces support burden** through automated balance management

Users can now **"set it and forget it"** with confidence, knowing their credits will automatically replenish at the right time, with the right amount, at a fair and transparent price. 