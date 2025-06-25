// - All database operations now use the Supabase client.
// - RLS is now supported if enabled in Supabase.

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    const supabase = await createClient();
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const itemsPerPage = parseInt(searchParams.get('itemsPerPage') || '10');
        const search = searchParams.get('search') || '';
        const duration = searchParams.get('duration') || '';

        // Calculate pagination
        const from = (page - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        // Build query
        let query = supabase
            .from('alex_call_logs')
            .select(`
                *, 
                customers(first_name, last_name),
                voice_agents(name)
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);

        // Add search condition if search term exists
        if (search) {
            query = query.or(`customers.first_name.ilike.%${search}%,customers.last_name.ilike.%${search}%`);
        }

        // Add duration filter if specified
        if (duration && duration !== 'All') {
            const [min, max] = duration.split('-').map(Number);
            if (max) {
                query = query.gte('duration_minutes', min).lte('duration_minutes', max);
            } else {
                query = query.gte('duration_minutes', min);
            }
        }

        const { data: callLogs, error, count: total } = await query;
        if (error) throw error;

        // Format the response data
        const formattedLogs = (callLogs || []).map(log => ({
            ...log,
            duration_minutes: log.duration_minutes || 0,
            created_at: log.created_at || new Date().toISOString()
        }));

        return NextResponse.json({
            data: formattedLogs,
            total: total || 0,
            page,
            totalPages: Math.ceil((total || 0) / itemsPerPage)
        });
    } catch (error) {
        console.error('Error fetching call logs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch call logs' },
            { status: 500 }
        );
    }
}