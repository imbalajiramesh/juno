// - All database operations now use the Supabase client.
// - RLS is now supported if enabled in Supabase.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withTenant } from '@/lib/get-tenant';

// Type definitions for the API response
interface Interaction {
  id: string;
  interaction_type: 'call' | 'email' | 'sms' | 'meeting' | 'note';
}

interface Customer {
  id: string;
  interactions: Interaction[];
}

interface UserWithStats {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  customers: Customer[];
}

interface LeaderboardEntry {
  id: string;
  name: string;
  email: string;
  calls: number;
  emails: number;
  sms: number;
  meetings: number;
  notes: number;
  total: number;
}

export const GET = withTenant(async (tenantId: string) => {
  const supabase = await createClient();
  try {
    // Get leaderboard stats - this will need to be adapted based on your actual requirements
    // For now, let's get user stats from interactions or other relevant tables
    
    // Get user stats by joining through customers to interactions
    const { data: userStats, error } = await supabase
      .from('user_accounts')
      .select(`
        id,
        first_name,
        last_name,
        email,
        customers!inner(
          id,
          interactions(
            id,
            interaction_type
          )
        )
      `)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    // Process the data to create leaderboard stats
    const leaderboard: LeaderboardEntry[] = (userStats as UserWithStats[] || []).map((user: UserWithStats) => {
      // Flatten all interactions from all customers assigned to this user
      const allInteractions = user.customers?.flatMap((customer: Customer) => customer.interactions || []) || [];
      
      const callCount = allInteractions.filter((i: Interaction) => i.interaction_type === 'call').length;
      const emailCount = allInteractions.filter((i: Interaction) => i.interaction_type === 'email').length;
      const smsCount = allInteractions.filter((i: Interaction) => i.interaction_type === 'sms').length;
      const meetingCount = allInteractions.filter((i: Interaction) => i.interaction_type === 'meeting').length;
      const noteCount = allInteractions.filter((i: Interaction) => i.interaction_type === 'note').length;
      
      return {
        id: user.id,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User',
        email: user.email,
        calls: callCount,
        emails: emailCount,
        sms: smsCount,
        meetings: meetingCount,
        notes: noteCount,
        total: callCount + emailCount + smsCount + meetingCount + noteCount,
      };
    }).sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.total - a.total);

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard stats' },
      { status: 500 }
    );
  }
}); 