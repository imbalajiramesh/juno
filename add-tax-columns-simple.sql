-- Simple version: Add tax-related columns to payment_history table
-- This supports the manual tax system for Ontario HST compliance

-- Add tax columns to payment_history table
ALTER TABLE payment_history 
ADD COLUMN IF NOT EXISTS subtotal_usd_cents INTEGER,
ADD COLUMN IF NOT EXISTS tax_amount_usd_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,4) DEFAULT 0;

-- Update existing records to have subtotal equal to amount (backwards compatibility)
UPDATE payment_history 
SET subtotal_usd_cents = amount_usd_cents 
WHERE subtotal_usd_cents IS NULL;

-- Make subtotal_usd_cents NOT NULL after setting defaults
ALTER TABLE payment_history 
ALTER COLUMN subtotal_usd_cents SET NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN payment_history.subtotal_usd_cents IS 'Subtotal amount before tax in USD cents';
COMMENT ON COLUMN payment_history.tax_amount_usd_cents IS 'Tax amount in USD cents (e.g., Ontario HST)';
COMMENT ON COLUMN payment_history.tax_rate IS 'Tax rate applied (e.g., 0.13 for 13% HST)';
COMMENT ON COLUMN payment_history.amount_usd_cents IS 'Total amount including tax in USD cents';

-- Create index for tax reporting
CREATE INDEX IF NOT EXISTS idx_payment_history_tax_rate ON payment_history(tax_rate) WHERE tax_rate > 0;

COMMENT ON TABLE payment_history IS 'Stores Stripe payment records with tax breakdown for compliance'; 