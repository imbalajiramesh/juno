// - All database operations now use the Supabase client.
// - RLS is now supported if enabled in Supabase.

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
    const supabase = await createClient();
    try {
        // Get all call logs and sum the duration_minutes
        const { data: callLogs, error } = await supabase
            .from('juno_call_logs')
            .select('duration_minutes');

        if (error) throw error;

        // Calculate total used minutes
        const totalUsed = (callLogs || []).reduce((sum, record) => {
            return sum + (Number(record.duration_minutes) || 0);
        }, 0);

        return NextResponse.json({ 
            total: totalUsed
        });
    } catch (error) {
        console.error('Error fetching used minutes:', error);
        return NextResponse.json({ error: 'Failed to fetch used minutes' }, { status: 500 });
    }
} 