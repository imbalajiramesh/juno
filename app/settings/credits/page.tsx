'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IconCreditCard, IconPhone, IconMicrophone, IconMail, IconMessage, IconRefresh } from '@tabler/icons-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

// Lazy load Stripe components to avoid loading them before environment variables are available
const StripePaymentForm = dynamic(() => import('@/components/stripe-payment-form'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center py-8">Loading payment form...</div>
});

const StripeCheckoutForm = dynamic(() => import('@/components/stripe-checkout-form'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center py-8">Loading checkout form...</div>
});

const ManualTaxPaymentForm = dynamic(() => import('@/components/manual-tax-payment-form'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center py-8">Loading payment form...</div>
});

const PaymentMethods = dynamic(() => import('@/components/payment-methods'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center py-8">Loading payment methods...</div>
});

const AutoRechargeSettings = dynamic(() => import('@/components/auto-recharge-settings'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center py-8">Loading auto-recharge settings...</div>
});

interface CreditInfo {
  balance: number;
  transactions: Array<{
    id: string;
    transaction_type: string;
    amount: number;
    description: string;
    created_at: string;
  }>;
}

// Pricing constants for all communication services
const PRICING = {
  voice_calls: { credits: 25, unit: 'per minute', description: 'AI voice calls with customers' },
  phone_setup: { credits: 500, unit: 'one-time', description: 'Phone number setup fee' },
  phone_monthly: { credits: 100, unit: 'per month', description: 'Phone number rental' },
  email_send: { credits: 1, unit: 'per email', description: 'Professional email delivery' },
  sms_send: { credits: 5, unit: 'per SMS', description: 'Text message delivery' },
  sms_receive: { credits: 1, unit: 'per SMS', description: 'Incoming text messages' },
};

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_usd_cents: number;
  credits_per_dollar: number;
  is_popular: boolean;
  description: string;
}

interface PaymentMethod {
  id: string;
  card_brand: string;
  card_last4: string;
  card_exp_month: number;
  card_exp_year: number;
  is_default: boolean;
  is_active: boolean;
}

export default function CreditsPage() {
  const [credits, setCredits] = useState<CreditInfo>({ balance: 0, transactions: [] });
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('purchase');

  // Check if Stripe is configured
  const isStripeConfigured = typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  useEffect(() => {
    fetchCredits();
    fetchPackages();
    fetchPaymentMethods();
    
    // Handle checkout success/cancel from URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      toast.success('Payment successful! Credits have been added to your account.');
      // Clean up URL
      window.history.replaceState({}, '', '/settings/credits');
    } else if (urlParams.get('canceled') === 'true') {
      toast.error('Payment was canceled.');
      // Clean up URL
      window.history.replaceState({}, '', '/settings/credits');
    }
  }, []);

  const fetchCredits = async () => {
    try {
      const response = await fetch('/api/credits');
      if (response.ok) {
        const data = await response.json();
        setCredits(data);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await fetch('/api/credit-packages');
      if (response.ok) {
        const data = await response.json();
        setPackages(data);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/stripe/payment-methods');
      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data.paymentMethods || []);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const handlePurchaseCredits = (packageId: string) => {
    if (!isStripeConfigured) {
      toast.error('Payment processing is not configured. Please contact support.');
      return;
    }
    setSelectedPackage(packageId);
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    setSelectedPackage(null);
    fetchCredits();
    toast.success('Payment successful! Credits have been added to your account.');
  };

  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
    setSelectedPackage(null);
  };

  const handleDataRefresh = () => {
    fetchCredits();
    fetchPaymentMethods();
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'call_charge':
        return <IconMicrophone className="h-4 w-4" />;
      case 'phone_number_charge':
        return <IconPhone className="h-4 w-4" />;
      case 'email_charge':
        return <IconMail className="h-4 w-4" />;
      case 'sms_charge':
        return <IconMessage className="h-4 w-4" />;
      case 'purchase':
        return <IconCreditCard className="h-4 w-4" />;
      default:
        return <IconCreditCard className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Credits & Billing</h1>
        <p className="text-muted-foreground">
          Manage your communication credits, payment methods, and auto-recharge settings
        </p>
      </div>

      {/* Current Balance */}
      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-blue-100">Current Balance</h2>
              <div className="text-3xl font-bold">{credits.balance.toLocaleString()}</div>
              <p className="text-blue-100">Available credits</p>
            </div>
            <div className="text-right">
              <IconCreditCard className="h-12 w-12 text-blue-200" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="purchase">Purchase Credits</TabsTrigger>
                        <TabsTrigger value="cards">Payment Methods</TabsTrigger>
          <TabsTrigger value="auto-recharge">Auto-Recharge</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>

        {/* Purchase Credits Tab */}
        <TabsContent value="purchase" className="space-y-6">
          {!isStripeConfigured && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <IconCreditCard className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Payment Processing Not Configured
                    </p>
                    <p className="text-sm text-amber-700">
                      Stripe integration is not set up. Contact your administrator to enable credit purchases.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Purchase Credits</CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose a credit package to add to your account
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {packages.map((pkg) => (
                  <Card
                    key={pkg.id}
                    className={`relative cursor-pointer transition-all hover:scale-105 ${
                      pkg.is_popular ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
                    }`}
                  >
                    {pkg.is_popular && (
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                        <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                          Popular
                        </span>
                      </div>
                    )}
                    <CardContent className="pt-6 text-center">
                      <div className="text-2xl font-bold">{pkg.credits.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground mb-2">credits</div>
                      <div className="font-medium mb-1">{pkg.name}</div>
                      <div className="text-lg font-bold text-green-600 mb-1">
                        ${(pkg.price_usd_cents / 100).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground mb-4">{pkg.description}</div>
                      <div className="text-xs text-blue-600 mb-4">
                        {pkg.credits_per_dollar.toFixed(1)} credits per dollar
                      </div>
                      <Button
                        onClick={() => handlePurchaseCredits(pkg.id)}
                        className="w-full"
                        variant={pkg.is_popular ? 'default' : 'outline'}
                        disabled={!isStripeConfigured}
                      >
                        {isStripeConfigured ? 'Purchase Credits' : 'Payment Unavailable'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

                  {/* Payment Methods Tab */}
        <TabsContent value="cards">
                          <PaymentMethods onCardAdded={handleDataRefresh} />
        </TabsContent>

        {/* Auto-Recharge Tab */}
        <TabsContent value="auto-recharge">
          <AutoRechargeSettings 
            paymentMethods={paymentMethods} 
            onSettingsChange={handleDataRefresh}
          />
        </TabsContent>

        {/* Payment History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <p className="text-sm text-muted-foreground">
                View your recent Stripe payments and credit purchases
              </p>
            </CardHeader>
            <CardContent>
              {/* Payment history will be implemented later */}
              <div className="text-center py-8">
                <IconCreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Payment history coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pricing Information */}
      <Card>
        <CardHeader>
          <CardTitle>Communication Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Voice Calls */}
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="pt-6">
                <div className="flex items-center mb-3">
                  <IconMicrophone className="h-5 w-5 text-purple-600 mr-2" />
                  <h3 className="font-semibold text-purple-900">Voice Calls</h3>
                </div>
                <div className="text-2xl font-bold text-purple-900 mb-1">
                  {PRICING.voice_calls.credits}
                </div>
                <div className="text-sm text-purple-700 mb-2">credits {PRICING.voice_calls.unit}</div>
                <p className="text-xs text-purple-600">{PRICING.voice_calls.description}</p>
                <div className="mt-3 text-xs text-purple-600">
                  • 1-minute minimum billing
                  • Automatic transcription included
                  • AI-powered conversations
                </div>
              </CardContent>
            </Card>

            {/* Phone Numbers */}
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center mb-3">
                  <IconPhone className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="font-semibold text-green-900">Phone Numbers</h3>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="text-lg font-bold text-green-900">{PRICING.phone_setup.credits}</div>
                    <div className="text-xs text-green-700">credits setup fee</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-900">{PRICING.phone_monthly.credits}</div>
                    <div className="text-xs text-green-700">credits per month</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-green-600">
                  • Dedicated business numbers
                  • Voice agent integration
                  • Call routing included
                </div>
              </CardContent>
            </Card>

            {/* Email */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center mb-3">
                  <IconMail className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="font-semibold text-blue-900">Email</h3>
                </div>
                <div className="text-2xl font-bold text-blue-900 mb-1">
                  {PRICING.email_send.credits}
                </div>
                <div className="text-sm text-blue-700 mb-2">credits {PRICING.email_send.unit}</div>
                <p className="text-xs text-blue-600">{PRICING.email_send.description}</p>
                <div className="mt-3 text-xs text-blue-600">
                  • Professional email delivery
                  • High deliverability rates
                  • Template support
                </div>
              </CardContent>
            </Card>

            {/* SMS */}
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="pt-6">
                <div className="flex items-center mb-3">
                  <IconMessage className="h-5 w-5 text-orange-600 mr-2" />
                  <h3 className="font-semibold text-orange-900">SMS Messages</h3>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="text-lg font-bold text-orange-900">{PRICING.sms_send.credits}</div>
                    <div className="text-xs text-orange-700">credits per outbound SMS</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-orange-900">{PRICING.sms_receive.credits}</div>
                    <div className="text-xs text-orange-700">credits per inbound SMS</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-orange-600">
                  • Two-way messaging
                  • Global delivery
                  • Automated responses
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {credits.transactions.length === 0 ? (
              <div className="text-center py-8">
                <IconCreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">No transactions yet</p>
                <p className="text-sm text-muted-foreground">
                  Your credit usage and purchases will appear here
                </p>
              </div>
            ) : (
              credits.transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-full">
                      {getTransactionIcon(transaction.transaction_type)}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleDateString()} at{' '}
                        {new Date(transaction.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-medium ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {transaction.amount > 0 ? '+' : ''}
                      {transaction.amount.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">credits</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manual Tax Payment Dialog */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Payment (HST Included)</DialogTitle>
          </DialogHeader>
          {selectedPackage && (
            <ManualTaxPaymentForm
              packageId={selectedPackage}
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 