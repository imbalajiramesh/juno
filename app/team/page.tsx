'use client';

import React, { useState } from 'react';

import { toast } from "sonner";
import Leaderboard from '@/components/cards/leaderboard';
import TeamMemberList from '@/components/cards/team-members';
import AddMemberModal from '@/components/add-member-modal';

const TeamDashboard = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleMemberAdded = () => {
    toast.success("New team member added successfully!");
    setRefreshKey(oldKey => oldKey + 1);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Team Dashboard</h1>
        <AddMemberModal onMemberAdded={handleMemberAdded} />
      </div>
      <div className="space-y-8">
        <Leaderboard />
        <TeamMemberList key={refreshKey} />
      </div>
    </div>
  );
}

export default TeamDashboard;