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

    // Fetch documents for this tenant
    const { data: documents, error: documentsError } = await (supabase as any)
      .from('organization_documents')
      .select('*')
      .eq('tenant_id', userAccount.tenant_id)
      .order('upload_date', { ascending: false });

    if (documentsError) {
      console.error('Error fetching documents:', documentsError);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    return NextResponse.json(documents || []);

  } catch (error) {
    console.error('Error in documents API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 