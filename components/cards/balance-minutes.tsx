'use client';
import { Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import React, { useEffect } from "react";
import { Skeleton } from "../ui/skeleton";
import { createClient } from '@/utils/supabase/client';

export function BalanceMinutes() {
    const [newMinutes, setNewMinutes] = React.useState(0);
    const [usedMinutes, setUsedMinutes] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(true);
    
    useEffect(() => {
        async function fetchMinutes() {
            try {
                // Fetch total minutes added
                const addedMinutes = await fetch('/api/minutes/total').then(res => res.json());
                setNewMinutes(addedMinutes.total || 0);

                // Fetch total minutes used
                const usedMinutesData = await fetch('/api/minutes/used').then(res => res.json());
                setUsedMinutes(usedMinutesData.total || 0);
            } catch (error) {
                console.error('Error fetching minutes:', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchMinutes();
    }, []);

    const balanceMinutes = newMinutes - usedMinutes;
    
    return (
        <Card className="max-w-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Balance Minutes
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
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
                <div className="text-2xl font-bold">{balanceMinutes}</div>
                {balanceMinutes < 120 && (
                  <p className="text-xs text-muted-foreground">
                    Balance is running low
                  </p>
                )}
                {balanceMinutes >= 120 && (
                  <p className="text-xs text-muted-foreground">
                    Balance in good standing
                  </p>
                )}
              </>
            }
            </CardContent>
        </Card>
    );
}


