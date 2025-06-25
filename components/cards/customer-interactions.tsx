'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Interaction } from '@/types/customer';

interface InteractionsCardProps {
  interactions: Interaction[];
}

export const InteractionsCard: React.FC<InteractionsCardProps> = ({ interactions }) => {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Customer Interactions</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interactions.map((interaction) => (
                <TableRow key={interaction.id}>
                  <TableCell>
                    {interaction.interaction_date 
                      ? new Date(interaction.interaction_date).toLocaleDateString() 
                      : 'N/A'}
                  </TableCell>
                  <TableCell>{interaction.interaction_type}</TableCell>
                  <TableCell>{interaction.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};