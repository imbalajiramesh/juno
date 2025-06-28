import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  
  try {
    const body = await request.json();
    const { organization_id, cancel_campaigns = true, release_numbers = false, reason } = body;

    if (!organization_id) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    // Get organization details with related data
    const { data: org, error: orgError } = await supabase
      .from('tenants')
      .select(`
        *,
        voice_agents(id, name, status, monthly_cost),
        tenant_phone_numbers(id, phone_number, status)
      `)
      .eq('id', organization_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    let totalMonthlySavings = 0;
    let campaignsCancelled = 0;
    let numbersProcessed = 0;

    // 1. Cancel all active campaigns if requested
    if (cancel_campaigns && org.voice_agents) {
      for (const campaign of org.voice_agents) {
        if (campaign.status === 'active') {
          // Update campaign status and stop billing
          await supabase
            .from('voice_agents')
            .update({
              status: 'deleted',
              deleted_at: new Date().toISOString(),
              monthly_cost: 0
            })
            .eq('id', campaign.id);

          totalMonthlySavings += campaign.monthly_cost || 0;
          campaignsCancelled++;
        }
      }
    }

    // 2. Handle phone numbers
    if (org.tenant_phone_numbers) {
      for (const number of org.tenant_phone_numbers) {
        if (release_numbers) {
          // Release numbers back to inventory
          await supabase
            .from('tenant_phone_numbers')
            .update({
              tenant_id: null,
              status: 'available',
              updated_at: new Date().toISOString()
            })
            .eq('id', number.id);
        } else {
          // Suspend numbers but keep for 30 days
          await supabase
            .from('tenant_phone_numbers')
            .update({
              status: 'suspended',
              updated_at: new Date().toISOString()
            })
            .eq('id', number.id);
        }
        numbersProcessed++;
      }
    }

    // 3. Create billing record for stopped charges
    if (totalMonthlySavings > 0) {
      await supabase.from('credit_transactions').insert({
        tenant_id: organization_id,
        type: 'org_deletion_savings',
        amount: 0,
        description: `Organization deleted - stopped ${totalMonthlySavings} credits/month in recurring charges`,
        created_by: 'system'
      });
    }

    // 4. Mark organization as deleted (soft delete)
    await supabase
      .from('tenants')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString()
      })
      .eq('id', organization_id);

    return NextResponse.json({
      success: true,
      message: 'Organization deleted successfully',
      summary: {
        campaigns_cancelled: campaignsCancelled,
        phone_numbers_processed: numbersProcessed,
        monthly_savings: totalMonthlySavings,
        numbers_released: release_numbers
      }
    });

  } catch (error) {
    console.error('Organization deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete organization' },
      { status: 500 }
    );
  }
} 