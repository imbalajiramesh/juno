'use client';
import { CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import React, { useEffect } from "react";
import { Skeleton } from "../ui/skeleton";

export function Appointments() {
  const [currentCount, setCurrentCount] = React.useState(0);
  const [incrementPercentage, setIncrementPercentage] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    async function fetchAppointments() {
      try {
        const response = await fetch('/api/appointments/stats').then(res => res.json());
        setCurrentCount(response.currentCount || 0);
        setIncrementPercentage(response.percentageChange || 0);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAppointments();
  }, []);

  return (
    <Card x-chunk="dashboard-01-chunk-2" className="max-w-xs">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Appointments</CardTitle>
        <CreditCard className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading && 
          <div className="space-y-2">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-1/2" />
          </div> 
        }
        {!isLoading &&
          <>
            <div className="text-2xl font-bold">{currentCount}</div>
            {incrementPercentage > 0 && (
              <p className="text-xs text-muted-foreground">
                + {incrementPercentage}% from last month
              </p>
            )}
            {incrementPercentage === 0 && (
              <p className="text-xs text-muted-foreground">
                At par with last month
              </p>
            )}
            {incrementPercentage < 0 && (
              <p className="text-xs text-muted-foreground">
                - {incrementPercentage}% from last month
              </p>
            )}
          </>
        }
      </CardContent>
    </Card>
  );
}