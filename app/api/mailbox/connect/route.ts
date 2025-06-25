import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant_id
    const { data: profile } = await supabase
      .from('user_accounts')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const { provider, connection_method, domain, email_prefix } = await request.json();

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
    }

    let email_address = '';
    
    if (connection_method === 'domain') {
      if (!domain || !email_prefix) {
        return NextResponse.json({ error: 'Domain and email prefix are required for domain connection' }, { status: 400 });
      }

      // Validate that domain is verified
      const { data: domainConfig } = await supabase
        .from('mailbox_domains')
        .select('verified')
        .eq('domain', domain)
        .eq('tenant_id', profile.tenant_id)
        .single();

      if (!domainConfig?.verified) {
        return NextResponse.json({ error: 'Domain must be verified before connecting' }, { status: 400 });
      }

      email_address = `${email_prefix}@${domain}`;
    } else {
      // For direct connection, email will be determined after OAuth
      email_address = 'pending';
    }

    // Check if this email address already exists (only for domain connections)
    if (connection_method === 'domain') {
      const { data: existingMailbox } = await supabase
        .from('mailbox_configs')
        .select('id')
        .eq('email_address', email_address)
        .eq('tenant_id', profile.tenant_id)
        .single();

      if (existingMailbox) {
        return NextResponse.json({ error: 'Email address already connected' }, { status: 400 });
      }
    }

    // Generate OAuth URL based on provider
    let authUrl = '';
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/mailbox/callback`;
    const state = btoa(JSON.stringify({
      tenant_id: profile.tenant_id,
      user_id: user.id,
      email_address,
      domain,
      provider,
      connection_method
    }));

    if (provider === 'gmail') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const scopes = encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send');
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${scopes}&` +
        `state=${encodeURIComponent(state)}&` +
        `access_type=offline&` +
        `prompt=consent`;
    } else if (provider === 'outlook') {
      const clientId = process.env.MICROSOFT_CLIENT_ID;
      const scopes = encodeURIComponent('https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send');
      authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${scopes}&` +
        `state=${encodeURIComponent(state)}&` +
        `response_mode=query`;
    } else {
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
    }

    // Store pending connection (only for domain connections)
    if (connection_method === 'domain') {
      await supabase
        .from('mailbox_configs')
        .insert({
          tenant_id: profile.tenant_id,
          email_address,
          domain,
          provider,
          status: 'pending',
          unread_count: 0,
        });
    }

    return NextResponse.json({ auth_url: authUrl });
  } catch (error) {
    console.error('Error in mailbox connect:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 