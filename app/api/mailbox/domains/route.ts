import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
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

    // Fetch domains for this tenant
    const { data: domains, error } = await supabase
      .from('mailbox_domains')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching domains:', error);
      return NextResponse.json({ error: 'Failed to fetch domains' }, { status: 500 });
    }

    return NextResponse.json(domains || []);
  } catch (error) {
    console.error('Error in domains GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const { domain } = await request.json();

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
    }

    // Check if domain already exists
    const { data: existingDomain } = await supabase
      .from('mailbox_domains')
      .select('id')
      .eq('domain', domain)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (existingDomain) {
      return NextResponse.json({ error: 'Domain already added' }, { status: 400 });
    }

    // Create domain in Resend
    let resendDomainId = null;
    try {
      const resendResponse = await fetch('https://api.resend.com/domains', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: domain,
          region: 'us-east-1'
        }),
      });

      if (resendResponse.ok) {
        const resendData = await resendResponse.json();
        resendDomainId = resendData.id;
      }
    } catch (error) {
      console.error('Error creating domain in Resend:', error);
      // Continue without Resend integration
    }

    // Add domain to our database
    const { data: newDomain, error } = await supabase
      .from('mailbox_domains')
      .insert({
        tenant_id: profile.tenant_id,
        domain: domain,
        verified: false,
        mx_records_configured: false,
        spf_configured: false,
        dkim_configured: false,
        resend_domain_id: resendDomainId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding domain:', error);
      return NextResponse.json({ error: 'Failed to add domain' }, { status: 500 });
    }

    return NextResponse.json(newDomain);
  } catch (error) {
    console.error('Error in domains POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 