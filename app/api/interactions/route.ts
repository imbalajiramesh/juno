import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withTenant } from '@/lib/get-tenant';

interface CreateInteractionRequest {
  customer_id: string;
  interaction_type: 'call' | 'email' | 'sms' | 'meeting' | 'note' | 'other';
  details: string;
  interaction_date?: string;
  generate_ai_summary?: boolean;
}

export const POST = withTenant(async (tenantId: string, req: NextRequest) => {
  const supabase = await createClient();
  
  try {
    const body: CreateInteractionRequest = await req.json();
    const { customer_id, interaction_type, details, interaction_date, generate_ai_summary = true } = body;

    if (!customer_id || !interaction_type || !details) {
      return NextResponse.json(
        { error: 'Missing required fields: customer_id, interaction_type, details' },
        { status: 400 }
      );
    }

    // Verify customer exists and belongs to tenant
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, first_name, last_name')
      .eq('id', customer_id)
      .eq('tenant_id', tenantId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found or access denied' },
        { status: 404 }
      );
    }

    let ai_summary = null;
    let ai_next_steps = null;

    // Generate AI analysis if requested
    if (generate_ai_summary) {
      try {
        const { data: aiAnalysis, error: aiError } = await supabase
          .rpc('generate_ai_interaction_analysis', {
            interaction_type: interaction_type,
            content: details,
            customer_context: `${customer.first_name} ${customer.last_name}`
          });

        if (!aiError && aiAnalysis) {
          ai_summary = aiAnalysis.ai_summary;
          ai_next_steps = aiAnalysis.ai_next_steps;
        }
      } catch (error) {
        console.warn('AI analysis failed, continuing without:', error);
      }
    }

    // Create the interaction
    const { data: interaction, error: insertError } = await supabase
      .from('interactions')
      .insert({
        customer_id: customer_id,
        interaction_type: interaction_type,
        details: details,
        interaction_date: interaction_date ? new Date(interaction_date).toISOString() : new Date().toISOString(),
        tenant_id: tenantId,
        ai_summary: ai_summary,
        ai_next_steps: ai_next_steps,
        interaction_source: 'manual'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating interaction:', insertError);
      return NextResponse.json(
        { error: 'Failed to create interaction' },
        { status: 500 }
      );
    }

    // Update customer AI summary if AI analysis was generated
    if (ai_summary) {
      try {
        await supabase
          .rpc('update_customer_ai_summary', {
            p_customer_id: customer_id,
            p_tenant_id: tenantId
          });
      } catch (error) {
        console.warn('Failed to update customer AI summary:', error);
      }
    }

    return NextResponse.json({
      success: true,
      interaction: {
        id: interaction.id,
        customer_id: interaction.customer_id,
        interaction_type: interaction.interaction_type,
        details: interaction.details,
        interaction_date: interaction.interaction_date,
        ai_summary: interaction.ai_summary,
        ai_next_steps: interaction.ai_next_steps,
        created_at: interaction.created_at
      },
      customer: {
        id: customer.id,
        name: `${customer.first_name} ${customer.last_name}`
      }
    });

  } catch (error) {
    console.error('Error in interactions API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const GET = withTenant(async (tenantId: string, req: NextRequest) => {
  const supabase = await createClient();
  
  try {
    const { searchParams } = new URL(req.url);
    const customer_id = searchParams.get('customer_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    let query = supabase
      .from('interactions')
      .select(`
        id,
        customer_id,
        interaction_type,
        details,
        interaction_date,
        ai_summary,
        ai_next_steps,
        interaction_source,
        created_at,
        customers (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('tenant_id', tenantId)
      .order('interaction_date', { ascending: false })
      .limit(limit);

    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }

    const { data: interactions, error } = await query;

    if (error) {
      console.error('Error fetching interactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch interactions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      interactions: interactions || []
    });

  } catch (error) {
    console.error('Error in interactions GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}); 