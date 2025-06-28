import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withTenant } from '@/lib/get-tenant';

export const GET = withTenant(async (tenantId: string) => {
  const supabase = await createClient();
  
  try {
    // Get organization statistics
    const [
      customersResult,
      callLogsResult,
      emailLogsResult,
      smsLogsResult,
      userAccountsResult,
      customFieldsResult,
      tasksResult
    ] = await Promise.all([
      supabase
        .from('customers')
        .select('id, status, created_at')
        .eq('tenant_id', tenantId),
      
      supabase
        .from('juno_call_logs')
        .select('id, duration_minutes, created_at')
        .eq('tenant_id', tenantId),
      
      supabase
        .from('juno_email_logs')
        .select('id, created_at')
        .eq('tenant_id', tenantId),
      
      supabase
        .from('juno_sms_logs')
        .select('id, created_at')
        .eq('tenant_id', tenantId),
      
      supabase
        .from('user_accounts')
        .select('id, created_at')
        .eq('tenant_id', tenantId),
      
      supabase
        .from('custom_field_definitions')
        .select('id, created_at')
        .eq('tenant_id', tenantId),
      
      supabase
        .from('tasks')
        .select('id, status, created_at')
        .eq('tenant_id', tenantId)
    ]);

    // Calculate statistics
    const customers = customersResult.data || [];
    const callLogs = callLogsResult.data || [];
    const emailLogs = emailLogsResult.data || [];
    const smsLogs = smsLogsResult.data || [];
    const userAccounts = userAccountsResult.data || [];
    const customFields = customFieldsResult.data || [];
    const tasks = tasksResult.data || [];

    // Customer statistics
    const totalCustomers = customers.length;
    const newCustomers = customers.filter(c => c.status === 'new').length;
    const qualifiedCustomers = customers.filter(c => c.status === 'qualified').length;
    const closedWonCustomers = customers.filter(c => c.status === 'closed_won').length;

    // Activity statistics
    const totalCalls = callLogs.length;
    const totalCallMinutes = callLogs.reduce((sum, call) => sum + (call.duration_minutes || 0), 0);
    const totalEmails = emailLogs.length;
    const totalSMS = smsLogs.length;

    // Team statistics
    const totalTeamMembers = userAccounts.length;

    // Task statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;

    // Time-based statistics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCustomers = customers.filter(c => 
      new Date(c.created_at) > thirtyDaysAgo
    ).length;

    const recentCalls = callLogs.filter(c => 
      new Date(c.created_at) > thirtyDaysAgo
    ).length;

    const recentEmails = emailLogs.filter(e => 
      new Date(e.created_at) > thirtyDaysAgo
    ).length;

    const recentSMS = smsLogs.filter(s => 
      new Date(s.created_at) > thirtyDaysAgo
    ).length;

    const stats = {
      customers: {
        total: totalCustomers,
        new: newCustomers,
        qualified: qualifiedCustomers,
        closedWon: closedWonCustomers,
        recent30Days: recentCustomers
      },
      communications: {
        calls: {
          total: totalCalls,
          totalMinutes: totalCallMinutes,
          recent30Days: recentCalls
        },
        emails: {
          total: totalEmails,
          recent30Days: recentEmails
        },
        sms: {
          total: totalSMS,
          recent30Days: recentSMS
        }
      },
      team: {
        totalMembers: totalTeamMembers
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks
      },
      customization: {
        customFields: customFields.length
      }
    };

    return NextResponse.json(stats);
    
  } catch (error) {
    console.error('Error fetching organization stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization statistics' },
      { status: 500 }
    );
  }
}); 