# 💳 Payment Method Saving in Juno

## 🚀 **How It Works**

When a user purchases credits, their payment method is **automatically saved** for future use. Here's the complete flow:

### **1. Payment Intent Creation**
```typescript
// Payment intent with setup_future_usage
const paymentIntent = await stripe.paymentIntents.create({
  amount: formatAmountForStripe(totalAmount),
  currency: 'usd',
  customer: stripeCustomerId,
  setup_future_usage: 'off_session', // 🔑 This saves the card!
  // ... other options
});
```

### **2. Customer Completes Payment**
- Customer enters card details
- Stripe processes payment
- **Payment method automatically attached** to customer
- Credits added to account

### **3. Webhook Saves Card Details**
When payment succeeds, the webhook:
- Detects attached payment method
- Retrieves card details from Stripe
- Saves to `payment_methods` table:
  ```sql
  INSERT INTO payment_methods (
    tenant_id,
    stripe_payment_method_id,
    card_brand,        -- 'visa', 'mastercard', etc.
    card_last4,        -- '4242'
    card_exp_month,    -- 12
    card_exp_year,     -- 2025
    is_default,        -- true if first card
    is_active          -- true
  )
  ```

## 🔄 **Complete Flow Diagram**

```
Purchase Credits
      ↓
Create Payment Intent (with setup_future_usage)
      ↓
Customer Pays
      ↓
Stripe Attaches Payment Method
      ↓
payment_intent.succeeded webhook
      ↓
Add Credits + Save Payment Method
      ↓
Card Available for Future Use
```

## 📋 **What Gets Saved**

### **Card Information:**
- **Brand**: Visa, Mastercard, Amex, etc.
- **Last 4 digits**: For identification
- **Expiry date**: Month and year
- **Stripe payment method ID**: For future charges

### **Customer Benefits:**
- ✅ **No re-entering card details** for future purchases
- ✅ **Faster checkout** experience
- ✅ **Secure storage** via Stripe (PCI compliant)
- ✅ **Multiple cards** supported

### **Security:**
- ✅ **No sensitive data** stored in your database
- ✅ **Only safe metadata** (last4, brand, expiry)
- ✅ **Stripe handles** all sensitive information
- ✅ **PCI compliant** by default

## 🎯 **Customer Experience**

### **First Purchase:**
1. **Enter card details** during checkout
2. **Complete payment** 
3. **Card automatically saved**
4. **See confirmation**: "Payment method saved for future use"

### **Future Purchases:**
1. **Select saved card** from payment methods
2. **One-click purchase** (no re-entering details)
3. **Or add new card** if desired

## 🛠️ **For Developers**

### **Database Schema:**
```sql
-- payment_methods table
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  stripe_payment_method_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **Webhook Events:**
- `payment_intent.succeeded` → Saves payment method if attached
- `payment_method.attached` → Direct payment method attachment
- Both events call `savePaymentMethod()` function

### **API Endpoints:**
- `GET /api/stripe/payment-methods` → List saved cards
- `DELETE /api/stripe/payment-methods/[id]` → Remove card
- `POST /api/stripe/create-payment-intent` → Create payment with saving

## 🔧 **Configuration**

### **Enable/Disable Saving:**
To disable automatic saving, remove `setup_future_usage` from payment intent:
```typescript
// Disable saving
const paymentIntent = await stripe.paymentIntents.create({
  // ... other options
  // setup_future_usage: 'off_session', // Remove this line
});
```

### **Customer Choice:**
You could add a checkbox to let customers opt-out:
```typescript
// Conditional saving based on user preference
setup_future_usage: shouldSaveCard ? 'off_session' : undefined,
```

## ✅ **Current Status**

**✅ ENABLED**: Payment methods are now automatically saved when users purchase credits

**✅ SECURE**: Only safe metadata stored, Stripe handles sensitive data

**✅ COMPLIANT**: PCI compliant via Stripe's secure infrastructure

**✅ USER-FRIENDLY**: Clear messaging about card saving

Users will now have their cards saved automatically for faster future purchases! 🎉 