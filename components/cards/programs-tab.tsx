'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Customer } from '@/types/customer';

interface ProgramsTabProps {
  customer: Customer;
  isEditing: boolean;
  onUpdate: (updatedCustomer: Customer) => void;
}

export const ProgramsTab: React.FC<ProgramsTabProps> = ({ customer, isEditing, onUpdate }) => {
  const handleSwitchChange = (field: 'applied_for_program' | 'knows_about_program') => {
    return (checked: boolean) => {
      const customFields = customer.custom_fields as any || {};
      onUpdate({ 
        ...customer, 
        custom_fields: { ...customFields, [field]: checked }
      });
    };
  };

  const getCustomFieldValue = (field: string) => {
    const customFields = customer.custom_fields as any || {};
    return customFields[field] ?? false;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Applied for Program</span>
            {isEditing ? (
              <Switch
                checked={getCustomFieldValue('applied_for_program')}
                onCheckedChange={handleSwitchChange('applied_for_program')}
              />
            ) : (
              <Badge variant={getCustomFieldValue('applied_for_program') ? 'default' : 'secondary'}>
                {getCustomFieldValue('applied_for_program') ? 'Yes' : 'No'}
              </Badge>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">Knows About Program</span>
            {isEditing ? (
              <Switch
                checked={getCustomFieldValue('knows_about_program')}
                onCheckedChange={handleSwitchChange('knows_about_program')}
              />
            ) : (
              <Badge variant={getCustomFieldValue('knows_about_program') ? 'default' : 'secondary'}>
                {getCustomFieldValue('knows_about_program') ? 'Yes' : 'No'}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};