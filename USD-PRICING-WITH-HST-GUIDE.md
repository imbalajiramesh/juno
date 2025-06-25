# 💵 USD Pricing with Ontario HST Collection

## 🎯 **The Perfect Solution**

You want to:
- ✅ **Keep USD pricing** for international appeal
- ✅ **Collect Ontario HST** for Canadian tax compliance
- ✅ **Avoid currency conversion complexity**
- ✅ **Save money** vs Stripe Tax

## 🔍 **How It Works**

### **Customer Experience:**
1. **Sees USD prices** on your website ($9.99, $17.99, etc.)
2. **Tax calculated in USD** (13% HST applied to USD amount)
3. **Pays total in USD** through Stripe ($9.99 + $1.30 = $11.29 USD)
4. **Receives USD receipt** with tax breakdown

### **Business Compliance:**
1. **Collect HST in USD equivalent** 
2. **Report to CRA** in CAD using exchange rates
3. **Maintain HST registration** in Ontario
4. **File returns** quarterly/annually as required

## 💰 **Example Transaction**

### **Starter Package:**
```
Product: 500 Communication Credits
Price: $9.99 USD

Breakdown:
├── Subtotal: $9.99 USD
├── HST (13%): $1.30 USD
└── Total: $11.29 USD

Customer pays: $11.29 USD
HST collected: $1.30 USD
```

## 📋 **Tax Compliance**

### **For CRA Reporting:**
- **HST collected**: $1.30 USD
- **Exchange rate**: Use Bank of Canada daily rate
- **CAD equivalent**: $1.30 USD × exchange rate
- **Report in CAD** on your HST return

### **Documentation:**
- ✅ **Invoice shows USD amounts**
- ✅ **HST clearly identified**
- ✅ **Your HST number included**
- ✅ **Business address (Ontario)**

## 🌍 **Why This Approach Works**

### **For International Customers:**
- **Familiar USD pricing** (no confusion)
- **No currency conversion** at checkout
- **Standard international experience**

### **For Canadian Compliance:**
- **HST properly collected** at point of sale
- **Meets CRA requirements** for digital services
- **Proper tax documentation** generated
- **Exchange rate handling** at reporting time

### **For Your Business:**
- **No Stripe Tax fees** (0.5% saved)
- **No $120 setup cost** 
- **Simple implementation**
- **International pricing strategy maintained**

## 🔧 **Technical Implementation**

### **Tax Calculation:**
```typescript
// Example: $9.99 USD product
const subtotal = 9.99; // USD
const hstRate = 0.13;  // 13%
const taxAmount = subtotal * hstRate; // $1.30 USD
const total = subtotal + taxAmount;   // $11.29 USD
```

### **Stripe Payment:**
```typescript
// Payment processed in USD
stripe.paymentIntents.create({
  amount: 1129, // $11.29 in cents
  currency: 'usd',
  metadata: {
    subtotal_usd: '9.99',
    tax_amount_usd: '1.30',
    tax_rate: '0.13',
    tax_name: 'HST',
    tax_jurisdiction: 'Ontario, Canada'
  }
})
```

## 📊 **CRA Reporting Process**

### **Quarterly HST Return:**
1. **Collect all USD transactions** with HST
2. **Apply Bank of Canada exchange rates** for each period
3. **Convert HST amounts to CAD**
4. **Report total HST collected** in CAD
5. **Submit return** to CRA

### **Example Calculation:**
```
Transaction: $11.29 USD total ($1.30 HST)
Exchange rate: 1.35 CAD/USD
HST in CAD: $1.30 × 1.35 = $1.76 CAD
Report: $1.76 CAD HST collected
```

## ✅ **Benefits Summary**

### **Customer Benefits:**
- **Familiar USD pricing**
- **No currency surprises**
- **Clear tax breakdown**
- **Professional checkout experience**

### **Business Benefits:**
- **Keep international pricing strategy**
- **Full Canadian tax compliance**
- **No Stripe Tax fees**
- **Simple implementation**
- **Proper CRA documentation**

### **Compliance Benefits:**
- **HST collected at point of sale**
- **Proper tax documentation**
- **CRA-compliant receipts**
- **Exchange rate flexibility**

## 🚀 **Ready to Implement**

This approach gives you the **best of both worlds**:
- **USD pricing** for global appeal
- **HST compliance** for Canadian law
- **Cost savings** vs automated solutions
- **Professional tax handling**

Your customers see familiar USD prices, you collect proper taxes, and you save money on fees while staying compliant! 🎉 