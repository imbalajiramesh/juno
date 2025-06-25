import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Database } from '@/lib/database.types';

type AlexCallLog = Database['public']['Tables']['alex_call_logs']['Row'];

interface CallLogWithCustomer extends AlexCallLog {
  customers: {
    first_name: string;
    last_name: string;
  };
}

interface CallDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  callLog: CallLogWithCustomer;
}

export const CallDetailsModal: React.FC<CallDetailsModalProps> = ({
  isOpen,
  onClose,
  callLog,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Call Details</DialogTitle>
          <DialogDescription>
            Call with {callLog.customers.first_name} {callLog.customers.last_name}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {callLog.call_recording_url && (
            <div>
              <h4 className="mb-2 font-medium">Recording</h4>
              <audio controls className="w-full">
                <source src={callLog.call_recording_url} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
          {callLog.call_transcript && (
            <div>
              <h4 className="mb-2 font-medium">Transcript</h4>
              <div className="max-h-40 overflow-y-auto rounded-md border p-4">
                {callLog.call_transcript}
              </div>
            </div>
          )}
          {callLog.call_summary && (
            <div>
              <h4 className="mb-2 font-medium">Summary</h4>
              <div className="rounded-md border p-4">
                {callLog.call_summary}
              </div>
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            <p>Duration: {callLog.duration_minutes || 0} minutes</p>
            <p>Date: {new Date(callLog.created_at).toLocaleString()}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};