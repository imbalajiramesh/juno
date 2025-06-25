import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCurrentTenant } from '@/lib/get-tenant';

export async function GET() {
  try {
    const supabase = await createClient();
    const { tenant } = await getCurrentTenant();
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get current month's SMS stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    // Get total SMS sent this month
    const { data: sentStats, error: sentError } = await supabase
      .from('sms_logs')
      .select('credits_charged')
      .eq('tenant_id', tenant.id)
      .eq('direction', 'outbound')
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString());

    if (sentError) {
      console.error('Error fetching sent SMS stats:', sentError);
      return NextResponse.json({ error: 'Failed to fetch sent SMS stats' }, { status: 500 });
    }

    // Get total SMS received this month
    const { data: receivedStats, error: receivedError } = await supabase
      .from('sms_logs')
      .select('credits_charged')
      .eq('tenant_id', tenant.id)
      .eq('direction', 'inbound')
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString());

    if (receivedError) {
      console.error('Error fetching received SMS stats:', receivedError);
      return NextResponse.json({ error: 'Failed to fetch received SMS stats' }, { status: 500 });
    }

    // Calculate totals
    const totalSent = sentStats?.length || 0;
    const totalReceived = receivedStats?.length || 0;
         const creditsSpentSent = sentStats?.reduce((sum: number, msg: any) => sum + (msg.credits_charged || 0), 0) || 0;
     const creditsSpentReceived = receivedStats?.reduce((sum: number, msg: any) => sum + (msg.credits_charged || 0), 0) || 0;

    // Get recent SMS (last 10)
    const { data: recentSMS, error: recentError } = await supabase
      .from('sms_logs')
      .select('id, from_number, to_number, message_body, direction, status, credits_charged, created_at')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('Error fetching recent SMS:', recentError);
      return NextResponse.json({ error: 'Failed to fetch recent SMS' }, { status: 500 });
    }

    // Get delivery success rate for sent messages
    const { data: deliveryStats, error: deliveryError } = await supabase
      .from('sms_logs')
      .select('status')
      .eq('tenant_id', tenant.id)
      .eq('direction', 'outbound')
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString());

    let successRate = 0;
    if (deliveryStats && deliveryStats.length > 0) {
             const successfulDeliveries = deliveryStats.filter((msg: any) => 
         msg.status === 'delivered' || msg.status === 'sent'
       ).length;
      successRate = Math.round((successfulDeliveries / deliveryStats.length) * 100);
    }

    return NextResponse.json({
      currentMonth: {
        sent: totalSent,
        received: totalReceived,
        creditsSpent: creditsSpentSent + creditsSpentReceived,
        successRate: successRate
      },
      breakdown: {
        sentCredits: creditsSpentSent,
        receivedCredits: creditsSpentReceived
      },
      recentMessages: recentSMS || [],
      period: {
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString()
      }
    });

  } catch (error) {
    console.error('Error in SMS stats:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 