'use client';
import { DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import React from "react";
import formatCurrency from "@/lib/formatCurrency";
import { Skeleton } from "../ui/skeleton";

export function TotalRevenue() {
  const [currentCount, setCurrentCount] = React.useState(0);
  const [lastMonthCount, setLastMonthCount] = React.useState(0);
  const [incrementPercentage, setIncrementPercentage] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const date = new Date();
  const currentTimestamp = date.toISOString();
  const currentFirstDayTimestamp = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
  const lastMonthStartTimestamp = new Date(date.getFullYear(), date.getMonth() - 1, 1).toISOString();
  const lastMonthEndTimestamp = new Date(date.getFullYear(), date.getMonth(), 0).toISOString();
  const supabase = createClient();
  useEffect(() => {
    async function fetchCount(): Promise<any> {
      try {
        // Since deal_size doesn't exist in customers table, we'll use revenue from user_accounts
        const { data : currentData, error : currentError } = await supabase
          .from('user_accounts')
          .select('revenue_till_date')
          .lte("created_at", currentTimestamp)
          .gte("created_at", currentFirstDayTimestamp);
          

        if (currentError) throw currentError;

        if (currentData) {
          // Add all revenue amounts, safely converting to number and handling null/undefined
        const currentTotal = currentData.reduce((acc, item) => {
          const revenue = item.revenue_till_date || 0;
          return acc + revenue;
        }, 0);
          setCurrentCount(currentTotal);
          return currentTotal;
        }

      } catch (error) {
        console.log(error);
        return 0;
      }
    }

    async function fetchIncrement(): Promise<any> {
      try {
        const { data : lastMonthData, error : lastMonthError } = await supabase
          .from('user_accounts')
          .select('revenue_till_date')
          .lte("created_at", lastMonthEndTimestamp)
          .gte("created_at", lastMonthStartTimestamp);
          

        if (lastMonthError) throw lastMonthError;

        if (lastMonthData) {
           // Add all revenue amounts, safely converting to number and handling null/undefined
           const lastMonthTotal = lastMonthData.reduce((acc, item: { revenue_till_date: number | null }) => {
            const revenue = item.revenue_till_date || 0;
            return acc + revenue;
          }, 0);
          console.log(lastMonthTotal);
          //Calculate increment from last month
          setLastMonthCount(lastMonthTotal);
          return lastMonthTotal;
        }

      } catch (error) {
        console.log(error);
      }
    }
    async function fetchCountPercentage() {
      const currentCount = await fetchCount();
      const lastMonthCount = await fetchIncrement();
      
      console.log("lastMonthCount", lastMonthCount);
      console.log("currentCount", currentCount);
    
      let percentageIncrement: number;
    
      if (lastMonthCount === 0) {
        percentageIncrement = currentCount > 0 ? 100 : 0;
      } else {
        percentageIncrement = Math.round(((currentCount - lastMonthCount) / lastMonthCount) * 100);
      }
    
      console.log("percentageIncrement: ", percentageIncrement);
      setIncrementPercentage(percentageIncrement);
      setIsLoading(false);
    }
      
      fetchCountPercentage();

  }, []);
    return (
        <Card x-chunk="dashboard-01-chunk-0" className="max-w-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
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
            <div className="text-2xl font-bold">{formatCurrency(currentCount)}</div>
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
    )
}