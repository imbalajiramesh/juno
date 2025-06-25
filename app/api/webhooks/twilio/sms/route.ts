import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import twilio from 'twilio';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract Twilio webhook data
    const messageData = {
      MessageSid: formData.get('MessageSid') as string,
      From: formData.get('From') as string,
      To: formData.get('To') as string,
      Body: formData.get('Body') as string,
      MessageStatus: formData.get('MessageStatus') as string,
      AccountSid: formData.get('AccountSid') as string,
    };

    console.log('Received SMS webhook:', messageData);

    // Validate webhook authenticity (recommended for production)
    const twilioSignature = request.headers.get('x-twilio-signature');
    if (process.env.TWILIO_AUTH_TOKEN && twilioSignature) {
      const requestUrl = request.url;
      const params = Object.fromEntries(formData.entries());
      
      const isValid = twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN,
        twilioSignature,
        requestUrl,
        params
      );
      
      if (!isValid) {
        console.error('Invalid Twilio signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const supabase = await createClient();

    // Find the tenant by phone number (the 'To' field is the receiving number)
    const { data: phoneNumber, error: phoneError } = await supabase
      .from('tenant_phone_numbers')
      .select('id, tenant_id, phone_number')
      .eq('phone_number', messageData.To)
      .eq('status', 'active')
      .single();

    if (phoneError || !phoneNumber) {
      console.error('Phone number not found or inactive:', messageData.To);
      return NextResponse.json({ 
        error: 'Phone number not found',
        message: 'This number is not configured for SMS reception'
      }, { status: 404 });
    }

    // Get SMS receive pricing
    const { data: pricing, error: pricingError } = await supabase
      .from('pricing_config')
      .select('credits_per_unit')
      .eq('service_type', 'sms_receive')
      .eq('is_active', true)
      .single();

    if (pricingError) {
      console.error('Error fetching SMS receive pricing:', pricingError);
      // Continue processing but don't charge credits
    }

    const receiveCredits = pricing?.credits_per_unit || 1;

    // Check if tenant has sufficient credits
    const { data: currentBalance } = await supabase
      .rpc('get_tenant_credit_balance', { tenant_id_param: phoneNumber.tenant_id });

    const balance = currentBalance || 0;
    
    if (balance >= receiveCredits) {
      // Deduct credits for receiving SMS
      const { error: creditError } = await supabase
        .rpc('update_credits', {
          tenant_id_param: phoneNumber.tenant_id,
          amount_param: -receiveCredits,
          transaction_type_param: 'sms_charge',
          description_param: `SMS received from ${messageData.From}`,
          reference_id_param: messageData.MessageSid
        });

      if (creditError) {
        console.error('Error deducting SMS receive credits:', creditError);
      }
    } else {
      console.warn(`Insufficient credits for SMS receive (tenant: ${phoneNumber.tenant_id}, balance: ${balance})`);
      // You might want to suspend SMS reception or send a notification here
    }

    // Log the received SMS
    const { error: logError } = await supabase
      .from('sms_logs')
      .insert({
        tenant_id: phoneNumber.tenant_id,
        twilio_sid: messageData.MessageSid,
        from_number: messageData.From,
        to_number: messageData.To,
        message_body: messageData.Body,
        status: messageData.MessageStatus,
        direction: 'inbound',
        credits_charged: balance >= receiveCredits ? receiveCredits : 0,
        received_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Error logging received SMS:', logError);
    }

    // Optional: Trigger any automated responses or notifications here
    // For example, you could:
    // - Forward the SMS to email
    // - Trigger a webhook to your application
    // - Store in a customer conversation thread

    console.log(`SMS processed successfully: ${messageData.MessageSid}`);

    // Return TwiML response (optional - you can return empty or specific instructions)
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
       <Response>
         <Message>Thank you for your message. We have received it and will respond soon.</Message>
       </Response>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );

  } catch (error) {
    console.error('Error processing SMS webhook:', error);
    return NextResponse.json({ 
      error: 'Failed to process SMS webhook',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 