import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendWelcomeEmail } from '@/lib/invitation-email';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { token, password, firstName, lastName } = await req.json();

    if (!token || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Token, password, firstName, and lastName are required' },
        { status: 400 }
      );
    }

    // Clean up expired invitations first
    await supabase.rpc('cleanup_expired_invitations');

    // Get invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select(`
        *,
        tenant:tenant_id (
          id,
          name
        ),
        role:role_id (
          id,
          role_name
        )
      `)
      .eq('token', token)
      .is('accepted_at', null)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 400 }
      );
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser.users?.find((u: any) => u.email === invitation.email);

    if (userExists) {
      // If user exists, just add them to the tenant
      const { data: existingUserAccount } = await supabase
        .from('user_accounts')
        .select('id')
        .eq('auth_id', userExists.id)
        .single();

      if (existingUserAccount) {
        // Update existing user account with new tenant
        const { error: updateError } = await supabase
          .from('user_accounts')
          .update({
            tenant_id: invitation.tenant_id,
            role_id: invitation.role_id,
          })
          .eq('id', existingUserAccount.id);

        if (updateError) throw updateError;
      } else {
        // Create user account for existing auth user
        const { error: createAccountError } = await supabase
          .from('user_accounts')
          .insert({
            id: crypto.randomUUID(),
            auth_id: userExists.id,
            email: invitation.email,
            first_name: firstName,
            last_name: lastName,
            tenant_id: invitation.tenant_id,
            role_id: invitation.role_id,
            date_of_joining: new Date().toISOString(),
          });

        if (createAccountError) throw createAccountError;
      }

      // Mark invitation as accepted
      await supabase
        .from('invitations')
        .update({ 
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      return NextResponse.json({
        success: true,
        message: 'Successfully joined the organization',
        existingUser: true,
      });
    }

    // Create new user
    const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true, // Auto-confirm since they're accepting an invitation
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      }
    });

    if (signUpError || !newUser.user) {
      console.error('Error creating user:', signUpError);
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    // Create user account record
    const { error: userAccountError } = await supabase
      .from('user_accounts')
      .insert({
        id: crypto.randomUUID(),
        auth_id: newUser.user.id,
        email: invitation.email,
        first_name: firstName,
        last_name: lastName,
        tenant_id: invitation.tenant_id,
        role_id: invitation.role_id,
        date_of_joining: new Date().toISOString(),
      });

    if (userAccountError) {
      console.error('Error creating user account:', userAccountError);
      // Try to clean up the auth user if account creation failed
      await supabase.auth.admin.deleteUser(newUser.user.id);
      throw userAccountError;
    }

    // Mark invitation as accepted
    await supabase
      .from('invitations')
      .update({ 
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    // Send welcome email
    const welcomeEmailResult = await sendWelcomeEmail({
      email: invitation.email,
      firstName,
      organizationName: invitation.tenant.name,
      role: invitation.role.role_name,
      dashboardUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
    });

    if (!welcomeEmailResult.success) {
      console.error('Failed to send welcome email:', welcomeEmailResult.error);
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully and invitation accepted',
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        firstName,
        lastName,
        role: invitation.role.role_name,
        organization: invitation.tenant.name,
      },
      welcomeEmailSent: welcomeEmailResult.success,
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}

// GET - Verify invitation token and get details
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Clean up expired invitations first
    await supabase.rpc('cleanup_expired_invitations');

    // Get invitation details
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(`
        email,
        expires_at,
        accepted_at,
        tenant:tenant_id (
          name
        ),
        role:role_id (
          role_name
        ),
        invited_by_user:invited_by (
          first_name,
          last_name,
          email
        )
      `)
      .eq('token', token)
      .is('accepted_at', null)
      .single();

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 400 }
      );
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation: {
        email: invitation.email,
        organizationName: invitation.tenant.name,
        role: invitation.role.role_name,
        inviterName: `${invitation.invited_by_user.first_name} ${invitation.invited_by_user.last_name}`.trim(),
        inviterEmail: invitation.invited_by_user.email,
        expiresAt: invitation.expires_at,
      },
    });
  } catch (error) {
    console.error('Error verifying invitation:', error);
    return NextResponse.json(
      { error: 'Failed to verify invitation' },
      { status: 500 }
    );
  }
} 