'use client';

import { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripeClient, isStripeConfigured, getStripePublishableKey } from '@/lib/stripe-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  IconCreditCard, 
  IconPlus, 
  IconTrash, 
  IconStar, 
  IconStarFilled,
  IconLoader2 
} from '@tabler/icons-react';

interface PaymentMethod {
  id: string;
  stripe_payment_method_id: string;
  card_brand: string;
  card_last4: string;
  card_exp_month: number;
  card_exp_year: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

interface PaymentMethodsProps {
  onCardAdded?: () => void;
}

// Use the robust Stripe client utility
const getStripeInstance = () => {
  return getStripeClient();
};

function AddCardForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      toast.error('Payment system not ready. Please try again.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/settings/credits`,
        },
      });

      if (error) {
        console.error('Setup failed:', error);
        toast.error(error.message || 'Failed to save card');
      } else {
        toast.success('Card saved successfully!');
        onSuccess();
      }
    } catch (error) {
      console.error('Setup error:', error);
      toast.error('Failed to save card');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <div className="flex space-x-3">
        <Button
          type="submit"
          disabled={!stripe || isLoading}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <IconCreditCard className="mr-2 h-4 w-4" />
              Save Card
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function PaymentMethods({ onCardAdded }: PaymentMethodsProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [setupClientSecret, setSetupClientSecret] = useState('');
  const [isCreatingSetup, setIsCreatingSetup] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const [stripeInstance, setStripeInstance] = useState<any>(null);

  // Check if Stripe is configured and initialize
  useEffect(() => {
    const initializeStripe = async () => {
      try {
        const publishableKey = getStripePublishableKey();
        console.log('Stripe key check:', publishableKey ? 'Present' : 'Missing');
        
        if (isStripeConfigured()) {
          const stripe = await getStripeInstance();
          if (stripe) {
            setStripeInstance(stripe);
            setStripeReady(true);
            console.log('Stripe initialized successfully');
          } else {
            console.error('Failed to initialize Stripe');
          }
        } else {
          console.error('Stripe publishable key not found');
        }
      } catch (error) {
        console.error('Error initializing Stripe:', error);
      }
    };

    initializeStripe();
  }, []);

  useEffect(() => {
    if (stripeReady) {
      fetchPaymentMethods();
    }
  }, [stripeReady]);

  const fetchPaymentMethods = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/stripe/payment-methods');
      const data = await response.json();

      if (response.ok) {
        setPaymentMethods(data.paymentMethods || []);
      } else {
        console.error('Error fetching payment methods:', data.error);
        toast.error('Failed to load payment methods');
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast.error('Failed to load payment methods');
    } finally {
      setIsLoading(false);
    }
  };

  const createSetupIntent = async () => {
    try {
      setIsCreatingSetup(true);
      const response = await fetch('/api/stripe/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_setup_intent' }),
      });

      const data = await response.json();

      if (response.ok) {
        setSetupClientSecret(data.clientSecret);
        setShowAddCard(true);
      } else {
        toast.error(data.error || 'Failed to initialize card setup');
      }
    } catch (error) {
      console.error('Error creating setup intent:', error);
      toast.error('Failed to initialize card setup');
    } finally {
      setIsCreatingSetup(false);
    }
  };

  const setDefaultCard = async (paymentMethodId: string) => {
    try {
      const response = await fetch('/api/stripe/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'set_default', 
          paymentMethodId 
        }),
      });

      if (response.ok) {
        toast.success('Default payment method updated');
        fetchPaymentMethods();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to set default card');
      }
    } catch (error) {
      console.error('Error setting default card:', error);
      toast.error('Failed to set default card');
    }
  };

  const deleteCard = async (paymentMethodId: string) => {
    try {
      const response = await fetch(`/api/stripe/payment-methods?id=${paymentMethodId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Card removed successfully');
        fetchPaymentMethods();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to remove card');
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      toast.error('Failed to remove card');
    }
  };

  const getCardIcon = (brand: string) => {
    return <IconCreditCard className="h-5 w-5" />;
  };

  const formatCardBrand = (brand: string) => {
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  const handleAddCardSuccess = () => {
    setShowAddCard(false);
    setSetupClientSecret('');
    fetchPaymentMethods();
    onCardAdded?.();
  };

  // Show loading state while Stripe is initializing
  if (!stripeReady) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Initializing payment system...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show configuration error if Stripe is not set up
  if (!isStripeConfigured()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-amber-600">
            <IconCreditCard className="mr-2 h-5 w-5" />
            Payment Methods Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Payment method management requires Stripe configuration.
            </p>
            <p className="text-sm text-muted-foreground">
              Please contact your administrator to set up payment processing.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading payment methods...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <IconCreditCard className="mr-2 h-5 w-5" />
            Saved Payment Methods
          </CardTitle>
          <Button
            onClick={createSetupIntent}
            disabled={isCreatingSetup}
            size="sm"
          >
            {isCreatingSetup ? (
              <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <IconPlus className="mr-2 h-4 w-4" />
            )}
            Add Card
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentMethods.length === 0 ? (
          <div className="text-center py-8">
            <IconCreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No saved payment methods</p>
            <Button onClick={createSetupIntent} disabled={isCreatingSetup}>
              {isCreatingSetup ? (
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <IconPlus className="mr-2 h-4 w-4" />
              )}
              Add Your First Card
            </Button>
          </div>
        ) : (
          paymentMethods.map((method) => (
            <div
              key={method.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center space-x-3">
                {getCardIcon(method.card_brand)}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {formatCardBrand(method.card_brand)} ****{method.card_last4}
                    </span>
                    {method.is_default && (
                      <Badge variant="default" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Expires {method.card_exp_month.toString().padStart(2, '0')}/{method.card_exp_year}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDefaultCard(method.id)}
                  disabled={method.is_default}
                  title={method.is_default ? 'Already default' : 'Set as default'}
                >
                  {method.is_default ? (
                    <IconStarFilled className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <IconStar className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteCard(method.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Remove card"
                >
                  <IconTrash className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}

        <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Payment Method</DialogTitle>
            </DialogHeader>
            {setupClientSecret && stripeInstance && (
              <Elements
                stripe={stripeInstance}
                options={{
                  clientSecret: setupClientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#0f172a',
                      colorBackground: '#ffffff',
                      colorText: '#0f172a',
                      colorDanger: '#ef4444',
                      fontFamily: 'system-ui, sans-serif',
                      spacingUnit: '4px',
                      borderRadius: '6px',
                    },
                  },
                }}
              >
                <AddCardForm onSuccess={handleAddCardSuccess} />
              </Elements>
            )}
            {setupClientSecret && !stripeInstance && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Loading payment form...
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
} 