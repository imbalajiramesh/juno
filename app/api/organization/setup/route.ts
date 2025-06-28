import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCurrentTenant } from '@/lib/get-tenant';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenant } = await getCurrentTenant();
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const { name, industry, description, size, location } = await req.json();

    // Validate required fields
    if (!name || !industry) {
      return NextResponse.json({ error: 'Organization name and industry are required' }, { status: 400 });
    }

    // Update tenant with setup information only
    // External accounts (VAPI, Twilio, Resend) will be created after document approval
    const { data: updatedTenant, error: updateError } = await supabase
      .from('tenants')
      .update({
        name,
        industry,
        description,
        size,
        location,
        setup_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenant.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating tenant:', updateError);
      return NextResponse.json({ error: 'Failed to complete setup' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      tenant: updatedTenant,
      message: 'Organization setup completed. Please upload your verification documents to activate communication features.'
    });
  } catch (error) {
    console.error('Error in organization setup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 