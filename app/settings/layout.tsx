'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
} from '@tabler/icons-react';

const settingsNav = [
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