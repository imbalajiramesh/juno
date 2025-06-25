'use client'
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { createClient } from '@/utils/supabase/client';
import { CallsMade } from '@/components/cards/calls-made';
import { EmailsSent } from '@/components/cards/emails-sent';
import { TextsSent } from '@/components/cards/texts-sent';
import { BalanceMinutes } from '@/components/cards/balance-minutes';
import LiveAction  from '@/components/cards/live-action';
import CallLogs from '@/components/cards/call-logs';
import ScheduledTasks from '@/components/cards/scheduled-tasks';
import RecentEmailsCard from '@/components/cards/recent-emails';
import HeaderComponent from "@/components/header-component";

const MetricCard = ({ title, value }: { title: string; value: string }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const LiveActionCard = ({ action }: { action: string }) => (
  <motion.div
    className="p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-white"
    animate={{
      background: ['#3B82F6', '#8B5CF6', '#3B82F6'],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
    }}
  >
    <h3 className="text-lg font-semibold mb-2">Live Action</h3>
    <p>{action}</p>
  </motion.div>
);

const AgentDashboard = () => {
  const [metrics, setMetrics] = useState({
    callsMade: 0,
    emailsSent: 0,
    textsSent: 0,
    balanceMinutes: 0
  });
  const [liveAction, setLiveAction] = useState('No current action');
  const supabase = createClient();

  useEffect(() => {
    // Simulated real-time updates
    const interval = setInterval(() => {
      setMetrics(prev => ({
        callsMade: prev.callsMade + Math.floor(Math.random() * 3),
        emailsSent: prev.emailsSent + Math.floor(Math.random() * 2),
        textsSent: prev.textsSent + Math.floor(Math.random() * 5),
        balanceMinutes: prev.balanceMinutes + Math.floor(Math.random() * 10),
      }));
    }, 5000);

    // Simulated live action updates
    const liveActionInterval = setInterval(() => {
      const actions = [
        'Call in progress with John Doe',
        'Email being drafted to Jane Smith',
        'Text message sent to Alice Johnson'
      ];
      setLiveAction(actions[Math.floor(Math.random() * actions.length)]);
    }, 8000);

    // Cleanup
    return () => {
      clearInterval(interval);
      clearInterval(liveActionInterval);
    };
  }, []);

  return (
    <>
      <HeaderComponent />
      <div className="container mx-auto p-4 space-y-4">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 md:gap-8 lg:grid-cols-4 items-center justify-center">
          <CallsMade />
          <EmailsSent />
          <TextsSent />
          <BalanceMinutes />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <LiveAction />
          <ScheduledTasks />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <CallLogs />
          <RecentEmailsCard />
        </div>
      </div>
    </>
  );
};

export default AgentDashboard; 