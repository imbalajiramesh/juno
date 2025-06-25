// - All database operations now use the Supabase client.
// - RLS is now supported if enabled in Supabase.

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
    const supabase = await createClient();
    try {
        // Get total count of appointments from tasks or a dedicated appointments table
        const { count: currentCount, error } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('task_type', 'appointment');

        if (error) throw error;

        // For now, set last count to 0 since we don't have historical data
        const lastCount = 0;

        // Calculate percentage change
        let percentageChange = (currentCount || 0) > 0 ? 100 : 0;

        return NextResponse.json({ 
            currentCount: currentCount || 0,
            lastCount,
            percentageChange
        });
    } catch (error) {
        console.error('Error fetching appointment stats:', error);
        return NextResponse.json({ error: 'Failed to fetch appointment stats' }, { status: 500 });
    }
} 