import React, { useState, useEffect } from 'react';
import { useForm, ControllerRenderProps, FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from '@/utils/supabase/client';

const customerSchema = z.object({
  firstName: z.string().min(2, { message: "First name must be at least 2 characters." }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, { message: "Invalid phone number." }).optional().or(z.literal('')),
  status: z.string(),
  assignedTo: z.string().default("unassigned")
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerAdded: () => void;
  userAccounts: {[key: string]: string};
}

const AddCustomerModal: React.FC<AddCustomerModalProps> = ({ isOpen, onClose, onCustomerAdded, userAccounts }) => {
  const [customerStatuses, setCustomerStatuses] = useState<any[]>([]);
  
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      status: 'new',
      assignedTo: 'unassigned'
    }
  });

  const supabase = createClient();

  useEffect(() => {
    fetchCustomerStatuses();
  }, []);

  const fetchCustomerStatuses = async () => {
    try {
      const response = await fetch('/api/customer-statuses');
      if (!response.ok) throw new Error('Failed to fetch customer statuses');
      const statuses = await response.json();
      setCustomerStatuses(statuses);
      
      // Set default status
      const defaultStatus = statuses.find((s: any) => s.is_default)?.name || statuses[0]?.name || 'new';
      form.setValue('status', defaultStatus);
    } catch (error) {
      console.error('Error fetching customer statuses:', error);
      // Fall back to default statuses
      setCustomerStatuses([
        { name: 'new', label: 'New' },
        { name: 'contacted', label: 'Contacted' },
      ]);
    }
  };

  const onSubmit = async (data: CustomerFormData) => {
    // Get current user's tenant_id (this would typically come from auth context)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    const { error } = await supabase
      .from('customers')
      .insert([
        { 
          id: crypto.randomUUID(),
          first_name: data.firstName, 
          last_name: data.lastName, 
          email: data.email, 
          phone_number: data.phoneNumber || null, 
          status: data.status, 
          user_account_id: data.assignedTo === 'unassigned' ? null : data.assignedTo,
          tenant_id: user.user_metadata?.tenant_id || 'default-tenant',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('Error adding customer:', error);
      // Handle error (e.g., show error message to user)
    } else {
      onCustomerAdded();
      onClose();
      form.reset();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }: { field: ControllerRenderProps<CustomerFormData, "firstName"> }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }: { field: ControllerRenderProps<CustomerFormData, "lastName"> }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }: { field: ControllerRenderProps<CustomerFormData, "email"> }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }: { field: ControllerRenderProps<CustomerFormData, "phoneNumber"> }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }: { field: ControllerRenderProps<CustomerFormData, "status"> }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customerStatuses.map((status) => (
                        <SelectItem key={status.name} value={status.name}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }: { field: ControllerRenderProps<CustomerFormData, "assignedTo"> }) => (
                <FormItem>
                  <FormLabel>Assigned To</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {Object.entries(userAccounts).map(([id, name]) => (
                        <SelectItem key={id} value={id}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Add Customer</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCustomerModal;