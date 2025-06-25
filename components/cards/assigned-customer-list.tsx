'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Phone } from "lucide-react";
import { useDebounce } from 'use-debounce';
import { useRouter } from 'next/navigation';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  status: string | null;
  created_at: string;
}

interface AssignedCustomersListProps {
  userId: string;
}

const supabase = createClient();

const AssignedCustomersList: React.FC<AssignedCustomersListProps> = ({ userId }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState('');
  const [totalCustomers, setTotalCustomers] = useState(0);
  const itemsPerPage = 10;
  const router = useRouter();

  useEffect(() => {
    fetchAssignedCustomers();
  }, [userId, page, debouncedSearchTerm, statusFilter]);

  async function fetchAssignedCustomers() {
    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('user_account_id', userId)
      .range((page - 1) * itemsPerPage, page * itemsPerPage - 1)
      .order('created_at', { ascending: false });

    if (debouncedSearchTerm) {
      query = query.or(`first_name.ilike.%${debouncedSearchTerm}%,last_name.ilike.%${debouncedSearchTerm}%,email.ilike.%${debouncedSearchTerm}%`);
    }

    if (statusFilter && statusFilter !== 'All') {
      query = query.eq('status', statusFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching assigned customers:', error);
    } else {
      setCustomers(data || []);
      setTotalCustomers(count || 0);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const handleCall = (phoneNumber: string) => {
    // Implement Twilio web call functionality here
    console.log(`Calling ${phoneNumber}`);
  };

  const openCustomerProfile = (customerId: string) => {
    router.push(`/leads/${customerId}`);
  };

  const totalPages = Math.ceil(totalCustomers / itemsPerPage);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assigned Customers</CardTitle>
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
            {/* <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
              </SelectContent>
            </Select> */}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Deal Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id} onClick={() => openCustomerProfile(customer.id)} className="cursor-pointer">
                <TableCell>{`${customer.first_name} ${customer.last_name}`}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleCall(customer.phone_number || ''); }}>
                    <Phone className="h-4 w-4 mr-2" />
                    {customer.phone_number || '--'}
                  </Button>
                </TableCell>
                <TableCell>{customer.email || '--'}</TableCell>
                <TableCell>--</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${getStatusColor(customer.status || 'unknown')} text-white`}>
                    {customer.status || 'Unknown'}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(customer.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4">
          <div>
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssignedCustomersList;