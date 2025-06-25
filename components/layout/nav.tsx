'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  IconHome,
  IconUsers,
  IconSettings,
  IconChartBar,
  IconCalendar,
} from '@tabler/icons-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: IconHome },
  { name: 'Customers', href: '/customers', icon: IconUsers },
  { name: 'Calendar', href: '/calendar', icon: IconCalendar },
  { name: 'Reports', href: '/reports', icon: IconChartBar },
  { name: 'Settings', href: '/settings', icon: IconSettings },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {navigation.map((item) => {
        const Icon = item.icon;
        return (
          <Button
            key={item.href}
            variant="ghost"
            asChild
            className={cn(
              'justify-start gap-2',
              pathname === item.href && 'bg-muted'
            )}
          >
            <Link href={item.href}>
              <Icon size={20} />
              {item.name}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
} 