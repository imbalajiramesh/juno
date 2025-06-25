'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  IconMail, 
  IconSearch, 
  IconInbox, 
  IconSend, 
  IconTrash, 
  IconStar, 
  IconRefresh,
  IconArchive,
  IconPaperclip,
  IconSettings
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import HeaderComponent from "@/components/header-component";

interface EmailMessage {
  id: string;
  subject: string;
  sender_email: string;
  sender_name: string;
  received_at: string;
  is_read: boolean;
  is_starred: boolean;
  has_attachments: boolean;
  preview_text: string;
  mailbox_email: string;
  folder: string;
}

interface MailboxConfig {
  id: string;
  email_address: string;
  unread_count: number;
}

export default function MailboxPage() {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [mailboxes, setMailboxes] = useState<MailboxConfig[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('INBOX');
  const [selectedMailbox, setSelectedMailbox] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const folders = [
    { name: 'INBOX', label: 'Inbox', icon: IconInbox },
    { name: 'SENT', label: 'Sent', icon: IconSend },
    { name: 'STARRED', label: 'Starred', icon: IconStar },
    { name: 'ARCHIVE', label: 'Archive', icon: IconArchive },
    { name: 'TRASH', label: 'Trash', icon: IconTrash },
  ];

  useEffect(() => {
    fetchMailboxes();
  }, []);

  useEffect(() => {
    if (selectedMailbox) {
      fetchEmails();
    }
  }, [selectedMailbox, selectedFolder]);

  const fetchMailboxes = async () => {
    try {
      const response = await fetch('/api/mailbox');
      if (response.ok) {
        const data = await response.json();
        setMailboxes(data);
        if (data.length > 0 && !selectedMailbox) {
          setSelectedMailbox(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching mailboxes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmails = async () => {
    if (!selectedMailbox) return;
    
    try {
      const params = new URLSearchParams({
        mailbox_id: selectedMailbox,
        folder: selectedFolder,
        ...(searchQuery && { search: searchQuery })
      });
      
      const response = await fetch(`/api/mailbox/messages?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEmails(data);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  const handleEmailClick = (email: EmailMessage) => {
    setSelectedEmail(email);
    if (!email.is_read) {
      markAsRead(email.id);
    }
  };

  const markAsRead = async (emailId: string) => {
    try {
      await fetch(`/api/mailbox/messages/${emailId}/read`, { method: 'POST' });
      setEmails(prev => prev.map(email => 
        email.id === emailId ? { ...email, is_read: true } : email
      ));
    } catch (error) {
      console.error('Error marking email as read:', error);
    }
  };

  if (isLoading) {
    return (
      <>
        <HeaderComponent />
        <div className="h-screen flex">
          <div className="w-64 bg-gray-50 border-r p-4">
            <Skeleton className="h-8 mb-4" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 mb-2" />
            ))}
          </div>
          <div className="flex-1 p-4">
            <Skeleton className="h-10 mb-4" />
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-16 mb-2" />
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <HeaderComponent />
      <div className="h-screen flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-50 border-r flex flex-col">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Juno Mailbox</h2>
            
            {/* Mailbox Selector */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-600 mb-2 block">Mailbox</label>
              <select 
                className="w-full p-2 border rounded text-sm"
                value={selectedMailbox || ''}
                onChange={(e) => setSelectedMailbox(e.target.value)}
              >
                {mailboxes.map((mailbox) => (
                  <option key={mailbox.id} value={mailbox.id}>
                    {mailbox.email_address}
                  </option>
                ))}
              </select>
            </div>

            <Separator className="mb-4" />

            {/* Folders */}
            <nav className="space-y-1">
              {folders.map((folder) => {
                const Icon = folder.icon;
                const unreadCount = folder.name === 'INBOX' ? 
                  mailboxes.find(m => m.id === selectedMailbox)?.unread_count || 0 : 0;
                
                return (
                  <button
                    key={folder.name}
                    onClick={() => setSelectedFolder(folder.name)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedFolder === folder.name
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {folder.label}
                    </div>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {unreadCount}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto p-4">
            <Button variant="outline" className="w-full" size="sm">
              <IconSettings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm" onClick={fetchEmails}>
                <IconRefresh className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Email List */}
          <div className="flex-1 overflow-hidden">
            {emails.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <IconMail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No emails found</h3>
                  <p className="text-gray-500">
                    {searchQuery ? 'Try adjusting your search terms' : 'This folder is empty'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => handleEmailClick(email)}
                    className={`border-b p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      !email.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    } ${
                      selectedEmail?.id === email.id ? 'bg-blue-100' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm truncate ${!email.is_read ? 'font-semibold' : ''}`}>
                            {email.sender_name || email.sender_email}
                          </span>
                          {email.is_starred && (
                            <IconStar className="h-4 w-4 text-yellow-500 fill-current" />
                          )}
                          {email.has_attachments && (
                            <IconPaperclip className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <h4 className={`text-sm mb-1 truncate ${!email.is_read ? 'font-semibold' : ''}`}>
                          {email.subject || '(No subject)'}
                        </h4>
                        <p className="text-xs text-gray-500 truncate">
                          {email.preview_text}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500 ml-4">
                        {formatTimeAgo(email.received_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Email Detail Panel */}
        {selectedEmail && (
          <div className="w-1/2 border-l bg-white">
            <div className="h-full flex flex-col">
              {/* Email Header */}
              <div className="border-b p-6">
                <h1 className="text-xl font-semibold mb-4">
                  {selectedEmail.subject || '(No subject)'}
                </h1>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">From:</span> {selectedEmail.sender_name || selectedEmail.sender_email}
                  </div>
                  <div>
                    <span className="font-medium">To:</span> {selectedEmail.mailbox_email}
                  </div>
                  <div>
                    <span className="font-medium">Date:</span> {new Date(selectedEmail.received_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Email Body */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="prose max-w-none">
                  {selectedEmail.preview_text && (
                    <p className="whitespace-pre-wrap">{selectedEmail.preview_text}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Button size="sm">Reply</Button>
                  <Button size="sm" variant="outline">Forward</Button>
                  <Button size="sm" variant="outline">
                    <IconArchive className="h-4 w-4 mr-1" />
                    Archive
                  </Button>
                  <Button size="sm" variant="outline">
                    <IconTrash className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
} 