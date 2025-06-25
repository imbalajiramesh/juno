'use client';
import { Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import React, { useEffect } from "react";
import { Skeleton } from "../ui/skeleton";

export function EmailsSent() {
    const [emailCount, setEmailCount] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(true);
    const [percentageChange, setPercentageChange] = React.useState(0);

    useEffect(() => {
        async function fetchEmails() {
            try {
                const response = await fetch('/api/emails/stats').then(res => res.json());
                setEmailCount(response.currentCount || 0);
                setPercentageChange(response.percentageChange || 0);
            } catch (error) {
                console.error('Error fetching emails:', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchEmails();
    }, []);

    return (
        <Card className="max-w-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Emails Sent
                </CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
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
                        <div className="text-2xl font-bold">{emailCount}</div>
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


