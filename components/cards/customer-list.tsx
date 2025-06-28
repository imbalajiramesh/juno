'use client'
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, ArrowLeft, ArrowRight, Download, Upload, Plus, Settings, Eye, EyeOff, MessageSquare } from "lucide-react";
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
import { EnhancedImportModal } from '@/components/modals/enhanced-import-modal';
import { EnhancedExportModal } from '@/components/modals/enhanced-export-modal';
import { AddInteractionModal } from '@/components/modals/add-interaction-modal';
import { Checkbox } from "@/components/ui/checkbox";

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
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [showSelectColumn, setShowSelectColumn] = useState(false);
  const itemsPerPage = 10;
  const router = useRouter();
  
  // Modal states
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAddInteractionModalOpen, setIsAddInteractionModalOpen] = useState(false);
  const [selectedCustomerForInteraction, setSelectedCustomerForInteraction] = useState<{
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
  } | null>(null);

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
    const selectColumn = showSelectColumn ? 1 : 0;
    return baseColumns + customColumns + selectColumn + 1; // +1 for Actions column
  };

  const handleCall = (phoneNumber: string) => {
    // Implement call functionality
    console.log(`Calling ${phoneNumber}`);
  };

  const openCustomerProfile = (customerId: string) => {
    router.push(`/customers/${customerId}`);
  };

  // Updated handlers for enhanced modals
  const handleImportClick = () => {
    setIsImportModalOpen(true);
  };

  const handleExportClick = () => {
    setIsExportModalOpen(true);
  };

  const handleImportComplete = () => {
    fetchCustomers(); // Refresh the customer list
    setIsImportModalOpen(false);
  };

  // Customer selection handlers
  const toggleCustomerSelection = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const toggleSelectAll = () => {
    const currentPageCustomerIds = filteredCustomers.map(c => c.id);
    const allSelected = currentPageCustomerIds.every(id => selectedCustomers.includes(id));
    
    if (allSelected) {
      // Deselect all on current page
      setSelectedCustomers(prev => prev.filter(id => !currentPageCustomerIds.includes(id)));
    } else {
      // Select all on current page
      setSelectedCustomers(prev => [
        ...prev.filter(id => !currentPageCustomerIds.includes(id)),
        ...currentPageCustomerIds
      ]);
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

  const handleAddInteraction = (customer: CustomerWithRelations) => {
    setSelectedCustomerForInteraction({
      id: customer.id,
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email || undefined
    });
    setIsAddInteractionModalOpen(true);
  };

  const handleInteractionAdded = () => {
    setIsAddInteractionModalOpen(false);
    setSelectedCustomerForInteraction(null);
    fetchCustomers(); // Refresh customer list to update interaction counts
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Customers</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleImportClick}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button variant="outline" onClick={handleExportClick}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
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
            {selectedCustomers.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedCustomers.length} customer(s) selected
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSelectColumn(!showSelectColumn)}
            >
              {showSelectColumn ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              Bulk Select
            </Button>
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
        
        <Table>
          <TableHeader>
            <TableRow>
              {showSelectColumn && (
                <TableHead>
                  <Checkbox
                    checked={
                      filteredCustomers.length > 0 && 
                      filteredCustomers.every(customer => selectedCustomers.includes(customer.id))
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
              )}
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
                  {showSelectColumn && (
                    <TableCell>
                      <Checkbox
                        checked={selectedCustomers.includes(customer.id)}
                        onCheckedChange={() => toggleCustomerSelection(customer.id)}
                      />
                    </TableCell>
                  )}
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
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddInteraction(customer)}
                        title="Add Interaction"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCustomerProfile(customer.id)}
                      >
                        View Details
                      </Button>
                    </div>
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

      {/* Enhanced Modals */}
      <AddCustomerModal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        onCustomerAdded={handleCustomerAdded}
      />
      
      <EnhancedImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
      />
      
      <EnhancedExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        selectedCustomers={selectedCustomers}
        totalCustomers={totalCustomers}
      />

             <AddInteractionModal
         isOpen={isAddInteractionModalOpen}
         onOpenChange={setIsAddInteractionModalOpen}
         customer={selectedCustomerForInteraction}
         onSuccess={handleInteractionAdded}
       />
    </Card>
  );
} 