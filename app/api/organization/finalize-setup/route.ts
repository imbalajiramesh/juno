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

    // Mark organization setup as completed
    // External accounts will be created after document approval
    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        setup_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenantId);

    if (updateError) throw updateError;

    return NextResponse.json({ 
      success: true, 
      customFields: createdFields,
      message: 'Organization setup completed. Please upload verification documents to activate communication features.'
    });

  } catch (error) {
    console.error('Error finalizing organization setup:', error);
    return NextResponse.json(
      { error: 'Failed to finalize organization setup' },
      { status: 500 }
    );
  }
});

 