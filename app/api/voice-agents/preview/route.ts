import { NextRequest, NextResponse } from 'next/server';
import { withTenant } from '@/lib/get-tenant';
import { createClient } from '@/utils/supabase/server';

interface VoicePreviewRequest {
  voice: string;
  text: string;
}

// Voice mapping for OpenAI voices
const voiceMapping: Record<string, string> = {
  'ash': 'ash',
  'coral': 'coral',
};

export const POST = withTenant(async (tenantId: string, req: NextRequest) => {
  try {
    const data: VoicePreviewRequest = await req.json();
    
    if (!data.voice || !data.text) {
      return NextResponse.json(
        { error: 'Missing required fields: voice, text' },
        { status: 400 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    try {
      // Map to OpenAI voice ID
      const openaiVoice = voiceMapping[data.voice] || data.voice;
      
      // Use OpenAI TTS API with latest gpt-4o-mini-tts model
      const openaiResponse = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini-tts',
          input: data.text,
          voice: openaiVoice,
          response_format: 'mp3',
        }),
      });

      if (openaiResponse.ok) {
        // Get the audio data as array buffer
        const audioBuffer = await openaiResponse.arrayBuffer();
        
        // Convert to base64 for client-side playback
        const base64Audio = Buffer.from(audioBuffer).toString('base64');
        const audioDataUrl = `data:audio/mp3;base64,${base64Audio}`;
        
        return NextResponse.json({
          success: true,
          audioUrl: audioDataUrl,
          voice: data.voice,
          method: 'openai-tts'
        });
      } else {
        const errorText = await openaiResponse.text();
        console.error('OpenAI TTS error:', errorText);
        return NextResponse.json(
          { error: 'Failed to generate voice preview with OpenAI TTS' },
          { status: 500 }
        );
      }

    } catch (openaiError) {
      console.error('OpenAI TTS error:', openaiError);
      return NextResponse.json(
        { error: 'Failed to connect to OpenAI TTS service' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in voice preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate voice preview' },
      { status: 500 }
    );
  }
});

function getVoiceHints(voiceId: string) {
  const voiceOptions = {
    'ash': { gender: 'male', keywords: ['ash', 'baritone', 'scratchy', 'upbeat'] },
    'coral': { gender: 'female', keywords: ['coral', 'soprano', 'clear', 'responsive'] },
  };

  return voiceOptions[voiceId as keyof typeof voiceOptions] || { 
    gender: 'neutral', 
    keywords: ['default'] 
  };
} 