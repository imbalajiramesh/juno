import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, Phone, Mail } from 'lucide-react';
import { Database } from '@/lib/database.types';

type Customer = Database['public']['Tables']['customers']['Row'];

interface CustomerDetailsProps {
  customer: Customer;
  isEditing: boolean;
  onUpdate: (updatedCustomer: Partial<Customer>) => void;
}

export function CustomerDetails({ customer, isEditing, onUpdate }: CustomerDetailsProps) {
  const handleNotesChange = (notes: string) => {
    const currentCustomFields = (customer.custom_fields as any) || {};
    onUpdate({
      custom_fields: {
        ...currentCustomFields,
        notes
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">First Name</label>
            {isEditing ? (
              <Input
                value={customer.first_name}
                onChange={(e) => onUpdate({ first_name: e.target.value })}
              />
            ) : (
              <p className="mt-1">{customer.first_name}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Last Name</label>
            {isEditing ? (
              <Input
                value={customer.last_name}
                onChange={(e) => onUpdate({ last_name: e.target.value })}
              />
            ) : (
              <p className="mt-1">{customer.last_name}</p>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Email</label>
          <div className="flex items-center mt-1">
            <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
            {isEditing ? (
              <Input
                value={customer.email || ''}
                onChange={(e) => onUpdate({ email: e.target.value })}
              />
            ) : (
              <span>{customer.email || 'No email provided'}</span>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Phone Number</label>
          <div className="flex items-center mt-1">
            <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
            {isEditing ? (
              <Input
                value={customer.phone_number || ''}
                onChange={(e) => onUpdate({ phone_number: e.target.value })}
              />
            ) : (
              <span>{customer.phone_number || 'No phone number provided'}</span>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Address</label>
          <div className="flex items-center mt-1">
            <Home className="h-4 w-4 mr-2 text-muted-foreground" />
            {isEditing ? (
              <Input
                value={customer.address || ''}
                onChange={(e) => onUpdate({ address: e.target.value })}
              />
            ) : (
              <span>{customer.address || 'No address provided'}</span>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Status</label>
          <div className="mt-1">
            {isEditing ? (
              <Select
                value={customer.status || 'new'}
                onValueChange={(value) => onUpdate({ status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="closed_won">Closed Won</SelectItem>
                  <SelectItem value="closed_lost">Closed Lost</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline">{customer.status || 'New'}</Badge>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Notes</label>
          <div className="mt-1">
            {isEditing ? (
              <Textarea
                value={((customer.custom_fields as any)?.notes) || ''}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Add notes about the customer..."
                className="min-h-[100px]"
              />
            ) : (
              <p className="whitespace-pre-wrap">
                {((customer.custom_fields as any)?.notes) || 'No notes available'}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default CustomerDetails;