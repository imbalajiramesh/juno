import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withTenant } from '@/lib/get-tenant';

export const POST = withTenant(async (tenantId: string, req: NextRequest) => {
  const supabase = await createClient();
  
  try {
    const { fields } = await req.json();

    if (!fields || !Array.isArray(fields)) {
      return NextResponse.json(
        { error: 'Invalid fields data' },
        { status: 400 }
      );
    }

    // Create custom fields for each selected field
    const customFieldPromises = fields.map(async (field: any) => {
      const customFieldData = {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        name: field.name,
        label: field.label,
        type: field.type,
        required: field.required || false,
        options: field.options ? JSON.stringify(field.options) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('custom_field_definitions')
        .insert(customFieldData)
        .select()
        .single();

      if (error) throw error;
      return data;
    });

    // Wait for all custom fields to be created
    const createdFields = await Promise.all(customFieldPromises);

    // Check if Vapi organization already exists, create only if needed
    let vapiOrgId = null;
    try {
      // First check if tenant already has a Vapi organization
      const { data: existingTenant } = await supabase
        .from('tenants')
        .select('vapi_org_id')
        .eq('id', tenantId)
        .single();

      if (existingTenant?.vapi_org_id) {
        // Use existing Vapi organization
        vapiOrgId = existingTenant.vapi_org_id;
        console.log('Using existing Vapi organization:', vapiOrgId);
      } else {
        // Create new Vapi organization only if one doesn't exist
        vapiOrgId = await createVapiOrganization(tenantId);
        console.log('Created new Vapi organization:', vapiOrgId);
      }
    } catch (vapiError) {
      console.warn('Vapi organization setup failed:', vapiError);
      // Continue setup even if Vapi org setup fails
    }

    // Mark organization setup as completed
    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        setup_completed: true,
        vapi_org_id: vapiOrgId,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenantId);

    if (updateError) throw updateError;

    return NextResponse.json({ 
      success: true, 
      customFields: createdFields,
      vapiOrgId: vapiOrgId,
      message: 'Organization setup completed successfully'
    });

  } catch (error) {
    console.error('Error finalizing organization setup:', error);
    return NextResponse.json(
      { error: 'Failed to finalize organization setup' },
      { status: 500 }
    );
  }
});

async function createVapiOrganization(tenantId: string): Promise<string | null> {
  // Check if Vapi credentials are configured
  const vapiToken = process.env.VAPI_API_KEY;
  if (!vapiToken) {
    throw new Error('Vapi API key not configured');
  }

  // Get tenant info for organization name
  const supabase = await createClient();
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('name, id')
    .eq('id', tenantId)
    .single();

  if (error || !tenant) {
    throw new Error('Could not fetch tenant information');
  }

  const orgPayload = {
    name: tenant.name || `Organization ${tenant.id.slice(0, 8)}`,
    hipaaEnabled: false, // Set based on your requirements
  };

  const response = await fetch('https://api.vapi.ai/org', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vapiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orgPayload),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Vapi API error: ${response.status} - ${errorData}`);
  }

  const result = await response.json();
  return result.id;
} 