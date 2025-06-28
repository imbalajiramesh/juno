import { createClient } from '@/utils/supabase/server';

interface ProvisioningResult {
  success: boolean;
  vapiOrgId?: string;
  twilioSubaccountSid?: string;
  resendDomainId?: string;
  errors: string[];
}

/**
 * Provisions external accounts (VAPI, Twilio, Resend) for an approved organization
 */
export async function provisionExternalAccounts(tenantId: string): Promise<ProvisioningResult> {
  const result: ProvisioningResult = {
    success: false,
    errors: []
  };

  try {
    const supabase = await createClient();
    
    // Get tenant information
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      result.errors.push('Failed to fetch tenant information');
      return result;
    }

    const tenantData = tenant as any;

    // 1. Create VAPI Organization
    try {
      if (process.env.VAPI_API_KEY && !tenantData.vapi_org_id) {
        result.vapiOrgId = await createVapiOrganization(tenantData.name, tenantId);
        console.log('✅ Created VAPI organization:', result.vapiOrgId);
      } else if (tenantData.vapi_org_id) {
        result.vapiOrgId = tenantData.vapi_org_id;
        console.log('✅ VAPI organization already exists:', result.vapiOrgId);
      }
    } catch (error) {
      console.error('❌ VAPI organization creation failed:', error);
      result.errors.push(`VAPI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 2. Create Twilio Subaccount
    try {
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && !tenantData.twilio_subaccount_sid) {
        result.twilioSubaccountSid = await createTwilioSubaccount(tenantData.name);
        console.log('✅ Created Twilio subaccount:', result.twilioSubaccountSid);
      } else if (tenantData.twilio_subaccount_sid) {
        result.twilioSubaccountSid = tenantData.twilio_subaccount_sid;
        console.log('✅ Twilio subaccount already exists:', result.twilioSubaccountSid);
      }
    } catch (error) {
      console.error('❌ Twilio subaccount creation failed:', error);
      result.errors.push(`Twilio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 3. Create Resend Domain (optional - for custom email domains)
    try {
      if (process.env.RESEND_API_KEY && !tenantData.resend_domain_id) {
        result.resendDomainId = await createResendDomain(tenantData.name, tenantId);
        console.log('✅ Created Resend domain:', result.resendDomainId);
      } else if (tenantData.resend_domain_id) {
        result.resendDomainId = tenantData.resend_domain_id;
        console.log('✅ Resend domain already exists:', result.resendDomainId);
      }
    } catch (error) {
      console.error('❌ Resend domain creation failed:', error);
      result.errors.push(`Resend: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 4. Update tenant with external account IDs
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (result.vapiOrgId) updateData.vapi_org_id = result.vapiOrgId;
    if (result.twilioSubaccountSid) updateData.twilio_subaccount_sid = result.twilioSubaccountSid;
    if (result.resendDomainId) updateData.resend_domain_id = result.resendDomainId;

    const { error: updateError } = await supabase
      .from('tenants')
      .update(updateData)
      .eq('id', tenantId);

    if (updateError) {
      console.error('❌ Failed to update tenant with external account IDs:', updateError);
      result.errors.push('Failed to update tenant record');
    }

    // Consider it successful if at least one account was created and tenant was updated
    result.success = (result.vapiOrgId || result.twilioSubaccountSid) && !updateError;

    return result;

  } catch (error) {
    console.error('❌ External account provisioning failed:', error);
    result.errors.push(`System error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Creates a VAPI organization for the tenant
 */
async function createVapiOrganization(tenantName: string, tenantId: string): Promise<string> {
  const vapiToken = process.env.VAPI_API_KEY;
  if (!vapiToken) {
    throw new Error('VAPI API key not configured');
  }

  const orgPayload = {
    name: `${tenantName} Organization`,
    hipaaEnabled: false, // Set based on your requirements
  };

  const response = await fetch('https://api.vapi.ai/org', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vapiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orgPayload),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`VAPI API error: ${response.status} - ${errorData}`);
  }

  const result = await response.json();
  return result.id;
}

/**
 * Creates a Twilio subaccount for the tenant
 */
async function createTwilioSubaccount(tenantName: string): Promise<string> {
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

  if (!twilioAccountSid || !twilioAuthToken) {
    throw new Error('Twilio credentials not configured');
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Accounts.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      FriendlyName: `${tenantName} Subaccount`
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Twilio API error: ${response.status} - ${errorData}`);
  }

  const result = await response.json();
  return result.sid;
}

/**
 * Creates a Resend domain for the tenant (optional)
 */
async function createResendDomain(tenantName: string, tenantId: string): Promise<string> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error('Resend API key not configured');
  }

  // Create a subdomain based on tenant name/ID
  const sanitizedName = tenantName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const domainName = `${sanitizedName}-${tenantId.slice(0, 8)}.yourdomain.com`;

  const response = await fetch('https://api.resend.com/domains', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: domainName,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${errorData}`);
  }

  const result = await response.json();
  return result.id;
}

/**
 * Checks if external accounts have been provisioned for a tenant
 */
export async function checkProvisioningStatus(tenantId: string): Promise<{
  isProvisioned: boolean;
  vapiOrg: boolean;
  twilioSubaccount: boolean;
  resendDomain: boolean;
}> {
  try {
    const supabase = await createClient();
    
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('vapi_org_id, twilio_subaccount_sid, resend_domain_id')
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      return {
        isProvisioned: false,
        vapiOrg: false,
        twilioSubaccount: false,
        resendDomain: false
      };
    }

    const tenantData = tenant as any;
    const vapiOrg = !!tenantData.vapi_org_id;
    const twilioSubaccount = !!tenantData.twilio_subaccount_sid;
    const resendDomain = !!tenantData.resend_domain_id;

    return {
      isProvisioned: vapiOrg && twilioSubaccount, // Resend is optional
      vapiOrg,
      twilioSubaccount,
      resendDomain
    };

  } catch (error) {
    console.error('Error checking provisioning status:', error);
    return {
      isProvisioned: false,
      vapiOrg: false,
      twilioSubaccount: false,
      resendDomain: false
    };
  }
} 