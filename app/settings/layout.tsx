'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import HeaderComponent from "@/components/header-component";
import {
  IconSettings,
  IconDatabaseCog,
  IconUsers,
  IconBuildingStore,
  IconShield,
  IconMicrophone,
  IconPhone,
  IconCreditCard,
  IconMail,
  IconCrown,
  IconFileText,
} from '@tabler/icons-react';

const baseSettingsNav = [
  {
    title: 'General',
    href: '/settings',
    icon: IconSettings,
  },
  {
    title: 'Custom Fields',
    href: '/settings/custom-fields',
    icon: IconDatabaseCog,
  },
  {
    title: 'Team',
    href: '/settings/team',
    icon: IconUsers,
  },
  {
    title: 'Organization',
    href: '/settings/organization',
    icon: IconBuildingStore,
  },
  {
    title: 'Documents',
    href: '/settings/documents',
    icon: IconFileText,
  },
  {
    title: 'Two-Factor Auth',
    href: '/settings/mfa',
    icon: IconShield,
  },
  {
    title: 'Juno Voices',
    href: '/settings/voice-agents',
    icon: IconMicrophone,
  },
  {
    title: 'Juno Numbers',
    href: '/settings/phone-numbers',
    icon: IconPhone,
  },
  {
    title: 'Juno Mailbox',
    href: '/settings/mailbox',
    icon: IconMail,
  },
  {
    title: 'Credits & Billing',
    href: '/settings/credits',
    icon: IconCreditCard,
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [settingsNav, setSettingsNav] = useState(baseSettingsNav);
  const [pendingDocuments, setPendingDocuments] = useState(0);

  useEffect(() => {
    const checkSuperAdminAccess = async () => {
      try {
        const response = await fetch('/api/super-admin/auth-check');
        if (response.ok) {
          setIsSuperAdmin(true);
          // Add super admin menu item
          setSettingsNav([
            ...baseSettingsNav,
            {
              title: 'Super Admin',
              href: '/settings/super-admin',
              icon: IconCrown,
            },
          ]);
        }
      } catch (error) {
        // User is not a super admin, keep base navigation
        console.log('Super admin access not available');
      }
    };

    const fetchOrganizationStatus = async () => {
      try {
        const response = await fetch('/api/organization/status');
        if (response.ok) {
          const data = await response.json();
          setPendingDocuments(data.pending_documents || 0);
        }
      } catch (error) {
        console.log('Failed to fetch organization status:', error);
      }
    };

    checkSuperAdminAccess();
    fetchOrganizationStatus();
  }, []);

  return (
    <>
      <HeaderComponent />
      <div className="container mx-auto py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 shrink-0">
            <nav className="space-y-2">
              {settingsNav.map((item) => {
                const Icon = item.icon;
                const showBadge = item.href === '/settings/documents' && pendingDocuments > 0;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        'w-full justify-start gap-2',
                        pathname === item.href && 'bg-muted'
                      )}
                    >
                      <Icon size={20} />
                      {item.title}
                      {showBadge && (
                        <Badge variant="destructive" className="ml-auto text-xs">
                          {pendingDocuments}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">{children}</div>
        </div>
      </div>
    </>
  );
} 