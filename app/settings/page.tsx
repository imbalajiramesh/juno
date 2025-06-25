import { Card } from '@/components/ui/card';
import Link from 'next/link';
import {
  IconDatabaseCog,
  IconUsers,
  IconBuildingStore,
  IconMicrophone,
} from '@tabler/icons-react';

const settingsSections = [
  {
    title: 'Custom Fields',
    description: 'Manage custom fields for your CRM data',
    href: '/settings/custom-fields',
    icon: IconDatabaseCog,
  },
  {
    title: 'Team',
    description: 'Manage team members and their roles',
    href: '/settings/team',
    icon: IconUsers,
  },
  {
    title: 'Organization',
    description: 'Update your organization settings',
    href: '/settings/organization',
    icon: IconBuildingStore,
  },
  {
    title: 'Voice Agents',
    description: 'Create and manage AI voice agents for calls',
    href: '/settings/voice-agents',
    icon: IconMicrophone,
  },
];

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Settings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href}>
              <Card className="p-6 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon size={24} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold">{section.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
} 