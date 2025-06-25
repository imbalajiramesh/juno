// - All database operations now use the Supabase client.
// - RLS is now supported if enabled in Supabase.

import { createClient } from '@/utils/supabase/server';
import CustomerProfile from '@/components/customer-profile';
import { notFound } from 'next/navigation';

export default async function CustomerProfilePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  
  try {
    // Get customer data with assigned user
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select(`
        *,
        assigned_to:user_accounts(*)
      `)
      .eq('id', params.id)
      .single();

    if (customerError || !customerData) {
      return notFound();
    }

    // Get interactions for this customer
    const { data: interactionsData, error: interactionsError } = await supabase
      .from('interactions')
      .select('*')
      .eq('customer_id', params.id)
      .order('interaction_date', { ascending: false });

    if (interactionsError) {
      console.error('Error fetching interactions:', interactionsError);
    }

    // Use the customer data as-is since Supabase returns the correct format
    const customer = customerData;
    const interactions = interactionsData || [];

    return <CustomerProfile id={params.id} initialCustomer={customer} interactions={interactions} />;
  } catch (error) {
    console.error('Error fetching customer data:', error);
    return <div>Error loading customer data</div>;
  }
} 