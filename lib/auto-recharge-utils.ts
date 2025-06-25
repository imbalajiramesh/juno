import { createClient } from '@/utils/supabase/server';

/**
 * Check if a tenant needs auto-recharge and trigger it if necessary
 * This function can be called after credit deductions to provide immediate recharge
 */
export async function checkAndTriggerAutoRecharge(tenantId: string): Promise<{
  triggered: boolean;
  creditsAdded?: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Get current balance
    const { data: currentBalance, error: balanceError } = await supabase
      .rpc('get_tenant_credit_balance', { tenant_id_param: tenantId });

    if (balanceError) {
      console.error('Error getting balance for auto-recharge check:', balanceError);
      return { triggered: false, error: 'Failed to check balance' };
    }

    // Use the existing auto-recharge API endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/auto-recharge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}` // Internal API auth
      },
      body: JSON.stringify({ 
        triggerNow: true,
        triggeredBy: 'credit_deduction',
        tenantId: tenantId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 400 && errorData.message?.includes('not needed')) {
        // Auto-recharge not needed (balance above threshold)
        return { triggered: false };
      }
      return { triggered: false, error: errorData.error || 'Auto-recharge request failed' };
    }

    const data = await response.json();
    
    if (data.success) {
      return { 
        triggered: true, 
        creditsAdded: data.creditsAdded || 0 
      };
    } else {
      return { 
        triggered: false, 
        error: data.error || 'Auto-recharge failed' 
      };
    }

  } catch (error) {
    console.error('Error in checkAndTriggerAutoRecharge:', error);
    return { 
      triggered: false, 
      error: 'Internal error during auto-recharge check' 
    };
  }
}

/**
 * Check if a tenant should have auto-recharge triggered based on their current balance
 * This is a lightweight check that doesn't trigger the actual recharge
 */
export async function shouldTriggerAutoRecharge(tenantId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    // Get current balance and auto-recharge settings
    const [balanceResult, settingsResult] = await Promise.all([
      supabase.rpc('get_tenant_credit_balance', { tenant_id_param: tenantId }),
      supabase
        .from('auto_recharge_settings')
        .select('minimum_balance, is_enabled, last_triggered_at')
        .eq('tenant_id', tenantId)
        .eq('is_enabled', true)
        .single()
    ]);

    if (balanceResult.error || settingsResult.error || !settingsResult.data) {
      return false;
    }

    const balance = balanceResult.data || 0;
    const settings = settingsResult.data;

    // Check if balance is below threshold
    if (balance > settings.minimum_balance) {
      return false;
    }

    // Check if auto-recharge was triggered recently (within last hour)
    if (settings.last_triggered_at) {
      const lastTriggered = new Date(settings.last_triggered_at);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      if (lastTriggered > oneHourAgo) {
        return false;
      }
    }

    return true;

  } catch (error) {
    console.error('Error checking auto-recharge conditions:', error);
    return false;
  }
} 