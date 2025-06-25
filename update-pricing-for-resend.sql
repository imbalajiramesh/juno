-- Update pricing configuration for Resend integration
-- No decimal credits - whole numbers only
-- Resend pricing: $20/month for 50,000 emails = $0.0004 per email
-- Target: Make emails affordable while maintaining profit margin

-- Update existing email pricing to 1 credit per email
UPDATE pricing_config 
SET 
    credits_per_unit = 1,
    description = 'Credits per email sent'
WHERE service_type = 'email_send';

-- Update voice call pricing to ensure profitable margins
-- Cost analysis: VAPI (~$0.20/min) + Twilio (~$0.0085/min) = ~$0.21/min total cost
-- New pricing: 25 credits/min ensures profit even for Enterprise+ customers
UPDATE pricing_config 
SET 
    credits_per_unit = 25,
    description = 'Credits per minute for voice calls (includes AI processing, transcription, and telephony)'
WHERE service_type = 'voice_call';

-- Clear existing credit packages and insert new ones
DELETE FROM credit_packages;

-- Insert new balanced credit packages (general purpose for all services)
INSERT INTO credit_packages (name, credits, price_usd_cents, credits_per_dollar, is_popular, description) 
VALUES
-- 6 packages with general descriptions for voice, phone, email, SMS usage
('Starter', 500, 999, 50.05, false, 'Perfect for testing and small businesses'),
('Business', 1000, 1799, 55.58, false, 'Great for mixed usage scenarios'),
('Professional', 2500, 3999, 62.52, true, 'Great value for active businesses'),
('Scale', 5000, 6999, 71.44, false, 'High volume usage with better rates'),
('Enterprise', 10000, 11999, 83.34, false, 'Best rate for enterprise customers'),
('Enterprise+', 25000, 24999, 100.00, false, 'Maximum value for large organizations'); 