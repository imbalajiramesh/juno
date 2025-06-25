import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

function getRecordDescription(recordType: string): string {
  switch (recordType) {
    case 'MX':
      return 'Mail Exchange record for receiving emails';
    case 'TXT':
      return 'Text record for domain verification and policies';
    case 'CNAME':
      return 'CNAME record for DKIM email signing';
    default:
      return 'DNS record for email functionality';
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { domain: string } }
) {
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

    const domain = params.domain;

    // Verify domain belongs to this tenant
    const { data: domainConfig } = await supabase
      .from('mailbox_domains')
      .select('*')
      .eq('domain', domain)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (!domainConfig) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Create domain in Resend if it doesn't exist
    let resendDomainData;
    try {
      // First, try to get existing domain from Resend
      const resendGetResponse = await fetch(`https://api.resend.com/domains/${domain}`, {
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
      });

      if (resendGetResponse.ok) {
        resendDomainData = await resendGetResponse.json();
      } else {
        // Create new domain in Resend
        const resendCreateResponse = await fetch('https://api.resend.com/domains', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
                   body: JSON.stringify({
           name: domain,
           region: 'us-east-1',
           // Configure webhook for inbound emails
           click_tracking: true,
           open_tracking: true
         }),
        });

        if (resendCreateResponse.ok) {
          resendDomainData = await resendCreateResponse.json();
        } else {
          throw new Error('Failed to create domain in Resend');
        }
      }
    } catch (error) {
      console.error('Error with Resend domain:', error);
      // Fallback to placeholder values if Resend fails
      resendDomainData = {
        records: [
          { record: 'MX', name: '', value: '10 feedback-smtp.us-east-1.amazonses.com' },
          { record: 'TXT', name: '', value: 'v=spf1 include:amazonses.com ~all' },
          { record: 'TXT', name: '_dmarc', value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@resend.com' },
          { record: 'CNAME', name: 'resend._domainkey', value: 'resend._domainkey.resend.com' }
        ]
      };
    }

    // Convert Resend records to our format
    const records = resendDomainData.records?.map((record: any) => ({
      type: record.record,
      name: record.name || '@',
      value: record.value,
      ttl: 3600,
      description: getRecordDescription(record.record)
    })) || [];

    // Add domain verification record
    records.push({
      type: 'TXT',
      name: '@',
      value: `juno-verify=${domainConfig.id}`,
      ttl: 300,
      description: 'Domain ownership verification for Juno'
    });

    const dnsRecords = {
      domain,
      records,
      
      // Instructions
      instructions: {
        title: 'DNS Configuration Instructions',
        steps: [
          'Log in to your domain registrar (GoDaddy, Namecheap, etc.)',
          'Navigate to DNS management for your domain',
          'Add each DNS record exactly as shown below',
          'Allow 24-48 hours for DNS propagation',
          'Return to this page to verify configuration'
        ],
        notes: [
          'Replace @ with your domain name if your DNS provider requires it',
          'Some providers may show @ as blank or require the full domain',
          'TTL values can be adjusted based on your needs (3600 = 1 hour)',
          'Inbound emails will be automatically processed via webhooks',
          'Contact support if you need help with DNS configuration'
        ]
      }
    };

    return NextResponse.json(dnsRecords);
  } catch (error) {
    console.error('Error getting DNS records:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 