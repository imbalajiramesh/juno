'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Flame, Wind } from 'lucide-react';
import { Customer } from '@/types/customer';

interface EnergyProfileProps {
  customer: Customer;
  isEditing: boolean;
  onUpdate: (updatedCustomer: Customer) => void;
}

export const EnergyProfile: React.FC<EnergyProfileProps> = ({ customer, isEditing, onUpdate }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const customFields = customer.custom_fields as any || {};
    onUpdate({ 
      ...customer, 
      custom_fields: { ...customFields, [name]: Number(value) }
    });
  };

  const handleSelectChange = (name: string) => (value: string) => {
    const customFields = customer.custom_fields as any || {};
    onUpdate({ 
      ...customer, 
      custom_fields: { ...customFields, [name]: value }
    });
  };

  const getCustomFieldValue = (field: string) => {
    const customFields = customer.custom_fields as any || {};
    return customFields[field] ?? '';
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Energy Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <span>Hydro Bill</span>
            </div>
            {isEditing ? (
              <Input 
                name="hydro_bill"
                type="number"
                value={getCustomFieldValue('hydro_bill')}
                onChange={handleInputChange}
                className="w-24"
              />
            ) : (
              <span className="font-semibold">${getCustomFieldValue('hydro_bill')}/month</span>
            )}
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <span>Gas Bill</span>
            </div>
            {isEditing ? (
              <Input 
                name="gas_bill"
                type="number"
                value={getCustomFieldValue('gas_bill')}
                onChange={handleInputChange}
                className="w-24"
              />
            ) : (
              <span className="font-semibold">${getCustomFieldValue('gas_bill')}/month</span>
            )}
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Wind className="h-5 w-5 text-green-500" />
              <span>Attic Insulation</span>
            </div>
            {isEditing ? (
              <Select 
                onValueChange={handleSelectChange('attic_insulation')}
                defaultValue={getCustomFieldValue('attic_insulation')}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                  <SelectItem value="Unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge variant={getCustomFieldValue('attic_insulation') === 'Good' ? 'default' : 'outline'}>
                {getCustomFieldValue('attic_insulation') || 'Unknown'}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};