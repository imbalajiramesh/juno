'use client';

import React, { Suspense, useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CustomerDetails } from '@/components/cards/customer-details';
import { EnergyProfile } from '@/components/cards/energy-profile';
import { AppliancesTab } from '@/components/cards/appliances-tab';
import { ProgramsTab } from '@/components/cards/programs-tab';
import { InteractionsCard } from '@/components/cards/customer-interactions';
import { CustomerDetailsSkeleton, EnergyProfileSkeleton, AppliancesTabSkeleton, ProgramsTabSkeleton, InteractionsCardSkeleton } from '@/components/skeletons';
import { Customer, Interaction } from '@/types/customer';
import { toast } from "sonner";
import { useRouter } from 'next/navigation';
import { CallModal } from '@/components/modals/call-modal';

interface CustomerProfileProps {
  id: string;
  initialCustomer: Customer;
  interactions: Interaction[];
}

const fadeIn: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const CustomerProfile: React.FC<CustomerProfileProps> = ({ id, initialCustomer, interactions }) => {
  const [customer, setCustomer] = useState<Customer>(initialCustomer);
  const [isEditing, setIsEditing] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const router = useRouter();

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      // Prepare the update data
      const { id, created_at, updated_at, ...updateData } = customer;
      
      const response = await fetch('/api/customers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id, // Keep id for identifying the customer
          ...updateData,
          // last_interaction field doesn't exist in database
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update customer');
      }

      const updatedCustomer = await response.json();
      setCustomer(updatedCustomer);
      setIsEditing(false);
      toast.success('Customer data updated successfully');
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('Failed to update customer data. Please try again.');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setCustomer(initialCustomer);
    toast.success('Changes discarded');
  };

  const handleCustomerUpdate = (updatedCustomer: Partial<Customer>) => {
    setCustomer(prev => ({ ...prev, ...updatedCustomer }));
  };

  const handleDeleteCustomer = async () => {
    try {
      const response = await fetch(`/api/customers?id=${customer.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete customer');
      }

      toast.success('Customer deleted successfully');
      router.push('/customers');
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer. Please try again.');
    }
  };

  const handleCallClick = () => {
    setIsCallModalOpen(true);
  };

  return (
    <>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Customer Profile</h1>
          {!isEditing ? (
            <Button onClick={handleEdit}>Edit Customer</Button>
          ) : (
            <div className="space-x-2">
              <Button onClick={handleSave} variant="default">Save</Button>
              <Button onClick={handleCancel} variant="outline">Cancel</Button>
            </div>
          )}
        </div>

        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          variants={fadeIn}
          initial="initial"
          animate="animate"
        >
          <Suspense fallback={<CustomerDetailsSkeleton />}>
            <CustomerDetails customer={customer} isEditing={isEditing} onUpdate={handleCustomerUpdate} />
          </Suspense>
          <Suspense fallback={<EnergyProfileSkeleton />}>
            <EnergyProfile customer={customer} isEditing={isEditing} onUpdate={handleCustomerUpdate} />
          </Suspense>
        </motion.div>

        <motion.div
          className="mt-8"
          variants={fadeIn}
          initial="initial"
          animate="animate"
        >
          <Tabs defaultValue="appliances" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="appliances">Appliances</TabsTrigger>
              <TabsTrigger value="programs">Programs</TabsTrigger>
            </TabsList>
            <TabsContent value="appliances">
              <Suspense fallback={<AppliancesTabSkeleton />}>
                <AppliancesTab customer={customer} isEditing={isEditing} onUpdate={handleCustomerUpdate} />
              </Suspense>
            </TabsContent>
            <TabsContent value="programs">
              <Suspense fallback={<ProgramsTabSkeleton />}>
                <ProgramsTab customer={customer} isEditing={isEditing} onUpdate={handleCustomerUpdate} />
              </Suspense>
            </TabsContent>
          </Tabs>
        </motion.div>

        <motion.div
          className="mt-8"
          variants={fadeIn}
          initial="initial"
          animate="animate"
        >
          <Suspense fallback={<InteractionsCardSkeleton />}>
            <InteractionsCard interactions={interactions} />
          </Suspense>
        </motion.div>
      </div>
      <CallModal 
        isOpen={isCallModalOpen} 
        onClose={() => setIsCallModalOpen(false)}
        customerName={`${customer.first_name} ${customer.last_name}`}
        phoneNumber={customer.phone_number || ''}
        customerId={customer.id}
      />
    </>
  );
};

export default CustomerProfile;