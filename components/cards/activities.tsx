"use client"
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "../ui/skeleton";
import { Badge } from "../ui/badge";
import { useRouter } from "next/navigation";
import { Database } from '@/lib/database.types';

type Customer = Database['public']['Tables']['customers']['Row'];
type UserAccount = Database['public']['Tables']['user_accounts']['Row'];
type Interaction = Database['public']['Tables']['interactions']['Row'];

type CustomerWithRelations = Customer & {
  assigned_to: UserAccount | null;
  interactions: Interaction[];
};

export function Activities() {
  const [customers, setCustomers] = useState<CustomerWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch('/api/activities');
        const data = await response.json();
        
        if (data.error) {
          console.error('Error fetching activities:', data.error);
          return;
        }

        setCustomers(data);
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  function handleRowClick(customer: CustomerWithRelations) {
    router.push(`/leads/${customer.id}`);
  }

  return (
    <div className="grid gap-4 xl:col-span-2">
      <Card>
        <CardHeader className="flex flex-row items-center">
          <div className="grid gap-2">
            <CardTitle>Activities</CardTitle>
            <CardDescription>
              Recent activities with all your customers.
            </CardDescription>
          </div>
          <Button asChild size="sm" className="ml-auto gap-1">
            <Link href="/leads">
              View Customers
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell lg:hidden xl:table-cell">Date</TableHead>
                <TableHead className="hidden md:table-cell lg:hidden xl:table-cell text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No recent activities found
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow 
                    key={customer.id}
                    onClick={() => handleRowClick(customer)}
                    className="hover:bg-muted/50 cursor-pointer"
                  >
                    <TableCell>
                      <div className="font-medium">{customer.first_name} {customer.last_name}</div>
                      <div className="hidden text-sm text-muted-foreground md:inline">
                        {customer.phone_number || customer.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{customer.status || 'Unknown'}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell lg:hidden xl:table-cell">
                      {customer.interactions?.[0]?.interaction_date ? 
                        new Date(customer.interactions[0].interaction_date).toLocaleDateString('en', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        }) : '--'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell lg:hidden xl:table-cell text-right">
                      {customer.interactions?.[0]?.interaction_date ? 
                        new Date(customer.interactions[0].interaction_date).toLocaleTimeString('en', { 
                          hour: 'numeric', 
                          minute: 'numeric', 
                          hour12: true 
                        }) : '--'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}