import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendWelcomeEmail } from '@/lib/invitation-email';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    // Get invitation details
    const { data: invitation, error: invitationError } = await (supabase as any)
      .from('invitations')
      .select(`
        *,
        tenant:tenant_id (
          name,
          subscription_status
        )
      `)
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    return NextResponse.json({
      invitation: {
        email: invitation.email,
        organizationName: invitation.tenant.name,
        role: invitation.role,
        inviterName: invitation.inviter_name,
        inviterEmail: invitation.inviter_email,
        expiresAt: invitation.expires_at,
      }
    });

  } catch (error) {
    console.error('Error verifying invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, password, firstName, lastName } = await request.json();

    if (!token || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get invitation details
    const { data: invitation, error: invitationError } = await (supabase as any)
      .from('invitations')
      .select(`
        *,
        tenant:tenant_id (name)
      `)
      .eq('token', token)
      .eq('status', 'pending')
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
    const { data: existingUser } = await (supabase as any).auth.admin.listUsers();
    const userExists = existingUser.users?.find((u: any) => u.email === invitation.email);

    if (userExists) {
      // If user exists, just add them to the tenant
      const { data: existingUserAccount } = await (supabase as any)
        .from('user_accounts')
        .select('id')
        .eq('auth_id', userExists.id)
        .single();

      if (existingUserAccount) {
        // Update existing user account with new tenant
        const { error: updateError } = await (supabase as any)
          .from('user_accounts')
          .update({
            tenant_id: invitation.tenant_id,
            role_id: invitation.role_id,
          })
          .eq('id', existingUserAccount.id);

        if (updateError) throw updateError;
      } else {
        // Create user account for existing auth user
        const { error: createAccountError } = await (supabase as any)
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
      await (supabase as any)
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
    const { data: newUser, error: signUpError } = await (supabase as any).auth.admin.createUser({
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
    const { error: userAccountError } = await (supabase as any)
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
      await (supabase as any).auth.admin.deleteUser(newUser.user.id);
      throw userAccountError;
    }

    // Mark invitation as accepted
    await (supabase as any)
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
      role: invitation.role,
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
        role: invitation.role,
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