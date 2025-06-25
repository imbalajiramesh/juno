// Ontario HST Tax Calculator for Juno
// Handles manual tax calculation for Canadian compliance

export interface TaxCalculation {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  taxName: string;
  taxDescription: string;
  isApplicable: boolean;
}

export interface TaxConfig {
  enabled: boolean;
  rate: number;
  name: string;
  description: string;
  registrationNumber?: string;
  businessAddress?: string;
}

// Ontario HST Configuration
const ONTARIO_TAX_CONFIG: TaxConfig = {
  enabled: process.env.MANUAL_TAX_ENABLED === 'true',
  rate: parseFloat(process.env.ONTARIO_HST_RATE || '0.13'), // 13% HST
  name: 'HST',
  description: 'Harmonized Sales Tax (Ontario)',
  registrationNumber: process.env.TAX_REGISTRATION_NUMBER,
  businessAddress: process.env.BUSINESS_ADDRESS || 'Ontario, Canada',
};

/**
 * Calculate Ontario HST for a given amount
 */
export function calculateTax(subtotal: number): TaxCalculation {
  const config = ONTARIO_TAX_CONFIG;
  
  if (!config.enabled || subtotal <= 0) {
    return {
      subtotal,
      taxRate: 0,
      taxAmount: 0,
      total: subtotal,
      taxName: '',
      taxDescription: '',
      isApplicable: false,
    };
  }

  const taxAmount = Math.round(subtotal * config.rate * 100) / 100; // Round to 2 decimals
  const total = subtotal + taxAmount;

  return {
    subtotal,
    taxRate: config.rate,
    taxAmount,
    total,
    taxName: config.name,
    taxDescription: config.description,
    isApplicable: true,
  };
}

/**
 * Format tax calculation for display
 */
export function formatTaxDisplay(calculation: TaxCalculation, currency: 'USD' | 'CAD' = 'USD'): {
  subtotalDisplay: string;
  taxDisplay: string;
  totalDisplay: string;
  breakdown: string[];
} {
  const currencySymbol = currency === 'USD' ? '$' : 'C$';
  
  return {
    subtotalDisplay: `${currencySymbol}${calculation.subtotal.toFixed(2)} ${currency}`,
    taxDisplay: `${currencySymbol}${calculation.taxAmount.toFixed(2)} ${currency}`,
    totalDisplay: `${currencySymbol}${calculation.total.toFixed(2)} ${currency}`,
    breakdown: [
      `Subtotal: ${currencySymbol}${calculation.subtotal.toFixed(2)} ${currency}`,
      `${calculation.taxName} (${(calculation.taxRate * 100).toFixed(0)}%): ${currencySymbol}${calculation.taxAmount.toFixed(2)} ${currency}`,
      `Total: ${currencySymbol}${calculation.total.toFixed(2)} ${currency}`,
    ],
  };
}

/**
 * Get tax information for receipts/invoices
 */
export function getTaxReceiptInfo(): {
  registrationNumber?: string;
  businessAddress?: string;
  taxName: string;
  taxDescription: string;
  rate: number;
} {
  const config = ONTARIO_TAX_CONFIG;
  
  return {
    registrationNumber: config.registrationNumber,
    businessAddress: config.businessAddress,
    taxName: config.name,
    taxDescription: config.description,
    rate: config.rate,
  };
}

/**
 * Validate tax configuration
 */
export function validateTaxConfig(): {
  isValid: boolean;
  errors: string[];
} {
  const config = ONTARIO_TAX_CONFIG;
  const errors: string[] = [];

  if (config.enabled) {
    if (!config.rate || config.rate <= 0 || config.rate > 1) {
      errors.push('Invalid tax rate. Must be between 0 and 1.');
    }
    
    if (!config.registrationNumber) {
      errors.push('Tax registration number is required when tax is enabled.');
    }
    
    if (!config.businessAddress) {
      errors.push('Business address is required when tax is enabled.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate tax for Stripe payment intent (in cents)
 */
export function calculateTaxForStripe(amountInCents: number): {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  taxCalculation: TaxCalculation;
} {
  const subtotalDollars = amountInCents / 100;
  const taxCalculation = calculateTax(subtotalDollars);
  
  return {
    subtotalCents: Math.round(taxCalculation.subtotal * 100),
    taxCents: Math.round(taxCalculation.taxAmount * 100),
    totalCents: Math.round(taxCalculation.total * 100),
    taxCalculation,
  };
}

/**
 * Check if tax should be applied based on business rules
 */
export function shouldApplyTax(customerType: 'B2B' | 'B2C' = 'B2C'): boolean {
  // In Canada, B2B uses reverse charge mechanism
  // Only collect tax for B2C customers
  return ONTARIO_TAX_CONFIG.enabled && customerType === 'B2C';
}

/**
 * Get tax summary for reporting
 */
export function getTaxSummary(transactions: Array<{ amount: number; taxAmount: number; date: Date }>): {
  totalSales: number;
  totalTaxCollected: number;
  transactionCount: number;
  averageTaxRate: number;
  periodStart: Date;
  periodEnd: Date;
} {
  if (transactions.length === 0) {
    return {
      totalSales: 0,
      totalTaxCollected: 0,
      transactionCount: 0,
      averageTaxRate: 0,
      periodStart: new Date(),
      periodEnd: new Date(),
    };
  }

  const totalSales = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalTaxCollected = transactions.reduce((sum, t) => sum + t.taxAmount, 0);
  const averageTaxRate = totalSales > 0 ? totalTaxCollected / totalSales : 0;
  
  const dates = transactions.map(t => t.date).sort();
  
  return {
    totalSales,
    totalTaxCollected,
    transactionCount: transactions.length,
    averageTaxRate,
    periodStart: dates[0],
    periodEnd: dates[dates.length - 1],
  };
} 