'use client';
import { PhoneCall } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import React, { useEffect } from "react";
import { Skeleton } from "../ui/skeleton";

export function CallsMade() {
    const [callCount, setCallCount] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(true);
    const [percentageChange, setPercentageChange] = React.useState(0);

    useEffect(() => {
        async function fetchCalls() {
            try {
                const response = await fetch('/api/calls/stats').then(res => res.json());
                setCallCount(response.currentCount || 0);
                setPercentageChange(response.percentageChange || 0);
            } catch (error) {
                console.error('Error fetching calls:', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchCalls();
    }, []);

    return (
        <Card className="max-w-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Calls Made
                </CardTitle>
                <PhoneCall className="h-4 w-4 text-muted-foreground" />
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
                        <div className="text-2xl font-bold">{callCount}</div>
                        {percentageChange !== 0 && (
                            <p className="text-xs text-muted-foreground">
                                {percentageChange > 0 ? '+' : ''}{percentageChange}% from last month
                            </p>
                        )}
                        {percentageChange === 0 && (
                            <p className="text-xs text-muted-foreground">
                                No change from last month
                            </p>
                        )}
                    </>
                }
            </CardContent>
        </Card>
    );
}


