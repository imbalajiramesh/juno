-- Credits System Schema
-- This manages credits for voice calls and phone number purchases

-- Credit Balances Table
CREATE TABLE credit_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0, -- Credits in whole numbers
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id)
);

-- Credit Transactions Table  
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'call_charge', 'phone_number_charge', 'email_charge', 'sms_charge', 'whatsapp_charge', 'refund', 'bonus')),
    amount INTEGER NOT NULL, -- Positive for credits added, negative for credits used
    description TEXT NOT NULL,
    reference_id TEXT, -- Can reference call_id, phone_number_id, payment_id, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pricing Configuration Table
CREATE TABLE pricing_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_type TEXT NOT NULL CHECK (service_type IN ('voice_call', 'phone_number_monthly', 'phone_number_setup', 'email_send', 'sms_send', 'sms_receive', 'whatsapp_send', 'whatsapp_receive')),
    credits_per_unit INTEGER NOT NULL, -- Credits per minute for calls, credits per month for phone numbers
    description TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit Packages Table with USD pricing
CREATE TABLE credit_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    price_usd_cents INTEGER NOT NULL, -- Price in cents (e.g., 999 = $9.99)
    credits_per_dollar DECIMAL(10,4) NOT NULL, -- Credits per dollar for comparison
    is_popular BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phone Numbers Table
CREATE TABLE tenant_phone_numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    twilio_sid TEXT NOT NULL,
    twilio_account_sid TEXT, -- The subaccount SID where this number is provisioned
    vapi_phone_number_id TEXT, -- When connected to Vapi
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    monthly_cost_credits INTEGER NOT NULL,
    setup_cost_credits INTEGER NOT NULL DEFAULT 0,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    next_billing_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_credit_balances_tenant_id ON credit_balances(tenant_id);
CREATE INDEX idx_credit_transactions_tenant_id ON credit_transactions(tenant_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX idx_phone_numbers_tenant_id ON tenant_phone_numbers(tenant_id);
CREATE INDEX idx_phone_numbers_status ON tenant_phone_numbers(status);

-- RLS (Row Level Security) policies
ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Credit balances policies
CREATE POLICY "Users can only access their tenant's credit balance"
  ON credit_balances
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Service role can access all credit balances"
  ON credit_balances
  FOR ALL
  TO service_role
  USING (true);

-- Credit transactions policies
CREATE POLICY "Users can only access their tenant's credit transactions"
  ON credit_transactions
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Service role can access all credit transactions"
  ON credit_transactions
  FOR ALL
  TO service_role
  USING (true);

-- Pricing config policies (global read, service role only write)
CREATE POLICY "All authenticated users can read pricing config"
  ON pricing_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage pricing config"
  ON pricing_config
  FOR ALL
  TO service_role
  USING (true);

-- Credit packages policies (global read, service role only write)
CREATE POLICY "All authenticated users can read credit packages"
  ON credit_packages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage credit packages"
  ON credit_packages
  FOR ALL
  TO service_role
  USING (true);

-- Phone numbers policies
CREATE POLICY "Users can only access their tenant's phone numbers"
  ON tenant_phone_numbers
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Service role can access all phone numbers"
  ON tenant_phone_numbers
  FOR ALL
  TO service_role
  USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_pricing_config_updated_at
    BEFORE UPDATE ON pricing_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phone_numbers_updated_at
    BEFORE UPDATE ON tenant_phone_numbers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON credit_balances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON credit_transactions TO authenticated;
GRANT SELECT ON pricing_config TO authenticated;
GRANT SELECT ON credit_packages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_phone_numbers TO authenticated;

-- Insert default pricing configuration
INSERT INTO pricing_config (service_type, credits_per_unit, description) VALUES
('voice_call', 25, 'Credits per minute for voice calls (includes AI processing, transcription, and telephony)'),
('phone_number_monthly', 100, 'Monthly credits for phone number rental'),
('phone_number_setup', 500, 'One-time setup credits for new phone number'),
('email_send', 1, 'Credits per email sent'),
('sms_send', 5, 'Credits per SMS message sent'),
('sms_receive', 1, 'Credits per SMS message received'),
('whatsapp_send', 3, 'Credits per WhatsApp message sent'),
('whatsapp_receive', 1, 'Credits per WhatsApp message received');

-- Insert credit packages with tiered pricing (more credits = better rate)
INSERT INTO credit_packages (name, credits, price_usd_cents, credits_per_dollar, is_popular, description) VALUES
('Starter', 500, 999, 50.05, false, 'Perfect for testing and small businesses'),
('Business', 1000, 1799, 55.58, false, 'Great for mixed usage scenarios'),
('Professional', 2500, 3999, 62.52, true, 'Great value for active businesses'),
('Scale', 5000, 6999, 71.44, false, 'High volume usage with better rates'),
('Enterprise', 10000, 11999, 83.34, false, 'Best rate for enterprise customers'),
('Enterprise+', 25000, 24999, 100.00, false, 'Maximum value for large organizations');

-- Function to get current credit balance
CREATE OR REPLACE FUNCTION get_tenant_credit_balance(tenant_id_param TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE((
    SELECT balance 
    FROM credit_balances 
    WHERE tenant_id = tenant_id_param
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add/subtract credits with transaction logging
CREATE OR REPLACE FUNCTION update_credits(
  tenant_id_param TEXT,
  amount_param INTEGER,
  transaction_type_param TEXT,
  description_param TEXT,
  reference_id_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Get current balance
  current_balance := get_tenant_credit_balance(tenant_id_param);
  new_balance := current_balance + amount_param;
  
  -- Prevent negative balance for deductions
  IF new_balance < 0 AND amount_param < 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Insert or update credit balance
  INSERT INTO credit_balances (tenant_id, balance, last_updated)
  VALUES (tenant_id_param, new_balance, NOW())
  ON CONFLICT (tenant_id) 
  DO UPDATE SET 
    balance = new_balance,
    last_updated = NOW();
  
  -- Log transaction
  INSERT INTO credit_transactions (tenant_id, transaction_type, amount, description, reference_id)
  VALUES (tenant_id_param, transaction_type_param, amount_param, description_param, reference_id_param);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 