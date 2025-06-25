import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withTenant } from '@/lib/get-tenant';

// Predefined field suggestions by industry
const industryFieldMappings = {
  'Healthcare': [
    {
      name: 'medical_record_number',
      label: 'Medical Record Number',
      type: 'string' as const,
      required: false,
      description: 'Patient medical record identifier'
    },
    {
      name: 'insurance_provider',
      label: 'Insurance Provider',
      type: 'select' as const,
      required: false,
      options: ['Blue Cross', 'Aetna', 'United Healthcare', 'Cigna', 'Kaiser', 'Other'],
      description: 'Primary health insurance provider'
    },
    {
      name: 'date_of_birth',
      label: 'Date of Birth',
      type: 'date' as const,
      required: true,
      description: 'Patient date of birth'
    },
    {
      name: 'emergency_contact',
      label: 'Emergency Contact',
      type: 'string' as const,
      required: false,
      description: 'Emergency contact information'
    }
  ],
  'Energy & Utilities': [
    {
      name: 'meter_number',
      label: 'Meter Number',
      type: 'string' as const,
      required: false,
      description: 'Utility meter identification number'
    },
    {
      name: 'hydro_bill',
      label: 'Hydro Bill',
      type: 'number' as const,
      required: false,
      description: 'Monthly hydro/electricity bill amount'
    },
    {
      name: 'gas_bill',
      label: 'Gas Bill', 
      type: 'number' as const,
      required: false,
      description: 'Monthly gas bill amount'
    },
    {
      name: 'home_age',
      label: 'Home Age',
      type: 'string' as const,
      required: false,
      description: 'Age of the home/property'
    },
    {
      name: 'attic_insulation',
      label: 'Attic Insulation',
      type: 'string' as const,
      required: false,
      description: 'Type or condition of attic insulation'
    },
    {
      name: 'ac_age',
      label: 'AC Age',
      type: 'string' as const,
      required: false,
      description: 'Age of air conditioning system'
    },
    {
      name: 'furnace_age',
      label: 'Furnace Age',
      type: 'string' as const,
      required: false,
      description: 'Age of furnace/heating system'
    },
    {
      name: 'water_heater_age',
      label: 'Water Heater Age',
      type: 'string' as const,
      required: false,
      description: 'Age of water heater'
    },
    {
      name: 'solar_panels',
      label: 'Has Solar Panels',
      type: 'boolean' as const,
      required: false,
      description: 'Whether the property has solar panel installation'
    },
    {
      name: 'home_type',
      label: 'Home Type',
      type: 'select' as const,
      required: false,
      options: ['Single Family', 'Townhouse', 'Condo', 'Apartment', 'Mobile Home'],
      description: 'Type of residential property'
    },
    {
      name: 'square_footage',
      label: 'Square Footage',
      type: 'number' as const,
      required: false,
      description: 'Total square footage of the property'
    }
  ],
  'Real Estate': [
    {
      name: 'property_type',
      label: 'Property Type',
      type: 'select' as const,
      required: true,
      options: ['Residential', 'Commercial', 'Industrial', 'Land', 'Multi-Family'],
      description: 'Type of property'
    },
    {
      name: 'listing_price',
      label: 'Listing Price',
      type: 'number' as const,
      required: false,
      description: 'Property listing price'
    },
    {
      name: 'bedrooms',
      label: 'Bedrooms',
      type: 'number' as const,
      required: false,
      description: 'Number of bedrooms'
    },
    {
      name: 'bathrooms',
      label: 'Bathrooms',
      type: 'number' as const,
      required: false,
      description: 'Number of bathrooms'
    },
    {
      name: 'year_built',
      label: 'Year Built',
      type: 'number' as const,
      required: false,
      description: 'Year the property was built'
    }
  ],
  'Financial Services': [
    {
      name: 'account_number',
      label: 'Account Number',
      type: 'string' as const,
      required: false,
      description: 'Customer account number'
    },
    {
      name: 'credit_score',
      label: 'Credit Score',
      type: 'number' as const,
      required: false,
      description: 'Customer credit score'
    },
    {
      name: 'annual_income',
      label: 'Annual Income',
      type: 'number' as const,
      required: false,
      description: 'Customer annual income'
    },
    {
      name: 'risk_tolerance',
      label: 'Risk Tolerance',
      type: 'select' as const,
      required: false,
      options: ['Conservative', 'Moderate', 'Aggressive'],
      description: 'Investment risk tolerance level'
    }
  ],
  'Retail & E-commerce': [
    {
      name: 'customer_segment',
      label: 'Customer Segment',
      type: 'select' as const,
      required: false,
      options: ['VIP', 'Regular', 'New', 'Returning'],
      description: 'Customer segmentation category'
    },
    {
      name: 'lifetime_value',
      label: 'Lifetime Value',
      type: 'number' as const,
      required: false,
      description: 'Customer lifetime value'
    },
    {
      name: 'last_purchase_date',
      label: 'Last Purchase Date',
      type: 'date' as const,
      required: false,
      description: 'Date of last purchase'
    },
    {
      name: 'preferred_categories',
      label: 'Preferred Categories',
      type: 'string' as const,
      required: false,
      description: 'Customer preferred product categories'
    }
  ]
};

// Default fields for industries not specifically mapped
const defaultFields = [
  {
    name: 'company_size',
    label: 'Company Size',
    type: 'select' as const,
    required: false,
    options: ['1-10', '11-50', '51-200', '201-500', '500+'],
    description: 'Size of the customer organization'
  },
  {
    name: 'budget_range',
    label: 'Budget Range',
    type: 'select' as const,
    required: false,
    options: ['Under $1K', '$1K-$5K', '$5K-$25K', '$25K-$100K', '$100K+'],
    description: 'Customer budget range'
  },
  {
    name: 'priority_level',
    label: 'Priority Level',
    type: 'select' as const,
    required: false,
    options: ['Low', 'Medium', 'High', 'Critical'],
    description: 'Customer priority level'
  },
  {
    name: 'lead_source',
    label: 'Lead Source',
    type: 'select' as const,
    required: false,
    options: ['Website', 'Referral', 'Social Media', 'Email Campaign', 'Cold Call', 'Trade Show'],
    description: 'Source of the lead'
  }
];

export const POST = withTenant(async (tenantId: string, req: NextRequest) => {
  const supabase = await createClient();
  
  try {
    // Get organization details to determine industry
    const { data: organization, error } = await supabase
      .from('tenants')
      .select('industry, description')
      .eq('id', tenantId)
      .single();

    if (error) throw error;

    const industry = organization.industry;
    
    // Get industry-specific fields or use defaults
    const industryFields = industryFieldMappings[industry as keyof typeof industryFieldMappings] || defaultFields;
    
    // Always include some common fields
    const commonFields = [
      {
        name: 'lead_score',
        label: 'Lead Score',
        type: 'number' as const,
        required: false,
        description: 'Scoring system for lead quality'
      },
      {
        name: 'next_follow_up',
        label: 'Next Follow-up Date',
        type: 'date' as const,
        required: false,
        description: 'Scheduled next follow-up date'
      }
    ];

    const allFields = [...industryFields, ...commonFields];

    return NextResponse.json({ 
      success: true, 
      fields: allFields,
      industry: industry
    });

  } catch (error) {
    console.error('Error generating AI fields:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI field suggestions' },
      { status: 500 }
    );
  }
}); 