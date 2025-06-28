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
        role:roles(role_name)
      `)
      .eq('auth_id', user.id)
      .single();

    if (userError || !userAccount || userAccount.role?.role_name !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const documentId = params.id;

    // Get document from database
    const { data: document, error: docError } = await (supabase as any)
      .from('organization_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Get file from Supabase Storage
    const { data: fileData, error: storageError } = await supabase.storage
      .from('documents')
      .download(document.file_path);

    if (storageError || !fileData) {
      console.error('Storage error:', storageError);
      return NextResponse.json({ error: 'File not found in storage' }, { status: 404 });
    }

    // Convert blob to buffer
    const buffer = await fileData.arrayBuffer();
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': document.mime_type,
        'Content-Disposition': 'inline',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Document view error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 