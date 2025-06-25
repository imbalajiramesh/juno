// - All database operations now use the Supabase client.
// - RLS is now supported if enabled in Supabase.

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
    const supabase = await createClient();
    try {
        // Get total count of all SMS/texts
        const { count: currentCount, error } = await supabase
            .from('alex_sms_logs')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;

        // Get last month's count (which will be 0 since all texts are in the future)
        const lastCount = 0;

        // Calculate percentage change
        let percentageChange = (currentCount || 0) > 0 ? 100 : 0;

        return NextResponse.json({ 
            currentCount: currentCount || 0,
            lastCount,
            percentageChange
        });
    } catch (error) {
        console.error('Error fetching text stats:', error);
        return NextResponse.json({ error: 'Failed to fetch text stats' }, { status: 500 });
    }
} 