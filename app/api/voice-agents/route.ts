import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withTenant } from '@/lib/get-tenant';

// Voice agent interface
interface VoiceAgentData {
  name: string;
  description?: string;
  voice: string;
  script: string;
  costPerMinute: number;
  phoneNumberId?: string;
}

// OpenAI voice mapping
const voiceMapping: Record<string, string> = {
  'ash': 'ash',
  'coral': 'coral',
};

export const GET = withTenant(async (tenantId: string) => {
  const supabase = await createClient();
  try {
    const { data: agents, error } = await supabase
      .from('voice_agents')
      .select(`
        *,
        assigned_phone:tenant_phone_numbers!phone_number_id (
          id,
          phone_number,
          status
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(agents || []);
  } catch (error) {
    console.error('Error fetching voice agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voice agents' },
      { status: 500 }
    );
  }
});

export const POST = withTenant(async (tenantId: string, req: NextRequest) => {
  const supabase = await createClient();
  try {
    const data: VoiceAgentData = await req.json();
    
    // Validate required fields
    if (!data.name || !data.voice || !data.script) {
      return NextResponse.json(
        { error: 'Missing required fields: name, voice, script' },
        { status: 400 }
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

    // Create agent in Vapi (if credentials are available)
    let vapiAgentId = null;
    try {
      vapiAgentId = await createVapiAgent(data, tenant?.vapi_org_id);
    } catch (vapiError) {
      console.warn('Vapi integration not configured or failed:', vapiError);
      // Continue without Vapi integration
    }

    // Save to database
    const agentData = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      name: data.name,
      description: data.description || null,
      voice: data.voice,
      script: data.script,
      cost_per_minute: data.costPerMinute,
      phone_number_id: data.phoneNumberId || null,
      status: 'active',
      vapi_agent_id: vapiAgentId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newAgent, error } = await supabase
      .from('voice_agents')
      .insert(agentData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(newAgent);
  } catch (error) {
    console.error('Error creating voice agent:', error);
    return NextResponse.json(
      { error: 'Failed to create voice agent' },
      { status: 500 }
    );
  }
});

async function createVapiAgent(data: VoiceAgentData, vapiOrgId?: string): Promise<string | null> {
  // Check if Vapi credentials are configured
  const vapiToken = process.env.VAPI_API_KEY;
  if (!vapiToken) {
    throw new Error('Vapi API key not configured');
  }

  const vapiVoice = voiceMapping[data.voice] || data.voice;

  const vapiPayload = {
    name: data.name,
    // GPT-4o Mini Realtime model for conversation
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini-realtime-preview-2024-12-17',
      messages: [
        {
          role: 'system',
          content: `You are a helpful AI assistant for customer calls. ${data.script}`,
        },
      ],
    },
    // Transcriber configuration
    transcriber: {
      provider: 'openai',
      model: 'whisper-1',
    },
    // Voice configuration with explicit TTS model and instructions
    voice: {
      provider: 'openai',
      voiceId: vapiVoice, // 'ash' or 'coral' - latest OpenAI Realtime voices
      model: 'gpt-4o-mini-tts', // Explicit TTS model
      instructions: 'Voice Affect: Professional and confident; maintain a warm yet authoritative tone. Tone: Positive and helpful, but not overly enthusiastic or excited. Pacing: Steady and clear, speak at a moderate pace that conveys competence. Emotion: Friendly and approachable while remaining professional. Pronunciation: Clear articulation with slight emphasis on key points for clarity.',
    },
    firstMessage: data.script.split('.')[0] + '.',
    serverUrl: process.env.NEXT_PUBLIC_APP_URL + '/api/webhooks/vapi',
    clientMessages: ['conversation-started', 'conversation-ended'],
    ...(vapiOrgId && { orgId: vapiOrgId }), // Add org ID if available
  };

  const response = await fetch('https://api.vapi.ai/assistant', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vapiToken}`,
      'Content-Type': 'application/json',
      ...(vapiOrgId && { 'X-Vapi-Org-Id': vapiOrgId }), // Include org ID in headers
    },
    body: JSON.stringify(vapiPayload),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Vapi API error: ${response.status} - ${errorData}`);
  }

  const result = await response.json();
  return result.id;
} 