import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withTenant } from '@/lib/get-tenant';

interface CallRequest {
  customerPhone: string;
  customerId?: string;
}

export const POST = withTenant(async (tenantId: string, req: NextRequest, { params }: { params: { id: string } }) => {
  const supabase = await createClient();
  try {
    const agentId = params.id;
    const { customerPhone, customerId }: CallRequest = await req.json();

    if (!customerPhone) {
      return NextResponse.json(
        { error: 'Customer phone number is required' },
        { status: 400 }
      );
    }

    // Get the voice agent with its assigned phone number
    const { data: agent, error: agentError } = await supabase
      .from('voice_agents')
      .select(`
        *,
        assigned_phone:tenant_phone_numbers!phone_number_id (
          id,
          vapi_phone_number_id,
          phone_number,
          status
        )
      `)
      .eq('id', agentId)
      .eq('tenant_id', tenantId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Voice agent not found' },
        { status: 404 }
      );
    }

    // Get tenant's Vapi organization ID
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('vapi_org_id')
      .eq('id', tenantId)
      .single();

    if (tenantError) {
      console.warn('Could not fetch tenant Vapi org:', tenantError);
    }

    if (!agent.vapi_agent_id) {
      return NextResponse.json(
        { error: 'Voice agent not properly configured with external service' },
        { status: 400 }
      );
    }

    // Try to use the agent's assigned phone number first, fallback to any available
    let phoneNumber = null;
    let phoneError = null;

    if (agent.assigned_phone && agent.assigned_phone.status === 'active' && agent.assigned_phone.vapi_phone_number_id) {
      phoneNumber = agent.assigned_phone;
    } else {
      // Fallback to any available phone number
      const { data: fallbackPhone, error: fallbackError } = await supabase
        .from('tenant_phone_numbers')
        .select('id, vapi_phone_number_id, phone_number, status')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .not('vapi_phone_number_id', 'is', null)
        .limit(1)
        .single();
      
      phoneNumber = fallbackPhone;
      phoneError = fallbackError;
    }

    if (phoneError || !phoneNumber?.vapi_phone_number_id) {
      return NextResponse.json(
        { 
          error: 'No configured phone number found. Please purchase and configure a phone number for voice calls.',
          action: 'configure_phone_number'
        },
        { status: 400 }
      );
    }

    // Get customer details if customerId provided
    let customerData = null;
    if (customerId) {
      const { data: customer } = await supabase
        .from('customers')
        .select('first_name, last_name, email')
        .eq('id', customerId)
        .eq('tenant_id', tenantId)
        .single();
      
      customerData = customer;
    }

    // Initiate call through Vapi
    const callResult = await initiateVapiCall(
      agent, 
      customerPhone, 
      customerData, 
      tenant?.vapi_org_id,
      phoneNumber.vapi_phone_number_id
    );

    return NextResponse.json({
      success: true,
      callId: callResult.id,
      fromNumber: phoneNumber.phone_number,
      message: 'Call initiated successfully'
    });

  } catch (error) {
    console.error('Error initiating call:', error);
    return NextResponse.json(
      { error: 'Failed to initiate call' },
      { status: 500 }
    );
  }
});

async function initiateVapiCall(
  agent: any, 
  phoneNumber: string, 
  customerData: any, 
  vapiOrgId?: string,
  vapiPhoneNumberId?: string
) {
  const vapiToken = process.env.VAPI_API_KEY;
  if (!vapiToken) {
    throw new Error('Vapi API key not configured');
  }

  // Use tenant's phone number if available, otherwise fall back to environment variable
  const phoneNumberId = vapiPhoneNumberId || process.env.VAPI_PHONE_NUMBER_ID;
  
  if (!phoneNumberId) {
    throw new Error('No phone number configured for making calls');
  }

  // Prepare the call payload
  const callPayload = {
    assistantId: agent.vapi_agent_id,
    customer: {
      number: phoneNumber,
      ...(customerData && {
        name: `${customerData.first_name} ${customerData.last_name}`.trim(),
        email: customerData.email,
      }),
    },
    phoneNumberId: phoneNumberId, // Use tenant-specific phone number
  };

  const response = await fetch('https://api.vapi.ai/call', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vapiToken}`,
      'Content-Type': 'application/json',
      ...(vapiOrgId && { 'X-Vapi-Org-Id': vapiOrgId }), // Include org ID in headers
    },
    body: JSON.stringify(callPayload),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Vapi API error: ${response.status} - ${errorData}`);
  }

  return await response.json();
} 