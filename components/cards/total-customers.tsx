'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface CustomerStats {
  total: number;
  percentageChange: number;
}

export function TotalCustomers() {
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/customers/stats');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching total customer stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
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