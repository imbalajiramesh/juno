// - All database operations now use the Supabase client.
// - RLS is now supported if enabled in Supabase.

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
    const supabase = await createClient();
    try {
        // Get total minutes added from alex_add_minutes table
        const { data: addedMinutes } = await supabase
            .from('alex_add_minutes')
            .select('total_minutes');
        
        // Get total minutes used from call logs
        const { data: callLogs } = await supabase
            .from('alex_call_logs')
            .select('duration_minutes');

        const totalAdded = (addedMinutes || []).reduce((sum, record) => sum + (Number(record.total_minutes) || 0), 0);
        const totalUsed = (callLogs || []).reduce((sum, record) => sum + (Number(record.duration_minutes) || 0), 0);
        
        const balance = totalAdded - totalUsed;

        console.log('Balance calculation:', {
            totalMinutes: totalAdded,
            usedMinutes: totalUsed,
            balance
        });

        return NextResponse.json({ 
            total: balance
        });
    } catch (error) {
        console.error('Error fetching balance minutes:', error);
        return NextResponse.json({ error: 'Failed to fetch balance minutes' }, { status: 500 });
    }
} 