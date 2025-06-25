import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withTenant } from '@/lib/get-tenant';

export const GET = withTenant(async (tenantId: string) => {
  const supabase = await createClient();
  
  try {
    console.log('Checking setup for tenant:', tenantId);
    
    // Check if organization has completed setup
    const { data: organization, error } = await supabase
      .from('tenants')
      .select('setup_completed, industry, name')
      .eq('id', tenantId)
      .single();

    console.log('Organization data:', organization);
    console.log('Organization error:', error);

    if (error) {
      // If the column doesn't exist, try to add it
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('Setup columns missing, treating as setup needed');
        return NextResponse.json({ 
          setupCompleted: false,
          hasBasicInfo: false,
          needsSetup: true
        });
      }
      throw error;
    }

    const isSetupCompleted = organization?.setup_completed || false;
    const hasBasicInfo = !!(organization?.industry && organization?.name);

    console.log('Setup status:', { isSetupCompleted, hasBasicInfo });

    return NextResponse.json({ 
      setupCompleted: isSetupCompleted,
      hasBasicInfo: hasBasicInfo,
      needsSetup: !isSetupCompleted
    });

  } catch (error) {
    console.error('Error checking organization setup:', error);
    return NextResponse.json(
      { error: 'Failed to check organization setup', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}); 