'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wind, Flame, Droplet } from 'lucide-react';
import { Customer } from '@/types/customer';

interface AppliancesTabProps {
  customer: Customer;
  isEditing: boolean;
  onUpdate: (updatedCustomer: Customer) => void;
}

export const AppliancesTab: React.FC<AppliancesTabProps> = ({ customer, isEditing, onUpdate }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const { value } = e.target;
    const customFields = customer.custom_fields as any || {};
    onUpdate({ 
      ...customer, 
      custom_fields: { ...customFields, [field]: Number(value) }
    });
  };

  const handleSelectChange = (field: string) => (value: string) => {
    const customFields = customer.custom_fields as any || {};
    onUpdate({ 
      ...customer, 
      custom_fields: { ...customFields, [field]: value }
    });
  };

  const getCustomFieldValue = (field: string) => {
    const customFields = customer.custom_fields as any || {};
    return customFields[field] ?? '';
  };

  const renderCell = (value: number | string, field: string, type: 'number' | 'select') => {
    if (!isEditing) return value;

    if (type === 'number') {
      return (
        <Input 
          type="number"
          value={value}
          onChange={(e) => handleInputChange(e, field)}
          className="w-24"
        />
      );
    }

    if (type === 'select') {
      return (
        <Select 
          onValueChange={handleSelectChange(field)}
          defaultValue={value as string}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Own">Own</SelectItem>
            <SelectItem value="Rent">Rent</SelectItem>
          </SelectContent>
        </Select>
      );
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Appliance</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Ownership</TableHead>
              <TableHead>Rent Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">
                <div className="flex items-center space-x-2">
                  <Wind className="h-5 w-5 text-blue-500" />
                  <span>AC</span>
                </div>
              </TableCell>
              <TableCell>{renderCell(getCustomFieldValue('ac_age'), 'ac_age', 'number')}</TableCell>
              <TableCell>{renderCell(getCustomFieldValue('ac_ownership'), 'ac_ownership', 'select')}</TableCell>
              <TableCell>{renderCell(getCustomFieldValue('ac_rent_amount'), 'ac_rent_amount', 'number')}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">
                <div className="flex items-center space-x-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <span>Furnace</span>
                </div>
              </TableCell>
              <TableCell>{renderCell(getCustomFieldValue('furnace_age'), 'furnace_age', 'number')}</TableCell>
              <TableCell>{renderCell(getCustomFieldValue('furnace_ownership'), 'furnace_ownership', 'select')}</TableCell>
              <TableCell>{renderCell(getCustomFieldValue('furnace_rent_amount'), 'furnace_rent_amount', 'number')}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">
                <div className="flex items-center space-x-2">
                  <Droplet className="h-5 w-5 text-blue-500" />
                  <span>Water Heater</span>
                </div>
              </TableCell>
              <TableCell>{renderCell(getCustomFieldValue('water_heater_age'), 'water_heater_age', 'number')}</TableCell>
              <TableCell>{renderCell(getCustomFieldValue('water_heater_ownership'), 'water_heater_ownership', 'select')}</TableCell>
              <TableCell>{renderCell(getCustomFieldValue('water_heater_rent_amount'), 'water_heater_rent_amount', 'number')}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};