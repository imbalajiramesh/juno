import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

export const getStripeClient = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
      return Promise.resolve(null);
    }
    
    // Validate the key format
    if (!publishableKey.startsWith('pk_')) {
      console.error('Invalid Stripe publishable key format');
      return Promise.resolve(null);
    }
    
    stripePromise = loadStripe(publishableKey);
  }
  
  return stripePromise;
};

export const isStripeConfigured = (): boolean => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  return !!(publishableKey && publishableKey.startsWith('pk_'));
};

export const getStripePublishableKey = (): string | null => {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;
}; 