import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  
  try {
    const body = await req.json();
    const { type, call, assistant } = body;

    console.log('Vapi webhook received:', { type, callId: call?.id });

    switch (type) {
      case 'conversation-started':
        await handleConversationStarted(call, assistant);
        break;
      
      case 'conversation-ended':
        await handleConversationEnded(call, assistant);
        break;
      
      case 'transcript':
        await handleTranscript(call, body);
        break;
      
      default:
        console.log('Unhandled webhook type:', type);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vapi webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleConversationStarted(call: any, assistant: any) {
  const supabase = await createClient();
  
  try {
    // Find the voice agent by vapi_agent_id
    const { data: agent } = await supabase
      .from('voice_agents')
      .select('id, tenant_id, name')
      .eq('vapi_agent_id', assistant.id)
      .single();

    if (!agent) return;

    // Create a call log entry
    await supabase
      .from('alex_call_logs')
      .insert({
        id: crypto.randomUUID(),
        tenant_id: agent.tenant_id,
        customer_id: call.customer?.id || null,
        voice_agent_id: agent.id,
        call_recording_url: null,
        call_transcript: null,
        call_summary: `Call started with ${agent.name}`,
        duration_minutes: 0,
        vapi_call_id: call.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    console.log('Conversation started logged for agent:', agent.name);
  } catch (error) {
    console.error('Error handling conversation started:', error);
  }
}

async function handleConversationEnded(call: any, assistant: any) {
  const supabase = await createClient();
  
  try {
    // Find the voice agent
    const { data: agent } = await supabase
      .from('voice_agents')
      .select('tenant_id, name')
      .eq('vapi_agent_id', assistant.id)
      .single();

    if (!agent) return;

    // Calculate duration in minutes (minimum 1 minute for billing)
    const duration = call.endedAt && call.startedAt 
      ? Math.max(1, Math.ceil((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 60000))
      : 1;

    // Update the call log with final details
    await supabase
      .from('alex_call_logs')
      .update({
        call_recording_url: call.recordingUrl || null,
        call_summary: call.summary || 'Call completed',
        duration_minutes: duration,
        updated_at: new Date().toISOString(),
      })
      .eq('vapi_call_id', call.id)
      .eq('tenant_id', agent.tenant_id);

    // Deduct credits for the call (15 credits per minute)
    const creditsToDeduct = duration * 15;
    await supabase
      .rpc('update_credits', {
        tenant_id_param: agent.tenant_id,
        amount_param: -creditsToDeduct,
        transaction_type_param: 'call_charge',
        description_param: `Voice call with ${agent.name} - ${duration} minute(s)`,
        reference_id_param: call.id
      });

    console.log('Conversation ended logged, duration:', duration, 'minutes, credits deducted:', creditsToDeduct);
  } catch (error) {
    console.error('Error handling conversation ended:', error);
  }
}

async function handleTranscript(call: any, webhookBody: any) {
  const supabase = await createClient();
  
  try {
    const transcript = webhookBody.transcript || webhookBody.message;
    if (!transcript) return;

    // Find the call log and update transcript
    const { data: agent } = await supabase
      .from('voice_agents')
      .select('tenant_id')
      .eq('vapi_agent_id', webhookBody.assistant.id)
      .single();

    if (!agent) return;

    // Update or append to transcript
    const { data: existingCall } = await supabase
      .from('alex_call_logs')
      .select('call_transcript')
      .eq('vapi_call_id', call.id)
      .eq('tenant_id', agent.tenant_id)
      .single();

    const newTranscript = existingCall?.call_transcript 
      ? existingCall.call_transcript + '\n' + transcript
      : transcript;

    await supabase
      .from('alex_call_logs')
      .update({
        call_transcript: newTranscript,
        updated_at: new Date().toISOString(),
      })
      .eq('vapi_call_id', call.id)
      .eq('tenant_id', agent.tenant_id);

  } catch (error) {
    console.error('Error handling transcript:', error);
  }
} 