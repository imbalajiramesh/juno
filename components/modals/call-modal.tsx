'use client';

import { useState, ChangeEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  phoneNumber: string;
  customerId: string;
}

export function CallModal({ isOpen, onClose, customerName, phoneNumber, customerId }: CallModalProps) {
  const [additionalContext, setAdditionalContext] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleCreateCallWithAlex = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/calls/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName,
          phoneNumber,
          additionalContext: additionalContext.trim() || null,
          customerId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      toast.success('Call task created successfully!');
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create call task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCallNow = () => {
    toast.info('Direct calling feature coming soon!');
    onClose();
  };

  const handleTextAreaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setAdditionalContext(e.target.value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Call Options</DialogTitle>
          <DialogDescription>
            Choose how you would like to make the call to {customerName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <Textarea
              placeholder="Add any additional context for Alex (optional)"
              value={additionalContext}
              onChange={handleTextAreaChange}
              className="min-h-[100px]"
            />
            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleCreateCallWithAlex}
                disabled={isSubmitting}
              >
                Create Call with Alex
              </Button>
              <Button 
                onClick={handleCallNow}
                variant="outline"
              >
                Call Now
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 