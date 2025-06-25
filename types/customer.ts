import { Database } from '@/lib/database.types';

type Interaction = Database['public']['Tables']['interactions']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'] & {
  assigned_to?: Database['public']['Tables']['user_accounts']['Row'] | null;
};

export type { Interaction, Customer };