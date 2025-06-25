import { stripe } from './stripe';

// Stripe Tax Configuration
export const STRIPE_TAX_CONFIG = {
  // Enable automatic tax calculation
  automatic_tax: {
    enabled: true,
  },
  // Tax behavior for line items
  tax_behavior: 'exclusive', // Tax added on top of price
  // Alternative: 'inclusive' - Tax included in price
} as const;

// Tax codes for different services
export const TAX_CODES = {
  // Digital services - typically subject to VAT/GST
  digital_services: 'txcd_10103001', // Software as a Service
  communication_services: 'txcd_10401000', // Telecommunications services
  
  // Physical goods (if applicable)
  physical_goods: 'txcd_99999999', // General tangible goods
} as const;

// Function to create payment intent with tax calculation
// Note: For full tax support, use Checkout Sessions instead of Payment Intents
export async function createPaymentIntentWithTax(params: {
  amount: number;
  currency: string;
  customer: string;
  metadata: Record<string, string>;
}) {
  const { amount, currency, customer, metadata } = params;

  // Basic payment intent - for full tax support, use createCheckoutSessionWithTax
  return await stripe.paymentIntents.create({
    amount,
    currency,
    customer,
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  });
}

// Function to create checkout session with tax
export async function createCheckoutSessionWithTax(params: {
  priceId: string;
  customer: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}) {
  const { priceId, customer, successUrl, cancelUrl, customerEmail } = params;

  return await stripe.checkout.sessions.create({
    customer,
    customer_email: customerEmail,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    // Enable automatic tax calculation
    automatic_tax: {
      enabled: true,
    },
    // Collect customer address for tax calculation
    billing_address_collection: 'required',
    shipping_address_collection: {
      allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'ES', 'IT'], // Add your target countries
    },
    // Tax behavior
    tax_id_collection: {
      enabled: true, // Allow business customers to provide tax IDs
    },
  });
}

// Helper function to format tax-inclusive pricing display
export function formatPriceWithTax(basePrice: number, taxAmount: number, currency = 'USD') {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });

  return {
    subtotal: formatter.format(basePrice / 100),
    tax: formatter.format(taxAmount / 100),
    total: formatter.format((basePrice + taxAmount) / 100),
  };
}

// Tax compliance notes for different regions
export const TAX_COMPLIANCE_NOTES = {
  US: {
    description: 'Sales tax varies by state. Digital services may be taxable.',
    requirements: ['State sales tax registration may be required', 'Economic nexus thresholds vary by state'],
  },
  EU: {
    description: 'VAT applies to digital services based on customer location.',
    requirements: ['VAT registration required', 'OSS (One Stop Shop) recommended for multiple EU countries'],
  },
  UK: {
    description: 'VAT applies to digital services at 20%.',
    requirements: ['VAT registration required if revenue exceeds £85,000'],
  },
  CA: {
    description: 'GST/HST applies based on province.',
    requirements: ['GST registration required if revenue exceeds CAD $30,000'],
  },
  AU: {
    description: 'GST applies to digital services at 10%.',
    requirements: ['GST registration required if revenue exceeds AUD $75,000'],
  },
} as const; 