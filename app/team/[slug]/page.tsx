'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Phone, Mail, MapPin, TrendingUp, Users, CheckSquare } from 'lucide-react';
import AssignedCustomersList from '@/components/cards/assigned-customer-list';

interface MemberProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  status: string | null;
  date_of_joining: string | null;
  revenue_till_date: number | null;
  appointments_till_date: number | null;
  deals_closed_till_date: number | null;
  calls_made_till_date: number | null;
  zip_code: string | null;
  address: string | null;
}

const supabase = createClient();

export default function TeamMemberProfilePage() {
  const { slug } = useParams();
  const [profile, setProfile] = useState<MemberProfile | null>(null);

  useEffect(() => {
    fetchProfile();
  }, [slug]);

  async function fetchProfile() {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
    } else {
      setProfile(data);
    }
  }

  if (!profile) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-500';
      case 'suspended': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="w-full overflow-hidden">
        <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600" />
        <CardContent className="relative px-6 -mt-16">
          <Avatar className="w-32 h-32 border-4 border-white absolute -top-16 left-6">
            <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${profile.first_name || ''} ${profile.last_name || ''}`} />
            <AvatarFallback>{getInitials(profile.first_name || '', profile.last_name || '')}</AvatarFallback>
          </Avatar>
          <div className="mt-16 flex justify-between items-start">
            <div className="space-y-2 mt-24">
              <h1 className="text-3xl font-bold">{profile.first_name || ''} {profile.last_name || ''}</h1>
              <p className="text-gray-500 flex items-center mt-1">
                <CalendarDays className="w-4 h-4 mr-2" />
                Joined {profile.date_of_joining ? new Date(profile.date_of_joining).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <Badge variant="outline" className={`${getStatusColor(profile.status || 'inactive')} text-white px-3 py-1 mt-4 text-md`}>
              {profile.status || 'Inactive'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Phone className="w-5 h-5 mr-2" /> Contact Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="flex items-center mb-2">
              <Mail className="w-4 h-4 mr-2" /> {profile.email}
            </p>
            <p className="flex items-center mb-2">
              <Phone className="w-4 h-4 mr-2" /> {profile.calls_made_till_date || 'N/A'}
            </p>
            <p className="flex items-center">
              <MapPin className="w-4 h-4 mr-2" /> {profile.address || 'N/A'}, {profile.zip_code || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" /> Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="flex justify-between mb-2">
              <span>Revenue:</span>
              <span className="font-bold">${(profile.revenue_till_date || 0).toLocaleString()}</span>
            </p>
            <p className="flex justify-between mb-2">
              <span>Appointments:</span>
              <span className="font-bold">{profile.appointments_till_date || 0}</span>
            </p>
            <p className="flex justify-between mb-2">
              <span>Calls Made:</span>
              <span className="font-bold">{profile.calls_made_till_date || 0}</span>
            </p>
            <p className="flex justify-between">
              <span>Deals Closed:</span>
              <span className="font-bold">{profile.deals_closed_till_date || 0}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Users className="w-5 h-5 mr-2" /> Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="flex justify-between mb-2">
              <span>Conversion Rate:</span>
              <span className="font-bold">
                {profile.appointments_till_date && profile.deals_closed_till_date ? 
                  (((profile.deals_closed_till_date) / (profile.appointments_till_date)) * 100).toFixed(2) : '0'}%
              </span>
            </p>
            <p className="flex justify-between mb-2">
              <span>Call to Appointment Rate:</span>
              <span className="font-bold">
                {profile.calls_made_till_date && profile.appointments_till_date ? 
                  (((profile.appointments_till_date) / (profile.calls_made_till_date)) * 100).toFixed(2) : '0'}%
              </span>
            </p>
            <p className="flex justify-between">
              <span>Avg. Revenue per Deal:</span>
              <span className="font-bold">
                ${profile.revenue_till_date && profile.deals_closed_till_date ? 
                  ((profile.revenue_till_date) / (profile.deals_closed_till_date)).toLocaleString() : '0'}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <CheckSquare className="w-5 h-5 mr-2" /> Assigned Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AssignedCustomersList userId={profile.id} />
        </CardContent>
      </Card>
    </div>
  );
}