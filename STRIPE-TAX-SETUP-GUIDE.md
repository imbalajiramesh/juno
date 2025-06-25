# 🧾 Stripe Tax Setup Guide for Juno

## ✅ **What We've Implemented**

I've just added complete Stripe Tax support to your Juno system! Here's what's now available:

### **New Features:**
- ✅ **Automatic tax calculation** based on customer location
- ✅ **Tax-compliant checkout** with address collection
- ✅ **Business tax ID collection** for B2B customers
- ✅ **Tax breakdown display** in receipts
- ✅ **Webhook handling** for tax-inclusive payments
- ✅ **Payment method saving** during checkout

### **New API Endpoints:**
- `POST /api/stripe/create-checkout-session` - Tax-enabled checkout
- Enhanced webhook handling for `checkout.session.completed`

### **New Components:**
- `StripeCheckoutForm` - Tax-aware payment component
- Enhanced payment flow with tax information

## 🚀 **Setup Steps**

### **Step 1: Enable Stripe Tax (REQUIRED)**

1. **Go to your Stripe Dashboard**
2. **Navigate to**: Settings → Tax
3. **Click "Enable Stripe Tax"**
4. **Complete the setup**:
   - Enter your business information
   - Add tax registrations for countries where you're liable
   - Configure tax settings

### **Step 2: Configure Tax Registrations**

Add tax registrations for regions where you have tax obligations:

#### **United States:**
- Go to Tax → Tax registrations → Add registration
- Select "United States"
- Add states where you have economic nexus
- Common thresholds: $100,000 in sales or 200 transactions

#### **European Union:**
- Select "European Union"
- Add countries where you sell
- Consider OSS (One Stop Shop) for simplified filing

#### **Other Countries:**
- United Kingdom: VAT registration
- Canada: GST/HST registration
- Australia: GST registration

### **Step 3: Update Webhook Configuration**

Add the new webhook event to your Stripe Dashboard:

1. **Go to**: Developers → Webhooks
2. **Edit your existing webhook endpoint**
3. **Add event**: `checkout.session.completed`
4. **Your webhook should now listen for**:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_method.attached`
   - `customer.updated`
   - `checkout.session.completed` ← **NEW**

### **Step 4: Test the Implementation**

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to**: `/settings/credits`

3. **Try purchasing credits**:
   - Click "Purchase Credits"
   - Select a package
   - Click "Proceed to Checkout"
   - You'll be redirected to Stripe Checkout
   - Enter a test address to see tax calculation

4. **Test with different addresses**:
   - **US Address**: Should show sales tax (varies by state)
   - **EU Address**: Should show VAT (17-27%)
   - **UK Address**: Should show 20% VAT

### **Step 5: Test Cards for Tax Testing**

Use these addresses with Stripe test cards:

#### **US Address (Sales Tax):**
```
123 Main Street
New York, NY 10001
United States
```

#### **EU Address (VAT):**
```
123 Example Street
Berlin, 10115
Germany
```

#### **UK Address (VAT):**
```
123 Test Road
London, SW1A 1AA
United Kingdom
```

## 💰 **Pricing Impact**

### **Additional Costs:**
- **Stripe Tax fee**: 0.5% per transaction with tax
- **Example**: $10 purchase = $0.05 additional fee

### **Customer Experience:**
- **Before**: Customer pays $9.99
- **After**: Customer pays $9.99 + applicable tax (e.g., $11.99 total)

## 🎯 **What Customers Will See**

### **1. Purchase Flow:**
1. Click "Proceed to Checkout" 
2. Redirected to Stripe Checkout page
3. Enter billing address
4. See tax calculation in real-time
5. Complete payment with tax-inclusive total

### **2. Tax Display:**
- **Subtotal**: $9.99
- **Tax**: $2.00 (20% VAT)
- **Total**: $11.99

### **3. Receipt:**
- Shows tax breakdown
- Includes tax registration numbers
- Compliant with local tax requirements

## 🔄 **Migration Strategy**

### **Option 1: Immediate Switch (Recommended)**
- All new purchases use tax-enabled checkout
- Existing customers see tax on next purchase
- Simple and clean implementation

### **Option 2: Gradual Rollout**
- Enable for new customers first
- Migrate existing customers over time
- More complex but lower risk

## 📊 **Monitoring & Reporting**

### **Stripe Dashboard:**
- **Tax reports**: Automatic tax reporting
- **Payments**: See tax amounts in payment details
- **Customers**: View customer tax information

### **Your Database:**
- Payment history includes tax details
- Webhook data contains tax breakdown
- Customer addresses stored for compliance

## ⚠️ **Important Notes**

### **Tax Compliance:**
- **You're still responsible** for filing tax returns
- **Stripe Tax helps with calculation**, not filing
- **Consider hiring a tax professional** for complex situations

### **Business Registration:**
- **Register for tax** in applicable jurisdictions
- **Update your terms of service** to mention tax collection
- **Keep records** of tax registrations

### **Customer Communication:**
- **Update pricing pages** to mention tax-inclusive pricing
- **Add tax policy** to your website
- **Train support team** on tax questions

## 🚨 **Troubleshooting**

### **Tax not calculating?**
1. Check Stripe Tax is enabled in dashboard
2. Verify webhook is receiving `checkout.session.completed`
3. Ensure customer address is being collected

### **Wrong tax rates?**
1. Verify tax registrations in Stripe Dashboard
2. Check customer address format
3. Review tax settings for each jurisdiction

### **Payments failing?**
1. Check webhook endpoint is working
2. Verify database schema supports tax data
3. Review error logs in Stripe Dashboard

## 🎉 **You're All Set!**

Your Juno system now has:
- ✅ **Automatic tax calculation**
- ✅ **Global tax compliance**
- ✅ **Professional checkout experience**
- ✅ **Tax reporting support**
- ✅ **Future-proof tax handling**

**Next Steps:**
1. Enable Stripe Tax in your dashboard
2. Add tax registrations for your markets
3. Test with different addresses
4. Update your terms of service
5. Launch to customers!

**Questions?** Check the Stripe Tax documentation or reach out for help with specific tax compliance questions. 