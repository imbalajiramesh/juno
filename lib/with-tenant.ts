import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

type HandlerFunction = (tenantId: string) => Promise<NextResponse>;

export async function withTenant(
  request: NextRequest,
  handler: HandlerFunction
): Promise<NextResponse> {
  const supabase = await createClient();
  
  // Get the authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Find the tenant for this user (we use user.id as the org identifier now)
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('clerk_org_id', user.id)
    .single();

  if (error || !tenant) {
    return NextResponse.json(
      { error: 'Tenant not found' },
      { status: 404 }
    );
  }

  // Call the handler with the tenant ID
  return handler(tenant.id);
} 