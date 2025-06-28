import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

interface CustomField {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerAdded: () => void;
}

// Create a dynamic schema based on custom fields
const createCustomerSchema = (customFields: CustomField[]) => {
  const standardFields = {
    first_name: z.string().min(2, { message: "First name must be at least 2 characters." }),
    last_name: z.string().min(2, { message: "Last name must be at least 2 characters." }),
    email: z.string().email({ message: "Invalid email address." }).optional().nullable(),
    phone_number: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    zip_code: z.string().optional().nullable(),
    status: z.string().optional(),
    notes: z.string().optional(),
  };

  const customFieldValidations = customFields.reduce((acc: Record<string, z.ZodType>, field) => {
    let validation: z.ZodType;
    switch (field.type) {
      case 'number':
        validation = z.number().optional().nullable();
        break;
      case 'boolean':
        validation = z.boolean().optional();
        break;
      case 'date':
        validation = z.string().optional().nullable();
        break;
      case 'select':
        validation = z.string().optional().nullable();
        break;
      default:
        validation = z.string().optional().nullable();
    }
    if (field.required) {
      validation = z.preprocess((val) => {
        if (val === null || val === undefined) return null;
        return val;
      }, validation.refine((val) => val !== null, {
        message: `${field.label} is required`,
      }));
    }
    acc[field.name] = validation;
    return acc;
  }, {});

  return z.object({
    ...standardFields,
    ...customFieldValidations,
  });
};

export function AddCustomerModal({ isOpen, onClose, onCustomerAdded }: AddCustomerModalProps) {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customerStatuses, setCustomerStatuses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCustomFields();
    fetchCustomerStatuses();
  }, []);

  const fetchCustomFields = async () => {
    try {
      const response = await fetch('/api/custom-fields');
      if (!response.ok) throw new Error('Failed to fetch custom fields');
      const fields = await response.json();
      setCustomFields(fields);
    } catch (error) {
      console.error('Error fetching custom fields:', error);
      toast.error('Failed to fetch custom fields');
    }
  };

  const fetchCustomerStatuses = async () => {
    try {
      const response = await fetch('/api/customer-statuses');
      if (!response.ok) throw new Error('Failed to fetch customer statuses');
      const statuses = await response.json();
      setCustomerStatuses(statuses);
    } catch (error) {
      console.error('Error fetching customer statuses:', error);
      // Fall back to default statuses
      setCustomerStatuses([
        { name: 'new', label: 'New' },
        { name: 'contacted', label: 'Contacted' },
        { name: 'qualified', label: 'Qualified' },
        { name: 'proposal', label: 'Proposal' },
        { name: 'closed_won', label: 'Closed Won' },
        { name: 'closed_lost', label: 'Closed Lost' },
      ]);
    }
  };

  const form = useForm({
    resolver: zodResolver(createCustomerSchema(customFields)),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      address: '',
      zip_code: '',
      status: customerStatuses.find(s => s.is_default)?.name || 'new',
      notes: '',
      ...customFields.reduce((acc: any, field) => {
        acc[field.name] = field.type === 'boolean' ? false : '';
        return acc;
      }, {}),
    },
  });

  // Update default status when statuses are loaded
  useEffect(() => {
    if (customerStatuses.length > 0) {
      const defaultStatus = customerStatuses.find(s => s.is_default)?.name || customerStatuses[0]?.name || 'new';
      form.setValue('status', defaultStatus);
    }
  }, [customerStatuses, form]);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      // Prepare custom fields data
      const customFieldsData = customFields.reduce((acc: any, field) => {
        if (data[field.name] !== undefined && data[field.name] !== null) {
          acc[field.name] = data[field.name];
        }
        return acc;
      }, {});

      // Add notes to custom fields if provided
      if (data.notes) {
        customFieldsData.notes = data.notes;
      }

      // Prepare the customer data
      const customerData = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone_number: data.phone_number,
        address: data.address,
        zip_code: data.zip_code,
        status: data.status,
        custom_fields: Object.keys(customFieldsData).length > 0 ? customFieldsData : undefined,
      };

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create customer');
      }

      toast.success('Customer created successfully');

      onCustomerAdded();
      onClose();
      form.reset();
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create customer');
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (field: CustomField) => {
    switch (field.type) {
      case 'string':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <FormControl>
                  <Input {...formField} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case 'number':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...formField}
                    onChange={(e) => formField.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case 'boolean':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.name}
            render={({ field: formField }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">{field.label}</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={formField.value}
                    onCheckedChange={formField.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        );
      case 'date':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <FormControl>
                  <Input type="date" {...formField} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case 'select':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <Select onValueChange={formField.onChange} defaultValue={formField.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
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
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
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
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="zip_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add notes about the customer..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Custom Fields */}
            {customFields.map(renderField)}

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Customer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 