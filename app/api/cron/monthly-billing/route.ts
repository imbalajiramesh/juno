import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verify this is a cron request
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  
  try {
    console.log('Starting monthly billing process...');
    
    // Get all phone numbers due for billing
    const { data: phoneNumbers, error: fetchError } = await (supabase as any)
      .from('tenant_phone_numbers')
      .select(`
        id,
        tenant_id,
        phone_number,
        monthly_cost_credits,
        next_billing_date,
        status
      `)
      .eq('status', 'active')
      .lte('next_billing_date', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching phone numbers for billing:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch phone numbers' }, { status: 500 });
    }

    if (!phoneNumbers || phoneNumbers.length === 0) {
      console.log('No phone numbers due for billing');
      return NextResponse.json({ 
        message: 'No phone numbers due for billing',
        processed: 0 
      });
    }

    console.log(`Found ${phoneNumbers.length} phone numbers due for billing`);

    const results = {
      processed: 0,
      failed: 0,
      suspended: 0,
      errors: [] as string[]
    };

    // Process each phone number
    for (const phoneNumber of phoneNumbers) {
      try {
        // Check current credit balance
        const { data: currentBalance, error: balanceError } = await (supabase as any)
          .rpc('get_tenant_credit_balance', { 
            tenant_id_param: phoneNumber.tenant_id 
          });

        if (balanceError) {
          console.error(`Error checking balance for tenant ${phoneNumber.tenant_id}:`, balanceError);
          results.failed++;
          results.errors.push(`Balance check failed for ${phoneNumber.phone_number}`);
          continue;
        }

        const balance = currentBalance || 0;
        const requiredCredits = phoneNumber.monthly_cost_credits;

        if (balance < requiredCredits) {
          // Insufficient balance - suspend the phone number
          const { error: suspendError } = await (supabase as any)
            .from('tenant_phone_numbers')
            .update({ 
              status: 'suspended',
              next_billing_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Retry in 7 days
            })
            .eq('id', phoneNumber.id);

          if (suspendError) {
            console.error(`Error suspending phone number ${phoneNumber.phone_number}:`, suspendError);
            results.failed++;
            results.errors.push(`Failed to suspend ${phoneNumber.phone_number}`);
          } else {
            results.suspended++;
            console.log(`Suspended ${phoneNumber.phone_number} due to insufficient credits (${balance} < ${requiredCredits})`);
            
            // Send low balance notification
            await sendLowBalanceNotification(phoneNumber.tenant_id, phoneNumber.phone_number, balance, requiredCredits);
          }
          continue;
        }

        // Sufficient balance - deduct credits
        const { data: updateSuccess, error: creditError } = await (supabase as any)
          .rpc('update_credits', {
            tenant_id_param: phoneNumber.tenant_id,
            amount_param: -requiredCredits,
            transaction_type_param: 'phone_number_charge',
            description_param: `Monthly billing: ${phoneNumber.phone_number}`,
            reference_id_param: phoneNumber.id
          });

        if (creditError || !updateSuccess) {
          console.error(`Error deducting credits for ${phoneNumber.phone_number}:`, creditError);
          results.failed++;
          results.errors.push(`Credit deduction failed for ${phoneNumber.phone_number}`);
          continue;
        }

        // Update next billing date (30 days from now)
        const nextBillingDate = new Date();
        nextBillingDate.setDate(nextBillingDate.getDate() + 30);

        const { error: updateError } = await (supabase as any)
          .from('tenant_phone_numbers')
          .update({ 
            next_billing_date: nextBillingDate.toISOString(),
            status: 'active' // Ensure it's active after successful billing
          })
          .eq('id', phoneNumber.id);

        if (updateError) {
          console.error(`Error updating billing date for ${phoneNumber.phone_number}:`, updateError);
          results.failed++;
          results.errors.push(`Date update failed for ${phoneNumber.phone_number}`);
          continue;
        }

        results.processed++;
        console.log(`Successfully billed ${phoneNumber.phone_number}: ${requiredCredits} credits`);

      } catch (error) {
        console.error(`Unexpected error processing ${phoneNumber.phone_number}:`, error);
        results.failed++;
        results.errors.push(`Unexpected error for ${phoneNumber.phone_number}`);
      }
    }

    console.log('Monthly billing completed:', results);

    return NextResponse.json({
      message: 'Monthly billing completed',
      ...results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Fatal error in monthly billing:', error);
    return NextResponse.json({ 
      error: 'Monthly billing process failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function sendLowBalanceNotification(tenantId: string, phoneNumber: string, currentBalance: number, requiredCredits: number) {
  try {
    // Get tenant information for email
    const supabase = await createClient();
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single();

    if (error) {
      console.error('Error fetching tenant for notification:', error);
      return;
    }

    // Get admin/owner email for this tenant
    const { data: users, error: usersError } = await supabase
      .from('user_accounts')
      .select('email')
      .eq('tenant_id', tenantId)
      .limit(1);

    if (usersError || !users || users.length === 0) {
      console.error('Error fetching user email for notification:', usersError);
      return;
    }

    const adminEmail = users[0].email;

    // Send notification using the email API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/low-balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}` // Internal API auth
      },
      body: JSON.stringify({
        tenantId,
        tenantName: tenant.name,
        email: adminEmail,
        phoneNumber,
        currentBalance,
        requiredCredits
      })
    });

    if (!response.ok) {
      console.error('Failed to send low balance notification:', await response.text());
    } else {
      console.log(`Low balance notification sent for ${phoneNumber}`);
    }

  } catch (error) {
    console.error('Error sending low balance notification:', error);
  }
} 