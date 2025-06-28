import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Find the tenant for this user
    const { data: userAccount, error: userAccountError } = await supabase
      .from('user_accounts')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (userAccountError || !userAccount) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      );
    }

    const tenantId = userAccount.tenant_id;

    // Get organization approval status
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (tenantError) {
      console.error('Error fetching tenant:', tenantError);
      return NextResponse.json({ error: 'Failed to fetch organization status' }, { status: 500 });
    }

    // Define required document types (matching frontend DOCUMENT_TYPES)
    const requiredDocTypes = [
      'business_registration',
      'tax_id',
      'address_proof',
      'privacy_policy',
      'terms_of_service',
      'message_templates',
      'opt_in_flow'
    ];

    // Get uploaded document types for this tenant
    const { data: uploadedDocs, error: docsError } = await (supabase as any)
      .from('organization_documents')
      .select('document_type')
      .eq('tenant_id', tenantId);

    if (docsError) {
      console.error('Error fetching documents:', docsError);
      // Don't fail the whole request for document errors
    }

    // Calculate missing document types (pending = required but not uploaded)
    const uploadedTypes = new Set((uploadedDocs || []).map((doc: any) => doc.document_type));
    const missingTypes = requiredDocTypes.filter(type => !uploadedTypes.has(type));
    const totalPending = missingTypes.length;

    // Extract approval status fields (using any to access new columns)
    const tenantData = tenant as any;

    return NextResponse.json({
      approval_status: tenantData.approval_status || 'pending',
      rejection_reason: tenantData.rejection_reason,
      additional_info_requested: tenantData.additional_info_requested,
      pending_documents: totalPending,
    });

  } catch (error) {
    console.error('Error in organization status API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 