import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withTenant } from '@/lib/get-tenant';
import { sendInvitationEmail } from '@/lib/invitation-email';
import { checkUserPermission } from '@/lib/permissions-server';
import { PERMISSIONS } from '@/lib/permissions';

// GET - List invitations for the tenant
export const GET = withTenant(async (tenantId: string) => {
  try {
    // Check permissions
    const hasPermission = await checkUserPermission(PERMISSIONS.TEAM_READ);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Access denied. Missing required permission: team.read' },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select(`
        *,
        invited_by_user:invited_by (
          first_name,
          last_name,
          email
        ),
        role:role_id (
          role_name
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(invitations || []);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
});

// POST - Create new invitation
export const POST = withTenant(async (tenantId: string, req: NextRequest) => {
  try {
    // Check permissions
    const hasPermission = await checkUserPermission(PERMISSIONS.TEAM_INVITE);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Access denied. Missing required permission: team.invite' },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const { email, role_id } = await req.json();

    if (!email || !role_id) {
      return NextResponse.json(
        { error: 'Email and role_id are required' },
        { status: 400 }
      );
    }

    // Get current user's account info
    const { data: currentUser, error: userError } = await supabase
      .from('user_accounts')
      .select('id, first_name, last_name, email')
      .eq('auth_id', user.id)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json(
        { error: 'Current user not found' },
        { status: 404 }
      );
    }

    // Get tenant info
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get role info
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('role_name')
      .eq('id', role_id)
      .single();

    if (roleError || !role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      );
    }

    // Check if user is already part of the tenant
    const { data: existingUser } = await supabase
      .from('user_accounts')
      .select('id')
      .eq('email', email)
      .eq('tenant_id', tenantId)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 400 }
      );
    }

    // Check if there's already a pending invitation
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id, accepted_at')
      .eq('email', email)
      .eq('tenant_id', tenantId)
      .is('accepted_at', null)
      .single();

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'A pending invitation already exists for this email' },
        { status: 400 }
      );
    }

    // Generate invitation token and expiry
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // Create invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .insert({
        tenant_id: tenantId,
        email,
        role_id,
        invited_by: currentUser.id,
        token: invitationToken,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (invitationError) throw invitationError;

    // Send invitation email
    const invitationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/accept-invitation?token=${invitationToken}`;
    const inviterName = `${currentUser.first_name} ${currentUser.last_name}`.trim() || 'Team Member';
    
    const emailResult = await sendInvitationEmail({
      email,
      organizationName: tenant.name,
      inviterName,
      inviterEmail: currentUser.email,
      role: role.role_name,
      invitationUrl,
    });

    if (!emailResult.success) {
      console.error('Failed to send invitation email:', emailResult.error);
      // Don't fail the invitation creation if email fails
    }

    return NextResponse.json({
      success: true,
      invitation,
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
});

// DELETE - Cancel invitation
export const DELETE = withTenant(async (tenantId: string, req: NextRequest) => {
  try {
    // Check permissions
    const hasPermission = await checkUserPermission(PERMISSIONS.TEAM_INVITE);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Access denied. Missing required permission: team.invite' },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const invitationId = searchParams.get('id');

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    return NextResponse.json(
      { error: 'Failed to cancel invitation' },
      { status: 500 }
    );
  }
}); 