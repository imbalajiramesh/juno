// - All database operations now use the Supabase client.
// - RLS is now supported if enabled in Supabase.

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
    const supabase = await createClient();
    try {
        // Get current credit balance using the new credits system
        const { data: balance, error: balanceError } = await supabase
            .rpc('get_tenant_credit_balance', { tenant_id_param: 'default' });

        if (balanceError) {
            console.error('Error getting credit balance:', balanceError);
            return NextResponse.json({ total: 0 });
        }

        return NextResponse.json({ 
            total: balance || 0
        });
    } catch (error) {
        console.error('Error fetching balance minutes:', error);
        return NextResponse.json({ error: 'Failed to fetch balance minutes' }, { status: 500 });
    }
} 