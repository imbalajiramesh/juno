'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { IconCreditCard, IconLoader2, IconReceipt } from '@tabler/icons-react';

interface StripeCheckoutFormProps {
  packageId?: string;
  customAmount?: number;
  customCredits?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function StripeCheckoutForm({ 
  packageId, 
  customAmount, 
  customCredits, 
  onSuccess, 
  onCancel 
}: StripeCheckoutFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/stripe/create-checkout-session', {
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
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <IconCreditCard className="mr-2 h-5 w-5" />
          Secure Checkout
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <IconReceipt className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">Pricing Information</p>
              <p className="text-blue-700">
                {process.env.NEXT_PUBLIC_TAX_ENABLED === 'true' ? (
                  <>
                    Taxes will be calculated automatically based on your location during checkout.
                    You'll see the final amount including any applicable taxes before confirming payment.
                  </>
                ) : (
                  <>
                    Currently showing base prices without tax calculation.
                    Tax collection will be enabled as we expand to new markets.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">What happens next:</h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-center">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">1</span>
              You'll be redirected to Stripe's secure checkout page
            </li>
            <li className="flex items-center">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">2</span>
              Enter your billing address for tax calculation
            </li>
            <li className="flex items-center">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">3</span>
              Review the final amount including taxes
            </li>
            <li className="flex items-center">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">4</span>
              Complete payment and return to your dashboard
            </li>
          </ul>
        </div>

        <div className="flex space-x-3 pt-4">
          <Button
            onClick={handleCheckout}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating checkout...
              </>
            ) : (
              <>
                <IconCreditCard className="mr-2 h-4 w-4" />
                Proceed to Checkout
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p>🔒 Secured by Stripe • Your payment information is encrypted and secure</p>
          <p className="mt-1">💳 Supports all major credit cards • Save payment methods for future use</p>
        </div>
      </CardContent>
    </Card>
  );
} 