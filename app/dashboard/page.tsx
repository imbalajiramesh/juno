'use client';

import { useState, useEffect } from 'react';
import { TotalCustomers } from "@/components/cards/total-customers";
import { NewCustomers } from "@/components/cards/new-customers";
import { Activities } from "@/components/cards/activities";
import { TotalRevenue } from "@/components/cards/total-revenue";
import { Appointments } from "@/components/cards/appointments";
import { RecentSales } from "@/components/cards/recent-sales";
import { OrganizationSetupCard } from "@/components/cards/organization-setup-card";
import { EmailConfirmationCard } from "@/components/cards/email-confirmation-card";
import { createClient } from "@/utils/supabase/client";

interface SetupStatus {
  setupCompleted: boolean;
  hasBasicInfo: boolean;
  needsSetup: boolean;
}

export default function DashboardPage() {
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);

  useEffect(() => {
    checkEmailConfirmation();
    checkSetupStatus();
  }, []);

  const checkEmailConfirmation = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      // Show email confirmation card if:
      // 1. User exists and email is not confirmed (email_confirmed_at is null)
      // 2. OR if user signed up recently (within last 7 days) as a friendly reminder
      if (user) {
        const isEmailConfirmed = user.email_confirmed_at !== null;
        const isRecentSignup = user.created_at && 
          (new Date().getTime() - new Date(user.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000; // 7 days
        
        // Show confirmation card if email not confirmed OR if recent signup (as a friendly reminder)
        setShowEmailConfirmation(!isEmailConfirmed || (isRecentSignup && !isEmailConfirmed));
      }
    } catch (error) {
      console.error('Error checking email confirmation:', error);
      // Don't show email confirmation card if we can't check
      setShowEmailConfirmation(false);
    }
  };

  const checkSetupStatus = async () => {
    try {
      console.log('Checking organization setup status...');
      const response = await fetch('/api/organization/check-setup');
      console.log('Setup check response status:', response.status);
      
      const data = await response.json();
      console.log('Setup check response data:', data);
      
      if (response.ok) {
        setSetupStatus(data);
      } else {
        // If there's an error, assume setup is needed
        console.warn('Setup check failed, assuming setup needed:', data);
        setSetupStatus({
          setupCompleted: false,
          hasBasicInfo: false,
          needsSetup: true
        });
      }
    } catch (error) {
      console.error('Error checking setup status:', error);
      setError('Failed to check setup status');
      // Default to showing setup card if there's an error
      setSetupStatus({
        setupCompleted: false,
        hasBasicInfo: false,
        needsSetup: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto pb-10 pt-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="h-32 bg-gray-200 animate-pulse rounded-lg"></div>
          <div className="h-32 bg-gray-200 animate-pulse rounded-lg"></div>
          <div className="h-32 bg-gray-200 animate-pulse rounded-lg"></div>
          <div className="h-32 bg-gray-200 animate-pulse rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto pb-10 pt-8">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {/* Email Confirmation Card - Always at top if needed */}
      {showEmailConfirmation && (
        <div className="mb-6">
          <EmailConfirmationCard onDismiss={() => setShowEmailConfirmation(false)} />
        </div>
      )}

      {/* Main Dashboard Grid - Responsive layout */}
      <div className={`grid gap-4 ${setupStatus?.needsSetup ? 'md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
        {/* Main metrics - Always show first 4 positions */}
        <TotalCustomers />
        <NewCustomers />
        <TotalRevenue />
        <Appointments />
        
        {/* Organization Setup Card - Takes remaining space or new row */}
        {setupStatus?.needsSetup && (
          <div className="md:col-span-2 lg:col-span-2 xl:col-span-2">
            <OrganizationSetupCard />
          </div>
        )}
      </div>
      
      {/* Secondary Dashboard Section - Always show */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-12 mt-6">
        <div className="md:col-span-8">
          <Activities />
        </div>
        <div className="md:col-span-4">
          <RecentSales />
        </div>
      </div>
    </div>
  );
}


