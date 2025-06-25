'use client'

import React, { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Download, Play } from "lucide-react";
import { useRouter } from 'next/navigation'
import { toast } from 'sonner';
import { CallDetailsModal } from '@/components/call-details-modal';
import { Skeleton } from '../ui/skeleton';
import { Database } from '@/lib/database.types';

type AlexCallLog = Database['public']['Tables']['alex_call_logs']['Row'];

interface CallLogWithCustomer extends AlexCallLog {
  customers: {
    first_name: string;
    last_name: string;
  };
  voice_agents?: {
    name: string;
  };
}

const CallLogList = () => {
  const [callLogs, setCallLogs] = useState<CallLogWithCustomer[]>([]);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [durationFilter, setDurationFilter] = useState('');
  const [totalLogs, setTotalLogs] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCallLog, setSelectedCallLog] = useState<CallLogWithCustomer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 10;
  const router = useRouter();

  useEffect(() => {
    fetchCallLogs();
  }, [page, debouncedSearchTerm, durationFilter]);

  const fetchCallLogs = async () => {
    try {
      const searchParams = new URLSearchParams({
        page: page.toString(),
        itemsPerPage: itemsPerPage.toString(),
        search: debouncedSearchTerm,
        duration: durationFilter
      });

      const response = await fetch(`/api/call-logs?${searchParams}`).then(res => res.json());
      
      if (response.error) {
        throw new Error(response.error);
      }

      setCallLogs(response.data || []);
      setTotalLogs(response.total || 0);
    } catch (error) {
      console.error('Error fetching call logs:', error);
      toast.error('Error fetching call logs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayRecording = (callLog: CallLogWithCustomer) => {
    setSelectedCallLog(callLog);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCallLog(null);
  };

  const openCallDetails = (callId: string) => {
    router.push(`/call-logs/${callId}`);
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Customer Name', 'Voice Agent', 'Duration (minutes)', 'Date', 'Summary'];
    const csvContent = [
      headers.join(','),
      ...callLogs.map(log => 
        [
          log.id, 
          `${log.customers.first_name} ${log.customers.last_name}`, 
          log.voice_agents?.name || 'Manual Call',
          log.duration_minutes || 0, 
          log.created_at, 
          log.call_summary || ''
        ].join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'call_logs.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    toast.success('Call log downloaded successfully!');
  };

  const totalPages = Math.ceil(totalLogs / itemsPerPage);

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Call Logs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search by customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            <Select value={durationFilter} onValueChange={setDurationFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="0-5">0-5 minutes</SelectItem>
                <SelectItem value="5-15">5-15 minutes</SelectItem>
                <SelectItem value="15-30">15-30 minutes</SelectItem>
                <SelectItem value="30-999">30+ minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={exportToCSV} variant="secondary">
            <Download className="h-4 w-4 mr-2" />
            Export to CSV
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer Name</TableHead>
              <TableHead>Voice Agent</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>Recording</TableHead>
            </TableRow>
          </TableHeader>
          {isLoading && 
            <TableBody>
              <TableRow>
                <TableCell>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            </TableBody>
          }
          {!isLoading &&
            <TableBody> 
              {callLogs.map((log) => (
                <TableRow key={log.id} onClick={() => openCallDetails(log.id)} className="cursor-pointer">
                  <TableCell>{`${log.customers.first_name} ${log.customers.last_name}`}</TableCell>
                  <TableCell>{log.voice_agents?.name || 'Manual Call'}</TableCell>
                  <TableCell>{`${log.duration_minutes || 0} minutes`}</TableCell>
                  <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                  <TableCell>{log.call_summary ? `${log.call_summary.substring(0, 50)}...` : 'No summary'}</TableCell>
                  <TableCell>
                    {log.call_recording_url && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handlePlayRecording(log); 
                        }}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Play
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          }
        </Table>
      </CardContent>

      {/* Pagination */}
      <div className="flex items-center justify-between p-4">
        <div>
          Page {page} of {totalPages}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {selectedCallLog && (
        <CallDetailsModal
          isOpen={isModalOpen}
          onClose={closeModal}
          callLog={selectedCallLog}
        />
      )}
    </Card>
  );
}

export default CallLogList;