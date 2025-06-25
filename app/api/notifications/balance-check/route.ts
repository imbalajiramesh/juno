import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCurrentTenant } from '@/lib/get-tenant';

export async function GET() {
  try {
    const supabase = await createClient();
    const { tenant } = await getCurrentTenant();
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get current balance
    const { data: currentBalance, error: balanceError } = await supabase
      .rpc('get_tenant_credit_balance', { tenant_id_param: tenant.id });

    if (balanceError) {
      console.error('Error fetching balance:', balanceError);
      return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
    }

    const balance = currentBalance || 0;

    // Get notification preferences
    const { data: preferences, error: prefError } = await supabase
      .from('tenant_notification_preferences')
      .select('*')
      .eq('tenant_id', tenant.id)
      .single();

    if (prefError && prefError.code !== 'PGRST116') {
      console.error('Error fetching notification preferences:', prefError);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    const threshold = preferences?.low_balance_threshold || 100;
    const emailNotifications = preferences?.email_notifications !== false;

    // Calculate estimated costs for upcoming operations
    const { data: phoneNumbers } = await supabase
      .from('tenant_phone_numbers')
      .select('monthly_cost_credits')
      .eq('tenant_id', tenant.id)
      .eq('status', 'active');

         const upcomingPhoneCosts = phoneNumbers?.reduce((sum: number, phone: any) => 
       sum + (phone.monthly_cost_credits || 0), 0) || 0;

    // Determine alert level
    let alertLevel = 'good';
    let message = 'Your credit balance is healthy.';
    let recommendations = [];

    if (balance < threshold) {
      alertLevel = 'critical';
      message = `Your balance (${balance} credits) is below the alert threshold (${threshold} credits).`;
      recommendations.push('Add credits immediately to avoid service interruptions');
      recommendations.push('Consider purchasing a larger credit package for better rates');
    } else if (balance < upcomingPhoneCosts) {
      alertLevel = 'warning';
      message = `Your balance (${balance} credits) may not cover upcoming phone number charges (${upcomingPhoneCosts} credits).`;
      recommendations.push('Add credits to ensure uninterrupted phone service');
    } else if (balance < threshold * 2) {
      alertLevel = 'low';
      message = `Your balance (${balance} credits) is getting low.`;
      recommendations.push('Consider adding credits soon');
    }

    const response = {
      balance,
      threshold,
      alertLevel,
      message,
      recommendations,
      upcomingCosts: {
        phoneNumbers: upcomingPhoneCosts
      },
      notifications: {
        emailEnabled: emailNotifications,
        lastNotificationSent: null // You can track this if needed
      }
    };

    // If critical and notifications enabled, trigger notification
    if (alertLevel === 'critical' && emailNotifications) {
      // Get admin email
      const { data: users } = await supabase
        .from('user_accounts')
        .select('email')
        .eq('tenant_id', tenant.id)
        .limit(1);

      if (users && users.length > 0) {
        // Trigger low balance notification
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/general-low-balance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CRON_SECRET}`
          },
          body: JSON.stringify({
            tenantId: tenant.id,
            tenantName: tenant.name,
            email: preferences?.notification_email || users[0].email,
            currentBalance: balance,
            threshold,
            upcomingCosts: upcomingPhoneCosts
          })
        }).catch(error => {
          console.error('Failed to send low balance notification:', error);
        });
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in balance check:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { threshold, emailNotifications, notificationEmail } = await request.json();
    
    const supabase = await createClient();
    const { tenant } = await getCurrentTenant();
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Update notification preferences
    const { error } = await supabase
      .from('tenant_notification_preferences')
      .upsert({
        tenant_id: tenant.id,
        low_balance_threshold: threshold || 100,
        email_notifications: emailNotifications !== false,
        notification_email: notificationEmail || null
      });

    if (error) {
      console.error('Error updating notification preferences:', error);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Notification preferences updated successfully'
    });

  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 