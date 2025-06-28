'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, MessageSquare, Phone, Mail, Calendar, FileText, Users } from "lucide-react";
import { Interaction } from '@/types/customer';
import { AddInteractionModal } from '@/components/modals/add-interaction-modal';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

interface InteractionsCardProps {
  interactions: Interaction[];
  customer?: Customer;
  onRefresh?: () => void;
}

const getInteractionIcon = (type: string) => {
  switch (type) {
    case 'call': return <Phone className="h-4 w-4" />;
    case 'email': return <Mail className="h-4 w-4" />;
    case 'sms': return <MessageSquare className="h-4 w-4" />;
    case 'meeting': return <Users className="h-4 w-4" />;
    case 'note': return <FileText className="h-4 w-4" />;
    default: return <Calendar className="h-4 w-4" />;
  }
};

const getInteractionBadgeColor = (type: string) => {
  switch (type) {
    case 'call': return 'bg-green-100 text-green-800';
    case 'email': return 'bg-blue-100 text-blue-800';
    case 'sms': return 'bg-purple-100 text-purple-800';
    case 'meeting': return 'bg-orange-100 text-orange-800';
    case 'note': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const InteractionsCard: React.FC<InteractionsCardProps> = ({ interactions, customer, onRefresh }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
  };

  const handleInteractionAdded = () => {
    setIsAddModalOpen(false);
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Customer Interactions
            <Badge variant="secondary" className="ml-2">
              {interactions.length}
            </Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {customer && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Interaction
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {interactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <MessageSquare className="h-8 w-8 mb-2" />
              <p className="text-sm">No interactions recorded yet</p>
              {customer && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setIsAddModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add first interaction
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[150px]">AI Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interactions.map((interaction) => (
                  <TableRow key={interaction.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      {interaction.interaction_date 
                        ? new Date(interaction.interaction_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`${getInteractionBadgeColor(interaction.interaction_type || '')} flex items-center gap-1 w-fit`}
                      >
                        {getInteractionIcon(interaction.interaction_type || '')}
                        {interaction.interaction_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={interaction.details || ''}>
                        {interaction.details || 'No description'}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {(interaction as any).ai_summary ? (
                        <div className="text-sm text-gray-600 truncate" title={(interaction as any).ai_summary}>
                          {(interaction as any).ai_summary}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No AI summary</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </CardContent>

      {customer && (
        <AddInteractionModal
          customer={customer}
          isOpen={isAddModalOpen}
          onOpenChange={setIsAddModalOpen}
          onSuccess={handleInteractionAdded}
        />
      )}
    </Card>
  );
};