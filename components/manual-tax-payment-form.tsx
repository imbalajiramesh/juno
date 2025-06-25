'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { IconCreditCard, IconLoader2, IconReceipt, IconMapPin } from '@tabler/icons-react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripeClient } from '@/lib/stripe-client';

interface TaxCalculation {
  subtotal: number;
  taxAmount: number;
  total: number;
  taxRate: number;
  taxName: string;
  currency: string;
}

interface TaxDisplay {
  subtotalDisplay: string;
  taxDisplay: string;
  totalDisplay: string;
  breakdown: string[];
}

interface ManualTaxPaymentFormProps {
  packageId?: string;
  customAmount?: number;
  customCredits?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

function PaymentForm({ 
  packageId, 
  customAmount, 
  customCredits, 
  onSuccess, 
  onCancel 
}: ManualTaxPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [taxCalculation, setTaxCalculation] = useState<TaxCalculation | null>(null);
  const [taxDisplay, setTaxDisplay] = useState<TaxDisplay | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');

  useEffect(() => {
    createPaymentIntent();
  }, [packageId, customAmount, customCredits]);

  const createPaymentIntent = async () => {
    try {
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId,
          useCustomAmount: !!customAmount,
          customAmount,
          customCredits,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment intent');
      }

      setClientSecret(data.clientSecret);
      setTaxCalculation(data.taxCalculation);
      setTaxDisplay(data.display);
    } catch (error) {
      console.error('Error creating payment intent:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create payment intent');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsLoading(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (paymentIntent.status === 'succeeded') {
        toast.success('Payment successful! Credits have been added to your account.');
        onSuccess?.();
      }
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!taxCalculation || !taxDisplay) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <IconLoader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Calculating tax...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <IconCreditCard className="mr-2 h-5 w-5" />
          Complete Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tax Breakdown */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <IconReceipt className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-blue-900 mb-2">Price Breakdown</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{taxDisplay.subtotalDisplay}</span>
                </div>
                <div className="flex justify-between">
                  <span>{taxCalculation.taxName} ({(taxCalculation.taxRate * 100).toFixed(0)}%):</span>
                  <span>{taxDisplay.taxDisplay}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Total:</span>
                  <span>{taxDisplay.totalDisplay}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

                 {/* Business Info */}
         <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
           <div className="flex items-start space-x-3">
             <IconMapPin className="h-5 w-5 text-gray-600 mt-0.5" />
             <div className="text-sm">
               <p className="font-medium text-gray-900 mb-1">Tax Collection & Payment</p>
               <p className="text-gray-700">
                 Ontario HST (13%) is collected in USD equivalent.
                 Your payment method will be securely saved for future purchases.
                 You will receive a tax-compliant receipt for your records.
               </p>
             </div>
           </div>
         </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <label className="block text-sm font-medium mb-2">
              Card Information
            </label>
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                },
              }}
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="submit"
              disabled={!stripe || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <IconCreditCard className="mr-2 h-4 w-4" />
                  Pay {taxDisplay.totalDisplay}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>

                          <div className="text-xs text-muted-foreground pt-2 border-t">
           <p>🔒 Secured by Stripe • Your payment information is encrypted and secure</p>
           <p className="mt-1">🧾 Tax-compliant receipts • Ontario HST collected in USD</p>
           <p className="mt-1">💳 Payment method will be saved for future purchases</p>
         </div>
      </CardContent>
    </Card>
  );
}

export default function ManualTaxPaymentForm(props: ManualTaxPaymentFormProps) {
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);

  useEffect(() => {
    setStripePromise(getStripeClient());
  }, []);

  if (!stripePromise) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <IconLoader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading payment form...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  );
} 