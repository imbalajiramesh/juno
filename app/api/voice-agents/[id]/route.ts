import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withTenant } from '@/lib/get-tenant';

export const DELETE = withTenant(async (tenantId: string, req: NextRequest, { params }: { params: { id: string } }) => {
  const supabase = await createClient();
  try {
    const agentId = params.id;

    // Get the agent first to check if it has a Vapi ID
    const { data: agent, error: fetchError } = await supabase
      .from('voice_agents')
      .select('vapi_agent_id')
      .eq('id', agentId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError) throw fetchError;

    // Get tenant's Vapi organization ID
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('vapi_org_id')
      .eq('id', tenantId)
      .single();

    if (tenantError) {
      console.warn('Could not fetch tenant Vapi org:', tenantError);
    }

    // Delete from Vapi if it exists
    if (agent?.vapi_agent_id) {
      try {
        await deleteVapiAgent(agent.vapi_agent_id, tenant?.vapi_org_id);
      } catch (vapiError) {
        console.warn('Failed to delete from Vapi:', vapiError);
        // Continue with database deletion even if Vapi deletion fails
      }
    }

    // Delete from database
    const { error } = await supabase
      .from('voice_agents')
      .delete()
      .eq('id', agentId)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting voice agent:', error);
    return NextResponse.json(
      { error: 'Failed to delete voice agent' },
      { status: 500 }
    );
  }
});

async function deleteVapiAgent(vapiAgentId: string, vapiOrgId?: string): Promise<void> {
  const vapiToken = process.env.VAPI_API_KEY;
  if (!vapiToken) {
    throw new Error('Vapi API key not configured');
  }

  const response = await fetch(`https://api.vapi.ai/assistant/${vapiAgentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${vapiToken}`,
      ...(vapiOrgId && { 'X-Vapi-Org-Id': vapiOrgId }), // Include org ID in headers
    },
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Vapi API error: ${response.status} - ${errorData}`);
  }
} 