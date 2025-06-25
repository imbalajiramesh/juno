'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconMail, IconExternalLink, IconClock, IconPaperclip } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface EmailMessage {
  id: string;
  subject: string;
  sender_email: string;
  sender_name: string;
  received_at: string;
  is_read: boolean;
  has_attachments: boolean;
  preview_text: string;
  mailbox_email: string;
}

export default function RecentEmailsCard() {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchRecentEmails();
  }, []);

  const fetchRecentEmails = async () => {
    try {
      const response = await fetch('/api/mailbox/recent');
      if (response.ok) {
        const data = await response.json();
        setEmails(data.emails || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error('Error fetching recent emails:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconMail className="h-5 w-5" />
            Recent Emails
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <IconMail className="h-5 w-5" />
            Recent Emails
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} unread
              </Badge>
            )}
          </CardTitle>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => window.open('/mailbox', '_blank')}
          >
            <IconExternalLink className="h-4 w-4 mr-1" />
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {emails.length === 0 ? (
          <div className="text-center py-8">
            <IconMail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground">No recent emails</p>
            <p className="text-sm text-muted-foreground mt-2">
              Connect a mailbox to start receiving emails
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {emails.slice(0, 5).map((email) => (
              <div 
                key={email.id} 
                className={`p-3 rounded-lg border transition-colors hover:bg-gray-50 cursor-pointer ${
                  !email.is_read ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => window.open(`/mailbox/message/${email.id}`, '_blank')}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`text-sm truncate ${!email.is_read ? 'font-semibold' : 'font-medium'}`}>
                        {email.subject || '(No subject)'}
                      </h4>
                      {email.has_attachments && (
                        <IconPaperclip className="h-3 w-3 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      From: {email.sender_name || email.sender_email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      To: {email.mailbox_email}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                    <IconClock className="h-3 w-3" />
                    {formatTimeAgo(email.received_at)}
                  </div>
                </div>
                
                {email.preview_text && (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {truncateText(email.preview_text, 120)}
                  </p>
                )}
                
                {!email.is_read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full absolute -left-1 top-3"></div>
                )}
              </div>
            ))}
            
            {emails.length > 5 && (
              <Button 
                variant="ghost" 
                className="w-full" 
                onClick={() => window.open('/mailbox', '_blank')}
              >
                View {emails.length - 5} more emails
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 