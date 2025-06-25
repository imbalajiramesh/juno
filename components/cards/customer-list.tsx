'use client'
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, ArrowLeft, ArrowRight, Download, Upload, Plus, Settings, Eye, EyeOff } from "lucide-react";
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Database } from '@/lib/database.types';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { AddCustomerModal } from '@/components/modals/add-customer-modal';

type Customer = Database['public']['Tables']['customers']['Row'];
type UserAccount = Database['public']['Tables']['user_accounts']['Row'];
type Interaction = Database['public']['Tables']['interactions']['Row'];

type CustomFields = {
  notes?: string;
  [key: string]: any;
};

type CustomerWithRelations = Customer & {
  assigned_to: UserAccount | null;
  interactions: Interaction[];
  custom_fields?: CustomFields;
};

// Define default visible columns and column configuration
const DEFAULT_COLUMNS = {
  name: true,
  phone: true,
  email: true,
  status: true,
  assigned_to: false,
  last_interaction: false,
  notes: false,
};

export default function CustomerList() {
  const [customers, setCustomers] = useState<CustomerWithRelations[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS);
  const [visibleCustomFields, setVisibleCustomFields] = useState<Record<string, boolean>>({});
  const itemsPerPage = 10;
  const router = useRouter();
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchCustomFields();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (!response.ok) throw new Error('Failed to fetch customers');
      const data = await response.json();
      setCustomers(data.customers);
      setTotalCustomers(data.total);
    } catch (error) {
      toast.error('Failed to fetch customers');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomFields = async () => {
    try {
      const response = await fetch('/api/custom-fields');
      if (response.ok) {
        const fields = await response.json();
        setCustomFields(fields);
        // Initialize custom field visibility - show first 2 custom fields by default
        const initialCustomFieldVisibility: Record<string, boolean> = {};
        fields.forEach((field: any, index: number) => {
          initialCustomFieldVisibility[field.name] = index < 2; // Show first 2 by default
        });
        setVisibleCustomFields(initialCustomFieldVisibility);
      }
    } catch (error) {
      console.error('Error fetching custom fields:', error);
    }
  };

  const toggleColumn = (column: keyof typeof DEFAULT_COLUMNS) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const toggleCustomField = (fieldName: string) => {
    setVisibleCustomFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  const getVisibleCustomFields = () => {
    return customFields.filter(field => visibleCustomFields[field.name]);
  };

  const getTotalVisibleColumns = () => {
    const baseColumns = Object.values(visibleColumns).filter(Boolean).length;
    const customColumns = Object.values(visibleCustomFields).filter(Boolean).length;
    return baseColumns + customColumns + 1; // +1 for Actions column
  };

  const handleCall = (phoneNumber: string) => {
    // Implement call functionality
    console.log(`Calling ${phoneNumber}`);
  };

  const openCustomerProfile = (customerId: string) => {
    router.push(`/customers/${customerId}`);
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/customers/export', {
        method: 'GET',
      });
      if (!response.ok) throw new Error('Failed to export customers');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'customers.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Customers exported successfully');
    } catch (error) {
      toast.error('Failed to export customers');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/customers/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to import customers');

      toast.success('Customers imported successfully');

      fetchCustomers(); // Refresh the list
    } catch (error) {
      toast.error('Failed to import customers');
    }
  };

  const totalPages = Math.ceil(totalCustomers / itemsPerPage);

  const filteredCustomers = customers.filter(customer => {
    const searchString = `${customer.first_name} ${customer.last_name} ${customer.email}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const handleAddNewCustomer = () => {
    setIsAddCustomerModalOpen(true);
  };

  const handleCustomerAdded = async () => {
    await fetchCustomers();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Customers</CardTitle>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Import/Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export to CSV
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => document.getElementById('import-file')?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import from CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleAddNewCustomer}>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Show Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.name}
                  onCheckedChange={() => toggleColumn('name')}
                >
                  Name
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.phone}
                  onCheckedChange={() => toggleColumn('phone')}
                >
                  Phone Number
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.email}
                  onCheckedChange={() => toggleColumn('email')}
                >
                  Email
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.status}
                  onCheckedChange={() => toggleColumn('status')}
                >
                  Status
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.assigned_to}
                  onCheckedChange={() => toggleColumn('assigned_to')}
                >
                  Assigned To
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.last_interaction}
                  onCheckedChange={() => toggleColumn('last_interaction')}
                >
                  Last Interaction
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.notes}
                  onCheckedChange={() => toggleColumn('notes')}
                >
                  Notes
                </DropdownMenuCheckboxItem>
                {customFields.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Custom Fields</DropdownMenuLabel>
                    {customFields.map((field) => (
                      <DropdownMenuCheckboxItem
                        key={field.name}
                        checked={visibleCustomFields[field.name] || false}
                        onCheckedChange={() => toggleCustomField(field.name)}
                      >
                        {field.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <input
          type="file"
          id="import-file"
          accept=".csv"
          className="hidden"
          onChange={handleImport}
        />
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.name && <TableHead>Name</TableHead>}
              {visibleColumns.phone && <TableHead>Phone Number</TableHead>}
              {visibleColumns.email && <TableHead>Email</TableHead>}
              {visibleColumns.status && <TableHead>Status</TableHead>}
              {visibleColumns.assigned_to && <TableHead>Assigned To</TableHead>}
              {visibleColumns.last_interaction && <TableHead>Last Interaction</TableHead>}
              {getVisibleCustomFields().map((field) => (
                <TableHead key={field.name}>{field.label}</TableHead>
              ))}
              {visibleColumns.notes && <TableHead>Notes</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={getTotalVisibleColumns()}>
                  <Skeleton className="h-10 w-full" />
                </TableCell>
              </TableRow>
            ) : filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={getTotalVisibleColumns()} className="h-24 text-center">
                  No customers found.
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  {visibleColumns.name && (
                    <TableCell>{`${customer.first_name} ${customer.last_name}`}</TableCell>
                  )}
                  {visibleColumns.phone && (
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span>{customer.phone_number || 'N/A'}</span>
                        {customer.phone_number && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCall(customer.phone_number!)}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.email && (
                    <TableCell>{customer.email || 'N/A'}</TableCell>
                  )}
                  {visibleColumns.status && (
                    <TableCell>
                      <Badge variant="outline">{customer.status || 'New'}</Badge>
                    </TableCell>
                  )}
                  {visibleColumns.assigned_to && (
                    <TableCell>
                      {customer.assigned_to ? 
                        `${customer.assigned_to.first_name} ${customer.assigned_to.last_name}` : 
                        'Unassigned'
                      }
                    </TableCell>
                  )}
                  {visibleColumns.last_interaction && (
                    <TableCell>
                      {customer.interactions[0]?.interaction_date ? 
                        new Date(customer.interactions[0].interaction_date).toLocaleDateString() : 
                        'Never'
                      }
                    </TableCell>
                  )}
                  {getVisibleCustomFields().map((field) => (
                    <TableCell key={field.name}>
                      {customer.custom_fields?.[field.name] || '-'}
                    </TableCell>
                  ))}
                  {visibleColumns.notes && (
                    <TableCell>
                      {customer.custom_fields?.notes || 'No notes'}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openCustomerProfile(customer.id)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            Showing {filteredCustomers.length} of {totalCustomers} customer(s)
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      <AddCustomerModal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        onCustomerAdded={handleCustomerAdded}
      />
    </Card>
  );
} 