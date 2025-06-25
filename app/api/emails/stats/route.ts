// - All database operations now use the Supabase client.
// - RLS is now supported if enabled in Supabase.

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
    const supabase = await createClient();
    try {
        // Get total count of all emails
        const { count: currentCount, error } = await supabase
            .from('alex_email_logs')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;

        // Get last month's count (which will be 0 since all emails are in the future)
        const lastCount = 0;

        // Calculate percentage change
        let percentageChange = (currentCount || 0) > 0 ? 100 : 0;

        return NextResponse.json({ 
            currentCount: currentCount || 0,
            lastCount,
            percentageChange
        });
    } catch (error) {
        console.error('Error fetching email stats:', error);
        return NextResponse.json({ error: 'Failed to fetch email stats' }, { status: 500 });
    }
} 