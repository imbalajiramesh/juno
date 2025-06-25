"use client"
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";
import formatCurrency from "@/lib/formatCurrency";
import { useRouter } from 'next/navigation';

type UserAccount = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  slug: string | null;
};

type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  status: string | null;
  hydro_bill: number | null;
  gas_bill: number | null;
  user_account: UserAccount | null;
  created_at: string;
  updated_at: string;
};

export function Recents() {
  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch('/api/customers/recent').then(res => res.json());
        setCustomers(response.data || []);
      } catch (error) {
        console.error('Error fetching recent customers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const handleRowClick = (user_slug: string | null | undefined) => {
    if (user_slug) {
      router.push(`/team/${user_slug}`);
    }
  };

  const getTotalBill = (customer: Customer): number => {
    const hydro = customer.hydro_bill || 0;
    const gas = customer.gas_bill || 0;
    return hydro + gas;
  };

  return (
    <div className="grid gap-4">
      <Card x-chunk="dashboard-01-chunk-5">
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
          <CardDescription>
            Recent activities with all your team.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8">
          <Table>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No recent sales found
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {customers.map((customer) => (  
                    <TableRow 
                      key={customer.id} 
                      onClick={() => handleRowClick(customer.user_account?.slug)}
                      className="cursor-pointer hover:bg-gray-100"
                    >
                      <TableCell>
                        <div className="flex items-center gap-4">
                          <Avatar className="hidden h-9 w-9 sm:flex">
                            <AvatarImage src="/avatars/01.png" alt="Avatar" />
                            <AvatarFallback>OM</AvatarFallback>
                          </Avatar>
                          <div className="grid gap-1">
                            <p className="text-sm font-medium leading-none">
                              {customer.user_account?.first_name} {customer.user_account?.last_name}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium leading-none">
                          + {formatCurrency(getTotalBill(customer))}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}