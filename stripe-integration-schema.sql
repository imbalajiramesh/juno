-- Stripe Integration Schema
-- Manages saved payment methods, customers, and auto-recharge settings

-- Stripe Customers Table
CREATE TABLE stripe_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    stripe_customer_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id)
);

-- Saved Payment Methods Table
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    stripe_payment_method_id TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT NOT NULL,
    card_brand TEXT NOT NULL, -- visa, mastercard, etc.
    card_last4 TEXT NOT NULL,
    card_exp_month INTEGER NOT NULL,
    card_exp_year INTEGER NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-Recharge Settings Table
CREATE TABLE auto_recharge_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT FALSE,
    minimum_balance INTEGER NOT NULL DEFAULT 100, -- Credits threshold to trigger recharge
    recharge_amount INTEGER NOT NULL DEFAULT 1000, -- Credits to add when triggered
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id)
);

-- Payment History Table (for Stripe transactions)
CREATE TABLE payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT NOT NULL,
    payment_method_id UUID REFERENCES payment_methods(id),
    amount_usd_cents INTEGER NOT NULL, -- Amount in cents
    credits_purchased INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
    is_auto_recharge BOOLEAN DEFAULT FALSE,
    stripe_metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_stripe_customers_tenant_id ON stripe_customers(tenant_id);
CREATE INDEX idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);
CREATE INDEX idx_payment_methods_tenant_id ON payment_methods(tenant_id);
CREATE INDEX idx_payment_methods_customer_id ON payment_methods(stripe_customer_id);
CREATE INDEX idx_payment_methods_default ON payment_methods(tenant_id, is_default) WHERE is_default = true;
CREATE INDEX idx_auto_recharge_enabled ON auto_recharge_settings(tenant_id) WHERE is_enabled = true;
CREATE INDEX idx_payment_history_tenant_id ON payment_history(tenant_id);
CREATE INDEX idx_payment_history_status ON payment_history(status);
CREATE INDEX idx_payment_history_created_at ON payment_history(created_at);

-- RLS (Row Level Security) policies
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_recharge_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Stripe customers policies
CREATE POLICY "Users can only access their tenant's Stripe customer"
  ON stripe_customers
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Service role can access all Stripe customers"
  ON stripe_customers
  FOR ALL
  TO service_role
  USING (true);

-- Payment methods policies
CREATE POLICY "Users can only access their tenant's payment methods"
  ON payment_methods
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Service role can access all payment methods"
  ON payment_methods
  FOR ALL
  TO service_role
  USING (true);

-- Auto-recharge settings policies
CREATE POLICY "Users can only access their tenant's auto-recharge settings"
  ON auto_recharge_settings
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Service role can access all auto-recharge settings"
  ON auto_recharge_settings
  FOR ALL
  TO service_role
  USING (true);

-- Payment history policies
CREATE POLICY "Users can only access their tenant's payment history"
  ON payment_history
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Service role can access all payment history"
  ON payment_history
  FOR ALL
  TO service_role
  USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_stripe_customers_updated_at
    BEFORE UPDATE ON stripe_customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auto_recharge_settings_updated_at
    BEFORE UPDATE ON auto_recharge_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_history_updated_at
    BEFORE UPDATE ON payment_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON stripe_customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_methods TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON auto_recharge_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_history TO authenticated;

-- Function to get default payment method for a tenant
CREATE OR REPLACE FUNCTION get_default_payment_method(tenant_id_param TEXT)
RETURNS payment_methods AS $$
DECLARE
  payment_method payment_methods;
BEGIN
  SELECT * INTO payment_method
  FROM payment_methods 
  WHERE tenant_id = tenant_id_param 
    AND is_default = true 
    AND is_active = true
  LIMIT 1;
  
  RETURN payment_method;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if auto-recharge should be triggered
CREATE OR REPLACE FUNCTION should_trigger_auto_recharge(tenant_id_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
  settings auto_recharge_settings;
BEGIN
  -- Get current balance
  current_balance := get_tenant_credit_balance(tenant_id_param);
  
  -- Get auto-recharge settings
  SELECT * INTO settings
  FROM auto_recharge_settings
  WHERE tenant_id = tenant_id_param
    AND is_enabled = true;
  
  -- Check if auto-recharge should be triggered
  RETURN (settings.id IS NOT NULL AND current_balance <= settings.minimum_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 