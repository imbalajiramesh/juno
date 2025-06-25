'use client';

import React from 'react';
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface CallLog {
  id: number;
  customer_id: number;
  recipient: string;
  duration: string;
  date: string;
  audioUrl: string;
  summary: string;
  transcript: string;
}

interface CallLogRowProps {
  log: CallLog;
  onPlay: (log: CallLog) => void;
}

const CallLogRow: React.FC<CallLogRowProps> = ({ log, onPlay }) => {
  return (
    <TableRow>
      <TableCell>{log.recipient}</TableCell>
      <TableCell>{log.duration} mins</TableCell>
      <TableCell>{log.date}</TableCell>
      <TableCell>
        <Button onClick={() => onPlay(log)}>
          View
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default CallLogRow;