import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { customerName, phoneNumber, additionalContext, customerId } = await request.json();

    // Call the Make.com webhook
    const response = await fetch('https://hook.us1.make.com/awphjup4uk6kd22bnrl9jx1be3ufl7pu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerName,
        phoneNumber,
        additionalContext: additionalContext?.trim() || null,
        customerId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create call request');
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating call request:', error);
    return NextResponse.json(
      { error: 'Failed to create call request' },
      { status: 500 }
    );
  }
} 