"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

interface EmailConfirmationCardProps {
  onDismiss?: () => void;
}

export function EmailConfirmationCard({ onDismiss }: EmailConfirmationCardProps) {
  const [isResending, setIsResending] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  const handleResendConfirmation = async () => {
    setIsResending(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.email) {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: user.email,
        });

        if (error) {
          toast.error('Failed to resend confirmation email');
        } else {
          toast.success('Confirmation email sent! Check your inbox.');
        }
      }
    } catch (error) {
      toast.error('Failed to resend confirmation email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="border-dashed border-2 border-yellow-200 bg-yellow-50/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-yellow-800">
          Email Confirmation Required
        </CardTitle>
        <div className="h-4 w-4 text-yellow-600">⚠️</div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-yellow-700">
            Please check your email and click the confirmation link to verify your account. 
            This will unlock all features and ensure account security.
          </p>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleResendConfirmation}
              disabled={isResending}
              className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
            >
              <span className="mr-2">📧</span>
              {isResending ? 'Sending...' : 'Resend Email'}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setIsDismissed(true);
                onDismiss?.();
              }}
              className="text-yellow-700 hover:bg-yellow-100"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 