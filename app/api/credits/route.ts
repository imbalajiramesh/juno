import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCurrentTenant } from '@/lib/get-tenant';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenant } = await getCurrentTenant();
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get current credit balance
    const { data: balance, error: balanceError } = await (supabase as any)
      .rpc('get_tenant_credit_balance', { tenant_id_param: tenant.id });

    if (balanceError) {
      console.error('Error fetching credit balance:', balanceError);
      return NextResponse.json({ error: 'Failed to fetch credit balance' }, { status: 500 });
    }

    // Get recent transactions
    const { data: transactions, error: transactionsError } = await (supabase as any)
      .from('credit_transactions')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    return NextResponse.json({
      balance: balance || 0,
      transactions: transactions || []
    });
  } catch (error) {
    console.error('Error in credits GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { tenant } = await getCurrentTenant();
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const { amount, transaction_type, description, reference_id } = await req.json();

    // Validate input
    if (!amount || !transaction_type || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ensure amount is integer
    const credits = Math.floor(Number(amount));
    if (isNaN(credits)) {
      return NextResponse.json({ error: 'Amount must be a valid number' }, { status: 400 });
    }

    // Update credits using the database function
    const { data: success, error } = await (supabase as any)
      .rpc('update_credits', {
        tenant_id_param: tenant.id,
        amount_param: credits,
        transaction_type_param: transaction_type,
        description_param: description,
        reference_id_param: reference_id || null
      });

    if (error || !success) {
      console.error('Error updating credits:', error);
      return NextResponse.json({ 
        error: error?.message || 'Failed to update credits' 
      }, { status: 400 });
    }

    // Get updated balance
    const { data: newBalance } = await (supabase as any)
      .rpc('get_tenant_credit_balance', { tenant_id_param: tenant.id });

    return NextResponse.json({
      success: true,
      balance: newBalance || 0
    });
  } catch (error) {
    console.error('Error in credits POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 