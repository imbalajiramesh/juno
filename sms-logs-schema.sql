-- SMS Logs Table for tracking all SMS messages
CREATE TABLE sms_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    twilio_sid TEXT NOT NULL UNIQUE, -- Twilio Message SID
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    message_body TEXT,
    status TEXT, -- Twilio message status (queued, sent, received, delivered, failed, etc.)
    direction TEXT DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),
    credits_charged INTEGER DEFAULT 0,
    sent_at TIMESTAMPTZ, -- For outbound messages
    received_at TIMESTAMPTZ, -- For inbound messages
    delivered_at TIMESTAMPTZ, -- When Twilio confirms delivery
    failed_reason TEXT, -- If delivery failed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_sms_logs_tenant_id ON sms_logs(tenant_id);
CREATE INDEX idx_sms_logs_twilio_sid ON sms_logs(twilio_sid);
CREATE INDEX idx_sms_logs_direction ON sms_logs(direction);
CREATE INDEX idx_sms_logs_status ON sms_logs(status);
CREATE INDEX idx_sms_logs_created_at ON sms_logs(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only access their tenant's SMS logs"
  ON sms_logs
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Service role can access all SMS logs"
  ON sms_logs
  FOR ALL
  TO service_role
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_sms_logs_updated_at
    BEFORE UPDATE ON sms_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON sms_logs TO authenticated;

-- Add SMS webhook status update function
CREATE OR REPLACE FUNCTION update_sms_status(
    twilio_sid_param TEXT,
    status_param TEXT,
    delivered_at_param TIMESTAMPTZ DEFAULT NULL,
    failed_reason_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE sms_logs 
    SET 
        status = status_param,
        delivered_at = COALESCE(delivered_at_param, delivered_at),
        failed_reason = COALESCE(failed_reason_param, failed_reason),
        updated_at = NOW()
    WHERE twilio_sid = twilio_sid_param;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add low balance notification preferences table
CREATE TABLE IF NOT EXISTS tenant_notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    low_balance_threshold INTEGER DEFAULT 100, -- Credits threshold for warnings
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    notification_email TEXT, -- Override email for notifications
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for notification preferences
ALTER TABLE tenant_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their tenant's notification preferences"
  ON tenant_notification_preferences
  FOR ALL
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Service role can access all notification preferences"
  ON tenant_notification_preferences
  FOR ALL
  TO service_role
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_tenant_notification_preferences_updated_at
    BEFORE UPDATE ON tenant_notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_notification_preferences TO authenticated;

-- Insert default notification preferences for existing tenants
INSERT INTO tenant_notification_preferences (tenant_id)
SELECT id FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- Final summary
DO $$
BEGIN
    RAISE NOTICE '================================';
    RAISE NOTICE 'SMS Integration Schema Complete!';
    RAISE NOTICE '================================';
    RAISE NOTICE 'Tables Created:';
    RAISE NOTICE '• sms_logs - SMS message tracking';
    RAISE NOTICE '• tenant_notification_preferences - Low balance alerts';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions Created:';
    RAISE NOTICE '• update_sms_status() - Update SMS delivery status';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '• Configure Twilio webhook: /api/webhooks/twilio/sms';
    RAISE NOTICE '• Set up CRON_SECRET environment variable';
    RAISE NOTICE '• Test SMS sending via /api/sms/send';
    RAISE NOTICE '================================';
END $$; 