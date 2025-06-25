'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface RecentSale {
  id: string;
  customer_name: string;
  agent_name: string;
  agent_id: string;
  closed_at: string;
  amount: number;
}

export function RecentSales() {
  const [sales, setSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentSales = async () => {
      try {
        const response = await fetch('/api/customers/recent-sales');
        if (!response.ok) throw new Error('Failed to fetch recent sales');
        const data = await response.json();
        setSales(data);
      } catch (error) {
        console.error('Error fetching recent sales:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentSales();
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent Sales</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="animate-pulse h-10 w-10 rounded-full bg-muted" />
                <div className="space-y-2 flex-1">
                  <div className="animate-pulse h-4 w-1/2 bg-muted rounded" />
                  <div className="animate-pulse h-3 w-1/3 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center text-muted-foreground py-6">
            No recent sales
          </div>
        ) : (
          <div className="space-y-4">
            {sales.map((sale) => (
              <div key={sale.id} className="flex items-center space-x-4">
                <Avatar>
                  <AvatarFallback>
                    {getInitials(sale.agent_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none truncate">
                    {sale.agent_name}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {sale.customer_name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {formatCurrency(sale.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(sale.closed_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 