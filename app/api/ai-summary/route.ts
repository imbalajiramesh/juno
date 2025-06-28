import { NextRequest, NextResponse } from 'next/server';

interface AISummaryRequest {
  interaction_type: 'call' | 'email' | 'sms';
  content: string;
  customer_context?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { interaction_type, content, customer_context }: AISummaryRequest = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      // Fallback to keyword-based system if no OpenAI key
      return getKeywordBasedSummary(interaction_type, content);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Cheapest model - perfect for summaries
        messages: [
          {
            role: 'system',
            content: `You are a CRM assistant. Create a concise 1-2 line summary and 1 line next steps for customer interactions.

Format your response as JSON:
{
  "ai_summary": "1-2 line summary of what happened",
  "ai_next_steps": "1 line specific next action",
  "sentiment": "positive|neutral|negative",
  "follow_up_required": true/false
}

Keep summaries actionable and business-focused. Focus on customer intent, decisions, and outcomes.`
          },
          {
            role: 'user',
            content: `Interaction Type: ${interaction_type}
${customer_context ? `Customer: ${customer_context}` : ''}
Content: ${content}`
          }
        ],
        max_tokens: 150, // Keep it short and cheap
        temperature: 0.3, // Lower temperature for consistent, factual summaries
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    try {
      const parsedResponse = JSON.parse(aiResponse);
      return NextResponse.json({
        success: true,
        ...parsedResponse,
        cost_estimate: '$0.0001', // Approximately for gpt-4o-mini
        provider: 'openai-gpt4o-mini'
      });
    } catch (parseError) {
      // If JSON parsing fails, fall back to keyword system
      console.warn('OpenAI response parsing failed, using keyword fallback');
      return getKeywordBasedSummary(interaction_type, content);
    }

  } catch (error) {
    console.error('AI Summary API error:', error);
    // Always fall back to keyword system if OpenAI fails
    return getKeywordBasedSummary(interaction_type, content);
  }
}

// Fallback keyword-based system (same logic as SQL function)
function getKeywordBasedSummary(interaction_type: string, content: string) {
  let ai_summary = '';
  let ai_next_steps = '';
  let sentiment = 'neutral';
  let follow_up_required = false;

  if (interaction_type === 'call') {
    if (/\b(interested|qualified|ready|purchase|buy|sign up)\b/i.test(content)) {
      ai_summary = 'Customer expressed strong interest and appears ready to move forward with purchase.';
      ai_next_steps = 'Send proposal and schedule follow-up call within 24 hours.';
      sentiment = 'positive';
      follow_up_required = true;
    } else if (/\b(not interested|too expensive|already have|no thanks)\b/i.test(content)) {
      ai_summary = 'Customer declined offer due to pricing/existing solution concerns.';
      ai_next_steps = 'Add to nurture campaign for future follow-up in 3 months.';
      sentiment = 'negative';
    } else if (/\b(think about|call back|more time|decision)\b/i.test(content)) {
      ai_summary = 'Customer needs time to consider; showed moderate interest but requires decision time.';
      ai_next_steps = 'Schedule follow-up call in 1 week to discuss decision.';
      follow_up_required = true;
    } else {
      ai_summary = 'General discussion completed; customer received product information.';
      ai_next_steps = 'Send informational materials and check in after 2 weeks.';
    }
  } else if (interaction_type === 'email') {
    if (/\b(question|inquiry|help|support)\b/i.test(content)) {
      ai_summary = 'Customer reached out with questions requiring detailed response.';
      ai_next_steps = 'Provide comprehensive answer within 4 hours.';
      follow_up_required = true;
    } else if (/\b(complaint|problem|issue|frustrated)\b/i.test(content)) {
      ai_summary = 'Customer reported issue requiring immediate attention and resolution.';
      ai_next_steps = 'Escalate to support team and call customer within 2 hours.';
      sentiment = 'negative';
      follow_up_required = true;
    } else if (/\b(thank|satisfied|great|excellent)\b/i.test(content)) {
      ai_summary = 'Positive feedback received; customer expressed satisfaction with service.';
      ai_next_steps = 'Request testimonial and check for upsell opportunities.';
      sentiment = 'positive';
    } else {
      ai_summary = 'Standard email communication completed successfully.';
      ai_next_steps = 'Monitor for response and follow up if needed.';
    }
  } else if (interaction_type === 'sms') {
    if (/\b(yes|interested|okay|sounds good)\b/i.test(content)) {
      ai_summary = 'Customer responded positively to SMS outreach.';
      ai_next_steps = 'Convert to phone call within 24 hours.';
      sentiment = 'positive';
      follow_up_required = true;
    } else if (/\b(stop|no|not interested|unsubscribe)\b/i.test(content)) {
      ai_summary = 'Customer opted out of SMS communications.';
      ai_next_steps = 'Remove from SMS list and update preferences.';
      sentiment = 'negative';
    } else {
      ai_summary = 'SMS conversation in progress; customer engagement noted.';
      ai_next_steps = 'Continue conversation based on customer response.';
    }
  }

  return NextResponse.json({
    success: true,
    ai_summary,
    ai_next_steps,
    sentiment,
    follow_up_required,
    provider: 'keyword-fallback'
  });
} 