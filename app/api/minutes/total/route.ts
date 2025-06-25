// - All database operations now use the Supabase client.
// - RLS is now supported if enabled in Supabase.

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
    const supabase = await createClient();
    try {
        // Get total minutes added
        const { data: addedMinutes, error: addedError } = await supabase
            .from('alex_add_minutes')
            .select('total_minutes');

        if (addedError) throw addedError;

        // Get total minutes used
        const { data: callLogs, error: usedError } = await supabase
            .from('alex_call_logs')
            .select('duration_minutes');

        if (usedError) throw usedError;

        // Calculate totals
        const totalAdded = (addedMinutes || []).reduce((sum, record) => {
            return sum + (Number(record.total_minutes) || 0);
        }, 0);

        const totalUsed = (callLogs || []).reduce((sum, record) => {
            return sum + (Number(record.duration_minutes) || 0);
        }, 0);

        // Calculate balance
        const balance = totalAdded - totalUsed;

        return NextResponse.json({ 
            total: balance
        });
    } catch (error) {
        console.error('Error fetching total minutes:', error);
        return NextResponse.json({ error: 'Failed to fetch total minutes' }, { status: 500 });
    }
} 