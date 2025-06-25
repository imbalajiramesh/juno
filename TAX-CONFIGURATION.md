# 🔧 Tax Configuration Setup

## Environment Variables

Add these variables to your `.env` file to enable manual Ontario HST calculation:

```bash
# Manual Tax Configuration for Ontario HST
MANUAL_TAX_ENABLED=true
ONTARIO_HST_RATE=0.13
TAX_REGISTRATION_NUMBER=your_hst_number_here
BUSINESS_ADDRESS=Ontario, Canada
```

## Configuration Details

### `MANUAL_TAX_ENABLED=true`
- Enables the manual tax calculation system
- Set to `false` to disable tax collection

### `ONTARIO_HST_RATE=0.13`
- Ontario HST rate (13%)
- This is the combined federal GST (5%) + provincial portion (8%)

### `TAX_REGISTRATION_NUMBER=your_hst_number_here`
- Replace with your actual HST registration number
- Required for tax compliance and receipts
- Format: Usually starts with numbers (e.g., 123456789RT0001)

### `BUSINESS_ADDRESS=Ontario, Canada`
- Your business address for tax compliance
- Used in receipts and tax documentation

## HST Registration Number

To get your HST registration number:

1. **Register with CRA**: Visit canada.ca/taxes/business
2. **Complete GST/HST registration**: Online or by phone
3. **Receive your number**: Usually within 2-3 business days
4. **Add to environment**: Replace `your_hst_number_here` with actual number

## Testing Configuration

Once configured, the system will:
- ✅ Calculate 13% HST on all purchases
- ✅ Display tax breakdown to customers
- ✅ Include tax in Stripe payment amounts
- ✅ Store tax information for reporting
- ✅ Generate compliant receipts

## Example Tax Calculation

**Starter Package ($9.99 USD)**:
- Subtotal: $9.99 USD
- HST (13%): $1.30 USD
- **Total: $11.29 USD**

Customers will see the full breakdown before payment.

## Important Notes

### **USD Pricing with Canadian Tax**
- Your prices remain in **USD** for international customers
- Ontario HST (13%) is calculated and collected in **USD equivalent**
- This is compliant for Canadian businesses selling internationally
- Customers pay the total amount in USD through Stripe 