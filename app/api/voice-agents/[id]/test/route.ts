import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withTenant } from '@/lib/get-tenant';

interface WebTestRequest {
  testType: 'voice' | 'script' | 'conversation';
  customText?: string;
}

export const POST = withTenant(async (tenantId: string, req: NextRequest, { params }: { params: { id: string } }) => {
  const supabase = await createClient();
  
  try {
    const agentId = params.id;
    const data: WebTestRequest = await req.json();

    // Get the voice agent
    const { data: agent, error: fetchError } = await supabase
      .from('voice_agents')
      .select('*')
      .eq('id', agentId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !agent) {
      return NextResponse.json(
        { error: 'Voice agent not found' },
        { status: 404 }
      );
    }

    // Log the test activity (free, no credits charged)
    await supabase
      .from('alex_call_logs')
      .insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        customer_id: null,
        voice_agent_id: agent.id,
        call_recording_url: null,
        call_transcript: `Web test session - ${data.testType}`,
        call_summary: `Free web test of voice agent: ${agent.name}`,
        duration_minutes: 0, // Free test
        vapi_call_id: null,
        twilio_call_sid: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    // Return test configuration based on type
    switch (data.testType) {
      case 'voice':
        return NextResponse.json({
          success: true,
          testType: 'voice',
          agent: {
            id: agent.id,
            name: agent.name,
            voice: agent.voice,
            script: agent.script
          },
          testInstructions: {
            method: 'browser_synthesis',
            text: data.customText || agent.script,
            voiceHints: getVoiceConfiguration(agent.voice),
            duration: 'unlimited',
            cost: 0
          }
        });

      case 'script':
        return NextResponse.json({
          success: true,
          testType: 'script',
          agent: {
            id: agent.id,
            name: agent.name,
            script: agent.script
          },
          testInstructions: {
            method: 'text_display',
            scriptAnalysis: analyzeScript(agent.script),
            suggestions: getScriptSuggestions(agent.script),
            cost: 0
          }
        });

      case 'conversation':
        return NextResponse.json({
          success: true,
          testType: 'conversation',
          agent: {
            id: agent.id,
            name: agent.name,
            voice: agent.voice,
            script: agent.script
          },
          testInstructions: {
            method: 'simulated_conversation',
            flow: generateConversationFlow(agent.script),
            estimatedDuration: '2-3 minutes',
            cost: 0,
            note: 'This is a free simulation. Real calls cost 25 credits/minute.'
          }
        });

      default:
        return NextResponse.json(
          { error: 'Invalid test type' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in voice agent test:', error);
    return NextResponse.json(
      { error: 'Failed to start test' },
      { status: 500 }
    );
  }
});

function getVoiceConfiguration(voiceId: string) {
  const voiceConfigs = {
    'ash': { rate: 0.9, pitch: 1.0, emphasis: 'clear' },
    'coral': { rate: 0.95, pitch: 1.1, emphasis: 'warm' },
  };

  return voiceConfigs[voiceId as keyof typeof voiceConfigs] || {
    rate: 0.9,
    pitch: 1.0,
    emphasis: 'neutral'
  };
}

function analyzeScript(script: string) {
  return {
    wordCount: script.split(' ').length,
    estimatedDuration: Math.ceil(script.split(' ').length / 150) + ' minutes',
    variables: (script.match(/\[([^\]]+)\]/g) || []),
    tone: detectTone(script),
    readabilityScore: calculateReadability(script)
  };
}

function detectTone(script: string) {
  const lowerScript = script.toLowerCase();
  
  if (lowerScript.includes('thank you') || lowerScript.includes('appreciate')) {
    return 'grateful';
  } else if (lowerScript.includes('exciting') || lowerScript.includes('amazing')) {
    return 'enthusiastic';
  } else if (lowerScript.includes('professional') || lowerScript.includes('service')) {
    return 'professional';
  } else {
    return 'neutral';
  }
}

function calculateReadability(script: string) {
  // Simple readability score based on sentence length
  const sentences = script.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgWordsPerSentence = script.split(' ').length / sentences.length;
  
  if (avgWordsPerSentence < 15) return 'easy';
  if (avgWordsPerSentence < 25) return 'moderate';
  return 'complex';
}

function getScriptSuggestions(script: string) {
  const suggestions = [];
  
  if (script.length > 500) {
    suggestions.push('Consider shortening the script for better engagement');
  }
  
  if (!script.includes('[Customer Name]')) {
    suggestions.push('Add [Customer Name] variable for personalization');
  }
  
  if (!script.includes('?')) {
    suggestions.push('Include questions to make the conversation more interactive');
  }
  
  return suggestions;
}

function generateConversationFlow(script: string) {
  return [
    {
      step: 1,
      speaker: 'agent',
      text: script.split('.')[0] + '.',
      duration: '5-10 seconds'
    },
    {
      step: 2,
      speaker: 'customer',
      text: '[Customer responds - simulated]',
      duration: '3-5 seconds'
    },
    {
      step: 3,
      speaker: 'agent',
      text: 'Thank you for your time. Is there anything specific you\'d like to know?',
      duration: '5-8 seconds'
    },
    {
      step: 4,
      speaker: 'customer',
      text: '[Customer asks questions - simulated]',
      duration: '5-10 seconds'
    },
    {
      step: 5,
      speaker: 'agent',
      text: 'I\'d be happy to help with that. Let me provide you with the information you need.',
      duration: '8-12 seconds'
    }
  ];
} 