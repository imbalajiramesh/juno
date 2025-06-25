import { CustomFieldManager } from '@/components/custom-fields/custom-field-manager';

export default function CustomFieldsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Custom Fields</h1>
      </div>
      <CustomFieldManager />
    </div>
  );
} 