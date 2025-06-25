import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenant } from '@/lib/get-tenant';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const areaCode = searchParams.get('areaCode');
    const country = searchParams.get('country') || 'US';

    if (!areaCode) {
      return NextResponse.json({ error: 'Area code is required' }, { status: 400 });
    }

    // Validate area code format (should be 3 digits)
    if (!/^\d{3}$/.test(areaCode)) {
      return NextResponse.json({ error: 'Area code must be 3 digits' }, { status: 400 });
    }

    // Get tenant information
    const { tenant } = await getCurrentTenant();

    // Search for available phone numbers using Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return NextResponse.json({ error: 'Twilio configuration missing' }, { status: 500 });
    }

    const client = require('twilio')(accountSid, authToken);

    try {
      // Search for local phone numbers in the specified area code
      const availableNumbers = await client.availablePhoneNumbers(country).local.list({
        areaCode: areaCode,
        limit: 10, // Limit to 10 results for better UX
      });

      const formattedNumbers = availableNumbers.map((number: any) => ({
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName,
        locality: number.locality,
        region: number.region,
        capabilities: [
          ...(number.capabilities.voice ? ['Voice'] : []),
          ...(number.capabilities.sms ? ['SMS'] : []),
          ...(number.capabilities.mms ? ['MMS'] : []),
        ],
      }));

      return NextResponse.json({ 
        numbers: formattedNumbers,
        areaCode,
        country 
      });
    } catch (twilioError: any) {
      console.error('Twilio API error:', twilioError);
      
      if (twilioError.code === 21452) {
        return NextResponse.json({ 
          error: 'No numbers available in this area code',
          numbers: []
        }, { status: 200 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to search phone numbers',
        details: twilioError.message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in phone number search API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 