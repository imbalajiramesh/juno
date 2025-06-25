// - All database operations now use the Supabase client.
// - RLS is now supported if enabled in Supabase.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withTenant } from '@/lib/get-tenant';
import { sendFarewellEmail } from '@/lib/email';

export const GET = withTenant(async (tenantId: string) => {
  const supabase = await createClient();
  try {
    console.log('Fetching organization for tenantId:', tenantId);
    
    // Get organization details - this might need to be adapted based on your schema
    const { data: organization, error } = await supabase
      .from('tenants') // Assuming you have a tenants table
      .select(`
        id,
        name,
        schema_name,
        clerk_org_id,
        industry,
        description,
        size,
        location,
        setup_completed,
        vapi_org_id,
        twilio_subaccount_sid,
        created_at,
        updated_at
      `)
      .eq('id', tenantId)
      .single();

    console.log('Organization query result:', { organization, error });

    if (error) throw error;

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    );
  }
});

export const PUT = withTenant(async (tenantId: string, req: NextRequest) => {
  const supabase = await createClient();
  try {
    const data = await req.json();
    
    // Only allow updating specific fields
    const allowedFields = [
      'name',
      'industry',
      'description',
      'size',
      'location'
    ];
    
    const updateData: Record<string, any> = {};
    
    // Filter out only allowed fields
    for (const field of allowedFields) {
      if (field in data) {
        updateData[field] = data[field];
      }
    }
    
    // Add updated timestamp
    updateData.updated_at = new Date().toISOString();
    
    // Update organization details
    const { data: organization, error } = await supabase
      .from('tenants')
      .update(updateData)
      .eq('id', tenantId)
      .select(`
        id,
        name,
        schema_name,
        clerk_org_id,
        industry,
        description,
        size,
        location,
        setup_completed,
        vapi_org_id,
        twilio_subaccount_sid,
        created_at,
        updated_at
      `)
      .single();

    if (error) throw error;

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    );
  }
});

export const DELETE = withTenant(async (tenantId: string, request: NextRequest) => {
  const supabase = await createClient();
  try {
    // Additional security: Require organization name confirmation
    const { organizationName, confirmDeletion } = await request.json();
    
    if (!confirmDeletion) {
      return NextResponse.json(
        { error: 'Deletion confirmation required' },
        { status: 400 }
      );
    }

    // Get current tenant info for verification and cleanup
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get current user info for the farewell email
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Get user account info for personalized email
    const { data: userAccount } = await supabase
      .from('user_accounts')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    // Verify organization name matches
    if (organizationName !== tenant.name) {
      return NextResponse.json(
        { error: 'Organization name confirmation does not match' },
        { status: 400 }
      );
    }

    // Track cleanup results
    const cleanupResults = {
      vapiOrg: false,
      twilioSubaccount: false,
      resendDomains: false,
      voiceAgents: false,
      phoneNumbers: false,
    };

    // 1. Cleanup External Resources First
    
    // Cleanup Vapi organization
    if (tenant.vapi_org_id && process.env.VAPI_API_KEY) {
      try {
        // Delete all voice agents first
        const { data: voiceAgents } = await supabase
          .from('voice_agents')
          .select('vapi_agent_id')
          .eq('tenant_id', tenantId);

        if (voiceAgents) {
          for (const agent of voiceAgents) {
            if (agent.vapi_agent_id) {
              try {
                await fetch(`https://api.vapi.ai/assistant/${agent.vapi_agent_id}`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
                    'X-Vapi-Org-Id': tenant.vapi_org_id,
                  },
                });
              } catch (agentError) {
                console.warn('Failed to delete Vapi agent:', agent.vapi_agent_id, agentError);
              }
            }
          }
          cleanupResults.voiceAgents = true;
        }

        // Delete phone numbers from Vapi
        const { data: phoneNumbers } = await supabase
          .from('tenant_phone_numbers')
          .select('vapi_phone_number_id')
          .eq('tenant_id', tenantId);

        if (phoneNumbers) {
          for (const phone of phoneNumbers) {
            if (phone.vapi_phone_number_id) {
              try {
                await fetch(`https://api.vapi.ai/phone-number/${phone.vapi_phone_number_id}`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
                    'X-Vapi-Org-Id': tenant.vapi_org_id,
                  },
                });
              } catch (phoneError) {
                console.warn('Failed to delete Vapi phone number:', phone.vapi_phone_number_id, phoneError);
              }
            }
          }
          cleanupResults.phoneNumbers = true;
        }

        // Delete Vapi organization
        await fetch(`https://api.vapi.ai/org/${tenant.vapi_org_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
          },
        });
        cleanupResults.vapiOrg = true;
        console.log('Deleted Vapi organization:', tenant.vapi_org_id);
      } catch (vapiError) {
        console.error('Failed to cleanup Vapi organization:', vapiError);
      }
    }

    // Cleanup Twilio subaccount
    if (tenant.twilio_subaccount_sid && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        // Close Twilio subaccount (safer than deleting)
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${tenant.twilio_subaccount_sid}.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            Status: 'closed'
          })
        });
        cleanupResults.twilioSubaccount = true;
        console.log('Closed Twilio subaccount:', tenant.twilio_subaccount_sid);
      } catch (twilioError) {
        console.error('Failed to close Twilio subaccount:', twilioError);
      }
    }

    // Cleanup Resend domains
    if (process.env.RESEND_API_KEY) {
      try {
        const { data: domains } = await supabase
          .from('mailbox_domains')
          .select('resend_domain_id')
          .eq('tenant_id', tenantId);

        if (domains) {
          for (const domain of domains) {
            if (domain.resend_domain_id) {
              try {
                await fetch(`https://api.resend.com/domains/${domain.resend_domain_id}`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                  },
                });
              } catch (domainError) {
                console.warn('Failed to delete Resend domain:', domain.resend_domain_id, domainError);
              }
            }
          }
          cleanupResults.resendDomains = true;
        }
      } catch (resendError) {
        console.error('Failed to cleanup Resend domains:', resendError);
      }
    }

    // 2. Delete all related records from database (in reverse dependency order)
    await Promise.all([
      supabase.from('custom_field_definitions').delete().eq('tenant_id', tenantId),
      supabase.from('tasks').delete().eq('tenant_id', tenantId),
      supabase.from('interactions').delete().eq('tenant_id', tenantId),
      supabase.from('alex_call_logs').delete().eq('tenant_id', tenantId),
      supabase.from('alex_email_logs').delete().eq('tenant_id', tenantId),
      supabase.from('alex_sms_logs').delete().eq('tenant_id', tenantId),
      supabase.from('alex_tasks').delete().eq('tenant_id', tenantId),
      supabase.from('customers').delete().eq('tenant_id', tenantId),
      supabase.from('voice_agents').delete().eq('tenant_id', tenantId),
      supabase.from('tenant_phone_numbers').delete().eq('tenant_id', tenantId),
      supabase.from('mailbox_domains').delete().eq('tenant_id', tenantId),
      supabase.from('invitations').delete().eq('tenant_id', tenantId),
      supabase.from('user_accounts').delete().eq('tenant_id', tenantId),
    ]);

    // 3. Finally delete the tenant
    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', tenantId);

    if (error) throw error;

    // 4. Send farewell email to the user
    try {
      await sendFarewellEmail({
        email: user.email!,
        firstName: userAccount?.first_name || 'there',
        organizationName: tenant.name,
        userName: `${userAccount?.first_name || ''} ${userAccount?.last_name || ''}`.trim() || 'User'
      });
      console.log('Farewell email sent successfully');
    } catch (emailError) {
      console.error('Failed to send farewell email:', emailError);
      // Don't fail the deletion if email fails
    }

    // 5. Handle the current user - they still exist in Supabase Auth
    // but their organization is gone, so they need to create/join a new one
    
    return NextResponse.json({ 
      success: true,
      message: 'Organization deleted successfully',
      cleanupResults,
      userNote: 'Your account remains active. You will be redirected to set up a new organization.'
    });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return NextResponse.json(
      { error: 'Failed to delete organization' },
      { status: 500 }
    );
  }
}); 