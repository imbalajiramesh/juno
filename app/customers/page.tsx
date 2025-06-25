'use client';

import CustomerList from '@/components/cards/customer-list';
import { TotalCustomers } from '@/components/cards/total-customers';
import { NewCustomers } from '@/components/cards/new-customers';
import { CustomerStatus } from '@/components/cards/customer-status';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, UserX } from "lucide-react";
import { useEffect, useState } from 'react';

interface CustomerStats {
  total: number;
  percentageChange: number;
}

function ActiveCustomers() {
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/customers/stats/active');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching active customer stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
        <UserCheck className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse">
            <div className="h-9 w-24 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded mt-1" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.percentageChange ? (
                <span className={stats.percentageChange > 0 ? 'text-green-500' : 'text-red-500'}>
                  {stats.percentageChange > 0 ? '+' : ''}
                  {stats.percentageChange.toFixed(1)}% from last month
                </span>
              ) : (
                'No change from last month'
              )}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ChurnedCustomers() {
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/customers/stats/churned');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching churned customer stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Churned Customers</CardTitle>
        <UserX className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse">
            <div className="h-9 w-24 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded mt-1" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.percentageChange ? (
                <span className={stats.percentageChange > 0 ? 'text-red-500' : 'text-green-500'}>
                  {stats.percentageChange > 0 ? '+' : ''}
                  {stats.percentageChange.toFixed(1)}% from last month
                </span>
              ) : (
                'No change from last month'
              )}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function CustomersPage() {
  return (
    <>
      <div className="container mx-auto pb-10 pt-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <TotalCustomers />
          <NewCustomers />
          <ActiveCustomers />
          <ChurnedCustomers />
        </div>
        <div className="grid gap-4 mt-4">
          <CustomerStatus />
          <CustomerList />
        </div>
      </div>
    </>
  );
} 