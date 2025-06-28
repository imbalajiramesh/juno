// Auto-verification for Twilio 10DLC compliance
// Simplified to focus on brand registration and campaign setup only

export interface BrandRegistrationData {
  business_name: string;
  business_website: string;
  business_type: 'sole_proprietor' | 'corporation' | 'llc' | 'partnership' | 'non_profit';
  business_industry: string;
  business_description: string;
  tax_id?: string;
  phone: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  volume_tier: 'low' | 'high'; // Determines pricing: 800 vs 10,000 credits
}

export interface CampaignRegistrationData {
  brand_id: string;
  campaign_type: 'customer_care' | 'marketing' | 'mixed' | 'notifications' | 'surveys';
  campaign_description: string;
  sample_messages: string[];
  opt_in_process: string;
  opt_out_process: string;
  help_keywords?: string[];
  volume_tier: 'low' | 'standard'; // Determines monthly cost: 400 vs 2,500 credits
}

/**
 * Check if organization is eligible for auto-verification
 */
export async function checkAutoVerificationEligibility(organizationId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/organization/check-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organization_id: organizationId })
    });

    if (!response.ok) return false;
    
    const data = await response.json();
    return data.approved === true && data.has_documents === true;
  } catch (error) {
    console.error('Error checking auto-verification eligibility:', error);
    return false;
  }
}

/**
 * Extract business information from approved organization data
 */
export function extractBusinessInfoFromOrganization(orgData: any): Partial<BrandRegistrationData> {
  return {
    business_name: orgData.business_name || orgData.name,
    business_website: orgData.website || `https://${orgData.name?.toLowerCase().replace(/\s+/g, '')}.com`,
    business_type: mapBusinessType(orgData.business_type),
    business_industry: orgData.industry || 'Professional Services',
    business_description: orgData.description || `${orgData.name} - Professional business services`,
    tax_id: orgData.tax_id || orgData.ein,
    phone: orgData.phone,
    email: orgData.email,
    address: {
      street: orgData.address?.street || orgData.street_address,
      city: orgData.address?.city || orgData.city,
      state: orgData.address?.state || orgData.state,
      postal_code: orgData.address?.postal_code || orgData.zip_code,
      country: orgData.address?.country || 'US'
    },
    volume_tier: determineVolumeTier(orgData)
  };
}

/**
 * Submit brand registration automatically using organization data
 */
export async function autoSubmitBrandRegistration(
  organizationData: any,
  overrides: Partial<BrandRegistrationData> = {}
): Promise<{ success: boolean; brand_id?: string; error?: string }> {
  try {
    const businessInfo = extractBusinessInfoFromOrganization(organizationData);
    const registrationData: BrandRegistrationData = {
      ...businessInfo,
      ...overrides
    } as BrandRegistrationData;

    // Validate required fields
    const validation = validateBrandRegistrationData(registrationData);
    if (!validation.valid) {
      return { success: false, error: `Validation failed: ${validation.errors.join(', ')}` };
    }

    const response = await fetch('/api/twilio/brand-registration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...registrationData,
        auto_submit: true,
        organization_id: organizationData.id
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.error || 'Brand registration failed' };
    }

    const result = await response.json();
    return { success: true, brand_id: result.brand_id };

  } catch (error) {
    console.error('Auto brand registration error:', error);
    return { success: false, error: 'Network error during brand registration' };
  }
}

/**
 * Submit campaign registration after brand approval
 */
export async function autoSubmitCampaignRegistration(
  brandId: string,
  campaignData: Partial<CampaignRegistrationData> = {}
): Promise<{ success: boolean; campaign_id?: string; error?: string }> {
  try {
    const defaultCampaignData: CampaignRegistrationData = {
      brand_id: brandId,
      campaign_type: 'mixed',
      campaign_description: 'Business messaging for customer communications, notifications, and support',
      sample_messages: [
        'Your appointment is scheduled for tomorrow at 2 PM. Reply STOP to opt out.',
        'Thank you for your business! Your service is complete. Reply STOP to opt out.',
        'Reminder: Your payment is due tomorrow. Reply STOP to opt out.'
      ],
      opt_in_process: 'Customers opt-in by providing their phone number during service signup or by texting START to our number',
      opt_out_process: 'Customers can opt-out by replying STOP to any message or contacting customer service',
      help_keywords: ['HELP', 'INFO', 'SUPPORT'],
      volume_tier: 'low',
      ...campaignData
    };

    const response = await fetch('/api/twilio/campaign-registration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...defaultCampaignData,
        auto_submit: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.error || 'Campaign registration failed' };
    }

    const result = await response.json();
    return { success: true, campaign_id: result.campaign_id };

  } catch (error) {
    console.error('Auto campaign registration error:', error);
    return { success: false, error: 'Network error during campaign registration' };
  }
}

// Helper functions
function mapBusinessType(orgType: string): BrandRegistrationData['business_type'] {
  const typeMap: Record<string, BrandRegistrationData['business_type']> = {
    'sole_proprietorship': 'sole_proprietor',
    'corporation': 'corporation',
    'llc': 'llc',
    'partnership': 'partnership',
    'nonprofit': 'non_profit'
  };
  return typeMap[orgType?.toLowerCase()] || 'corporation';
}

function determineVolumeTier(orgData: any): 'low' | 'high' {
  // Determine based on organization size, employees, or explicit preference
  const employees = orgData.employee_count || 0;
  const isEnterprise = orgData.plan_tier === 'enterprise';
  
  return (employees > 50 || isEnterprise) ? 'high' : 'low';
}

function validateBrandRegistrationData(data: BrandRegistrationData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.business_name) errors.push('Business name is required');
  if (!data.business_website) errors.push('Business website is required');
  if (!data.phone) errors.push('Business phone is required');
  if (!data.email) errors.push('Business email is required');
  if (!data.address?.street) errors.push('Business address is required');
  if (!data.address?.city) errors.push('Business city is required');
  if (!data.address?.state) errors.push('Business state is required');
  if (!data.address?.postal_code) errors.push('Business postal code is required');

  return { valid: errors.length === 0, errors };
}

export const VERIFICATION_COSTS = {
  BRAND_REGISTRATION_LOW: 800,    // $8.00 with 100% markup from $4.00
  BRAND_REGISTRATION_HIGH: 10000, // $100.00 with 108% markup from $48.00  
  CAMPAIGN_SETUP: 4000,           // $40.00 with 167% markup from $15.00 (includes expedited processing)
  MONTHLY_CAMPAIGN_LOW: 400,      // $4.00 with 100%+ markup from $1.50-2.00
  MONTHLY_CAMPAIGN_STANDARD: 2500 // $25.00 with 108%+ markup from $10-12.00
} as const; 