import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get the current user and verify super admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify super admin role
    const { data: userAccount, error: userError } = await supabase
      .from('user_accounts')
      .select(`
        id,
        role:roles(
          role_name
        )
      `)
      .eq('auth_id', user.id)
      .single();

    if (userError || !userAccount || userAccount.role?.role_name !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const tenantId = params.id;

    // Fetch actual documents for this tenant
    const { data: documents, error: documentsError } = await (supabase as any)
      .from('organization_documents')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('upload_date', { ascending: false });
    
    if (documentsError) {
      console.error('Error fetching documents:', documentsError);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }
    
    return NextResponse.json(documents || []);

  } catch (error) {
    console.error('Super admin documents error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 