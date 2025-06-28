import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Verify super admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userAccount, error: userError } = await supabase
      .from('user_accounts')
      .select(`
        id,
        role:roles(
          role_name
        )
      `)
      .eq('auth_id', user.id)
      .single();

    if (userError || !userAccount || userAccount.role?.role_name !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const tenantId = params.id;

    // Get current balance
    const { data: balance, error: balanceError } = await (supabase as any)
      .rpc('get_tenant_credit_balance', { tenant_id_param: tenantId });

    if (balanceError) {
      console.error('Error fetching credit balance:', balanceError);
      return NextResponse.json({ error: 'Failed to fetch credit balance' }, { status: 500 });
    }

    // Get recent credit transactions (last 50)
    const { data: transactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (transactionsError) {
      console.error('Error fetching credit transactions:', transactionsError);
      return NextResponse.json({ error: 'Failed to fetch credit transactions' }, { status: 500 });
    }

    return NextResponse.json({
      current_balance: balance || 0,
      transactions: transactions || []
    });

  } catch (error) {
    console.error('Credit management GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Verify super admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userAccount, error: userError } = await supabase
      .from('user_accounts')
      .select(`
        id,
        role:roles(
          role_name
        )
      `)
      .eq('auth_id', user.id)
      .single();

    if (userError || !userAccount || userAccount.role?.role_name !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const { amount, reason, transaction_type } = await request.json();
    const tenantId = params.id;

    // Validate input
    if (!amount || typeof amount !== 'number') {
      return NextResponse.json({ error: 'Amount is required and must be a number' }, { status: 400 });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }

    if (!transaction_type || !['credit_adjustment', 'credit_bonus', 'credit_refund', 'credit_penalty'].includes(transaction_type)) {
      return NextResponse.json({ 
        error: 'Invalid transaction_type. Must be: credit_adjustment, credit_bonus, credit_refund, or credit_penalty' 
      }, { status: 400 });
    }

    // Get current balance before change
    const { data: currentBalance, error: balanceError } = await (supabase as any)
      .rpc('get_tenant_credit_balance', { tenant_id_param: tenantId });

    if (balanceError) {
      console.error('Error fetching current balance:', balanceError);
      return NextResponse.json({ error: 'Failed to fetch current balance' }, { status: 500 });
    }

    // Check if this would result in negative balance for deductions
    if (amount < 0 && (currentBalance || 0) + amount < 0) {
      return NextResponse.json({ 
        error: `Cannot deduct ${Math.abs(amount)} credits. Current balance: ${currentBalance || 0}`,
        current_balance: currentBalance || 0
      }, { status: 400 });
    }

    // Apply the credit change
    const { data: updateResult, error: updateError } = await (supabase as any)
      .rpc('update_credits', {
        tenant_id_param: tenantId,
        amount_param: amount,
        transaction_type_param: transaction_type,
        description_param: `[SUPER ADMIN] ${reason}`,
        reference_id_param: `super_admin_${Date.now()}`
      });

    if (updateError || !updateResult) {
      console.error('Error updating credits:', updateError);
      return NextResponse.json({ error: 'Failed to update credits' }, { status: 500 });
    }

    // Get new balance
    const { data: newBalance } = await (supabase as any)
      .rpc('get_tenant_credit_balance', { tenant_id_param: tenantId });

    // Log the super admin action
    await (supabase as any).rpc('log_super_admin_action', {
      p_action: amount > 0 ? 'add_credits' : 'remove_credits',
      p_resource_type: 'organization',
      p_resource_id: tenantId,
      p_details: {
        amount,
        reason,
        transaction_type,
        previous_balance: currentBalance || 0,
        new_balance: newBalance || 0
      }
    });

    return NextResponse.json({
      success: true,
      message: `${amount > 0 ? 'Added' : 'Deducted'} ${Math.abs(amount)} credits`,
      amount,
      previous_balance: currentBalance || 0,
      new_balance: newBalance || 0,
      transaction_type,
      reason
    });

  } catch (error) {
    console.error('Credit management POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 