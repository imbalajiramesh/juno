import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(new URL('/settings/mailbox?error=missing_params', request.url));
    }

    // Decode state
    const stateData = JSON.parse(atob(state));
    const { tenant_id, user_id, email_address, domain, provider, connection_method } = stateData;

    // Exchange code for tokens
    let accessToken = '';
    let refreshToken = '';
    let actualEmailAddress = email_address;

    if (provider === 'gmail') {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/mailbox/callback`,
        }),
      });

      const tokens = await tokenResponse.json();
      accessToken = tokens.access_token;
      refreshToken = tokens.refresh_token;

      // For direct connections, get the actual email address
      if (connection_method === 'direct') {
        const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const profile = await profileResponse.json();
        actualEmailAddress = profile.email;
      }
    } else if (provider === 'outlook') {
      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/mailbox/callback`,
        }),
      });

      const tokens = await tokenResponse.json();
      accessToken = tokens.access_token;
      refreshToken = tokens.refresh_token;

      // For direct connections, get the actual email address
      if (connection_method === 'direct') {
        const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const profile = await profileResponse.json();
        actualEmailAddress = profile.mail || profile.userPrincipalName;
      }
    }

    const supabase = await createClient();

    if (connection_method === 'domain') {
      // Update existing pending connection
      const { error } = await supabase
        .from('mailbox_configs')
        .update({
          status: 'active',
          access_token: accessToken,
          refresh_token: refreshToken,
          connected_at: new Date().toISOString(),
          last_sync: new Date().toISOString(),
        })
        .eq('tenant_id', tenant_id)
        .eq('email_address', email_address)
        .eq('status', 'pending');

      if (error) {
        console.error('Error updating mailbox config:', error);
        return NextResponse.redirect(new URL('/settings/mailbox?error=update_failed', request.url));
      }
    } else {
      // Create new connection for direct method
      // Extract domain from email for direct connections
      const emailDomain = actualEmailAddress.split('@')[1];
      
      const { error } = await supabase
        .from('mailbox_configs')
        .insert({
          tenant_id,
          email_address: actualEmailAddress,
          domain: emailDomain,
          provider,
          status: 'active',
          access_token: accessToken,
          refresh_token: refreshToken,
          connected_at: new Date().toISOString(),
          last_sync: new Date().toISOString(),
          unread_count: 0,
        });

      if (error) {
        console.error('Error creating mailbox config:', error);
        return NextResponse.redirect(new URL('/settings/mailbox?error=create_failed', request.url));
      }
    }

    return NextResponse.redirect(new URL('/settings/mailbox?success=connected', request.url));
  } catch (error) {
    console.error('Error in mailbox callback:', error);
    return NextResponse.redirect(new URL('/settings/mailbox?error=unknown', request.url));
  }
} 