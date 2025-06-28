'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
interface Member {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  created_at: string;
  status: string | null;
  date_of_joining: string | null;
  revenue_till_date: number | null;
  appointments_till_date: number | null;
  deals_closed_till_date: number | null;
  calls_made_till_date: number | null;
  role?: {
    role_name: string;
  };
}

interface TeamMemberListProps {
    refreshKey?: number;
  }
  
  export default function TeamMemberList({ refreshKey = 0 }: TeamMemberListProps) {
    const [members, setMembers] = useState<Member[]>([]);
  
    useEffect(() => {
      fetchMembers();
    }, [refreshKey]);

  async function fetchMembers() {
    try {
      // Use the API endpoint to ensure proper tenant filtering and permissions
      const response = await fetch('/api/team');
      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }
      const data = await response.json();
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      setMembers([]);
    }
  }

  function calculatePercentage(part: string, whole: string) {
    if (!part || !whole || parseInt(whole) === 0) return '--';
    return ((parseInt(part) / parseInt(whole)) * 100).toFixed(2) + '%';
  }

  function formatDate(dateString: string) {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function getInitials(firstName: string, lastName: string) {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  }

  function getStatusColor(status: string | null) {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-500';
      case 'suspended': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {members.map((member) => (
        <Card key={member.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${member.first_name || ''} ${member.last_name || ''}`} />
                <AvatarFallback>{getInitials(member.first_name || '', member.last_name || '')}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{member.first_name || ''} {member.last_name || ''}</CardTitle>
                <p className="text-sm text-muted-foreground">Joined: {formatDate(member.date_of_joining || '')}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mt-2 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Total Revenue:</span>
                <span className="text-sm">${member.revenue_till_date || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Call to Appointment %:</span>
                <span className="text-sm">{calculatePercentage(String(member.appointments_till_date || 0), String(member.calls_made_till_date || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Closed %:</span>
                <span className="text-sm">{calculatePercentage(String(member.deals_closed_till_date || 0), String(member.appointments_till_date || 0))}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Role:</span>
                <Badge variant="outline" className="bg-blue-500 text-white">
                  {member.role?.role_name || 'No Role'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant="outline" className={`${getStatusColor(member.status || 'inactive')} text-white`}>
                  {member.status || 'Inactive'}
                </Badge>
              </div>
            </div>
            <div className="flex flex-row justify-betweenmt-4 space-x-6">
            <Button variant="secondary" className="w-full mt-4">Suspend Account</Button>
            <Button variant="default" className="w-full mt-4">View Profile</Button>
            
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}