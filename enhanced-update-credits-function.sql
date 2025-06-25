-- Enhanced update_credits function with auto-recharge checking
CREATE OR REPLACE FUNCTION update_credits(
  tenant_id_param TEXT,
  amount_param INTEGER,
  transaction_type_param TEXT,
  description_param TEXT,
  reference_id_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER := 0;
  new_balance INTEGER := 0;
  should_check_auto_recharge BOOLEAN := FALSE;
BEGIN
  -- Get current balance
  SELECT COALESCE(balance, 0) INTO current_balance
  FROM credit_balances 
  WHERE tenant_id = tenant_id_param;

  -- For deductions, check if we have sufficient balance
  IF amount_param < 0 AND current_balance < ABS(amount_param) THEN
    RAISE EXCEPTION 'Insufficient credits. Current balance: %, Required: %', 
                    current_balance, ABS(amount_param);
    RETURN FALSE;
  END IF;

  -- Calculate new balance
  new_balance := current_balance + amount_param;
  
  -- Check if this is a deduction that might trigger auto-recharge
  IF amount_param < 0 THEN
    should_check_auto_recharge := TRUE;
  END IF;

  -- Insert or update credit balance
  INSERT INTO credit_balances (tenant_id, balance, last_updated)
  VALUES (tenant_id_param, new_balance, NOW())
  ON CONFLICT (tenant_id) 
  DO UPDATE SET 
    balance = new_balance,
    last_updated = NOW();

  -- Insert transaction record
  INSERT INTO credit_transactions (
    tenant_id, 
    transaction_type, 
    amount, 
    description, 
    reference_id
  ) VALUES (
    tenant_id_param, 
    transaction_type_param, 
    amount_param, 
    description_param, 
    reference_id_param
  );

  -- If this was a deduction, check if we should trigger auto-recharge
  -- We do this after the successful transaction to ensure accuracy
  IF should_check_auto_recharge THEN
    -- Check if auto-recharge should be triggered for this tenant
    PERFORM check_and_queue_auto_recharge(tenant_id_param, new_balance);
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if auto-recharge should be queued
-- This function can notify external systems or queue auto-recharge tasks
CREATE OR REPLACE FUNCTION check_and_queue_auto_recharge(
  tenant_id_param TEXT,
  current_balance_param INTEGER
)
RETURNS VOID AS $$
DECLARE
  auto_recharge_settings RECORD;
  should_trigger BOOLEAN := FALSE;
  last_triggered_threshold TIMESTAMPTZ;
BEGIN
  -- Get auto-recharge settings for this tenant
  SELECT * INTO auto_recharge_settings
  FROM auto_recharge_settings 
  WHERE tenant_id = tenant_id_param 
    AND is_enabled = true;

  -- Exit if auto-recharge is not enabled
  IF auto_recharge_settings.id IS NULL THEN
    RETURN;
  END IF;

  -- Check if balance is below threshold
  IF current_balance_param <= auto_recharge_settings.minimum_balance THEN
    should_trigger := TRUE;
    
    -- Check if auto-recharge was triggered recently (within last hour)
    last_triggered_threshold := NOW() - INTERVAL '1 hour';
    
    IF auto_recharge_settings.last_triggered_at IS NOT NULL 
       AND auto_recharge_settings.last_triggered_at > last_triggered_threshold THEN
      should_trigger := FALSE;
    END IF;
  END IF;

  -- If we should trigger auto-recharge, we can:
  -- 1. Update a flag in the database
  -- 2. Send a notification to external systems
  -- 3. Log the event for processing by cron jobs
  IF should_trigger THEN
    -- Log that auto-recharge should be triggered
    INSERT INTO credit_transactions (
      tenant_id,
      transaction_type,
      amount,
      description,
      reference_id
    ) VALUES (
      tenant_id_param,
      'auto_recharge_needed',
      0,
      FORMAT('Auto-recharge needed: Balance %s <= threshold %s', 
             current_balance_param, 
             auto_recharge_settings.minimum_balance),
      'auto_recharge_check'
    );

    -- In a real-world scenario, you might also:
    -- - Insert into a queue table for processing
    -- - Send a webhook notification
    -- - Trigger a background job
    
    RAISE NOTICE 'Auto-recharge needed for tenant %: balance % <= threshold %', 
                 tenant_id_param, 
                 current_balance_param, 
                 auto_recharge_settings.minimum_balance;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    -- Don't let auto-recharge checking failures affect the main transaction
    RAISE WARNING 'Auto-recharge check failed for tenant %: %', tenant_id_param, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 