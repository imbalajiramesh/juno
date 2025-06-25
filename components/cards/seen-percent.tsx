'use client';
import { CheckCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Skeleton } from "../ui/skeleton";
import React from "react";

export function SeenPercent() {
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
        const { data : currentData, error : currentError } = await supabase
          .from('customers')
          .select('status_id')
          .lte("created_at", currentTimestamp)
          .gte("created_at", currentFirstDayTimestamp)          

        if (currentError) throw currentError;

        if (currentData) {
          const seenPercent = Math.round((currentData.filter((customer: any) => customer.status_id === 23).length / currentData.filter((customer: any) => customer.status_id === 9).length) * 100);
          if (!seenPercent) {
            setCurrentCount(0);
            return 0
          };
          setCurrentCount(seenPercent);
          return seenPercent;
        } else {
          return 0;
        }

      } catch (error) {
        console.log(error);
        return 0;
      }
    }

    async function fetchIncrement(): Promise<any> {
      try {
        const { data : lastMonthData, error : lastMonthError } = await supabase
          .from('customers')
          .select('status_id')
          .lte("created_at", lastMonthEndTimestamp)
          .gte("created_at", lastMonthStartTimestamp)
          

        if (lastMonthError) throw lastMonthError;

        if (lastMonthData) {
          const seenLastPercent = Math.round((lastMonthData.filter((customer: any) => customer.status_id === 23).length / lastMonthData.filter((customer: any) => customer.status_id === 9).length) * 100);
          if (!seenLastPercent) {
            setCurrentCount(0);
            return 0
          };
          setLastMonthCount(seenLastPercent);
          return seenLastPercent;
        } else {
          return 0;
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
        <Card x-chunk="dashboard-01-chunk-1" className="max-w-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Seen %
              </CardTitle>
              <CheckCheck className="h-4 w-4 text-muted-foreground" />
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
            <div className="text-2xl font-bold">{currentCount} %</div>
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