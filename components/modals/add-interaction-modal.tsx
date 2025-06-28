'use client'

import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, User, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

interface AddInteractionModalProps {
  customer?: Customer | null;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddInteractionModal({ 
  customer, 
  trigger, 
  onSuccess, 
  isOpen, 
  onOpenChange 
}: AddInteractionModalProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: customer?.id || '',
    interaction_type: 'note' as const,
    details: '',
    interaction_date: new Date()
  });

  const interactionTypes = [
    { value: 'call', label: 'Phone Call' },
    { value: 'email', label: 'Email' },
    { value: 'sms', label: 'SMS/Text' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'note', label: 'Note' },
    { value: 'other', label: 'Other' }
  ];

  const handleOpen = (newOpen: boolean) => {
    setOpen(newOpen);
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
    if (!newOpen) {
      // Reset form when closing
      setFormData({
        customer_id: customer?.id || '',
        interaction_type: 'note',
        details: '',
        interaction_date: new Date()
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_id || !formData.details.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: formData.customer_id,
          interaction_type: formData.interaction_type,
          details: formData.details,
          interaction_date: formData.interaction_date.toISOString(),
          generate_ai_summary: false // Manual interactions don't need AI processing
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create interaction');
      }

      const data = await response.json();
      toast.success('Interaction created successfully!');
      
      handleOpen(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating interaction:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create interaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Add Manual Interaction</DialogTitle>
        <DialogDescription>
          Record a manual interaction with {customer ? `${customer.first_name} ${customer.last_name}` : 'customer'}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Info */}
        {customer && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{customer.first_name} {customer.last_name}</span>
              {customer.email && (
                <span className="text-sm text-gray-500">({customer.email})</span>
              )}
            </div>
          </div>
        )}

        {/* Interaction Type */}
        <div className="space-y-2">
          <Label htmlFor="interaction_type">Interaction Type *</Label>
          <Select
            value={formData.interaction_type}
            onValueChange={(value: any) => setFormData(prev => ({ ...prev, interaction_type: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select interaction type" />
            </SelectTrigger>
            <SelectContent>
              {interactionTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Interaction Date */}
        <div className="space-y-2">
          <Label>Interaction Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.interaction_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.interaction_date ? (
                  format(formData.interaction_date, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.interaction_date}
                onSelect={(date) => date && setFormData(prev => ({ ...prev, interaction_date: date }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Interaction Details */}
        <div className="space-y-2">
          <Label htmlFor="details">Interaction Details *</Label>
          <Textarea
            id="details"
            placeholder="Describe what happened during this interaction..."
            value={formData.details}
            onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
            rows={4}
            className="min-h-[100px]"
          />
          <p className="text-sm text-gray-500">
            Note: AI summaries are generated automatically only for Juno agent interactions (calls, emails, SMS).
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Interaction'
            )}
          </Button>
        </div>
      </form>
    </DialogContent>
  );

  if (isOpen !== undefined && onOpenChange) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        {modalContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {modalContent}
    </Dialog>
  );
} 