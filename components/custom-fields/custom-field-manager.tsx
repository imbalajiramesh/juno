'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { IconPencil, IconTrash, IconPlus, IconX } from '@tabler/icons-react';

const customFieldSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  type: z.enum(['string', 'number', 'boolean', 'date', 'select']),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
});

type CustomFieldFormData = z.infer<typeof customFieldSchema>;

interface CustomField extends CustomFieldFormData {
  id: string;
  name: string;
  created_at: string;
}

// Helper function to auto-generate field names from labels
const generateFieldName = (label: string): string => {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
};

// Skeleton component for loading state
function CustomFieldSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </Card>
  );
}

interface OptionInputProps {
  options: string[];
  onChange: (options: string[]) => void;
}

function OptionInput({ options, onChange }: OptionInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addOption = () => {
    if (inputValue.trim() && !options.includes(inputValue.trim())) {
      onChange([...options, inputValue.trim()]);
      setInputValue('');
    }
  };

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addOption();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type an option and press Enter"
          className="flex-1"
        />
        <Button type="button" onClick={addOption} size="sm">
          <IconPlus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option, index) => (
          <Badge key={index} variant="secondary" className="flex items-center gap-1">
            {option}
            <button
              type="button"
              onClick={() => removeOption(index)}
              className="ml-1 hover:text-destructive"
            >
              <IconX className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}

interface CustomFieldFormProps {
  field?: CustomField;
  onSubmit: (data: CustomFieldFormData) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

function CustomFieldForm({ field, onSubmit, onCancel, isLoading }: CustomFieldFormProps) {
  const form = useForm<CustomFieldFormData>({
    resolver: zodResolver(customFieldSchema),
    defaultValues: {
      label: field?.label || '',
      type: field?.type || 'string',
      required: field?.required || false,
      options: field?.options || [],
    },
  });

  const watchType = form.watch('type');
  const watchOptions = form.watch('options') || [];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="label">Display Label</Label>
        <Input
          id="label"
          placeholder="e.g., Customer Rating, Priority Level"
          {...form.register('label')}
        />
        {form.formState.errors.label && (
          <p className="text-sm text-red-500">{form.formState.errors.label.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Field Type</Label>
        <Select
          onValueChange={(value) => {
            form.setValue('type', value as CustomFieldFormData['type']);
            if (value !== 'select') {
              form.setValue('options', []);
            }
          }}
          value={form.watch('type')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="string">Text</SelectItem>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="boolean">Yes/No</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="select">Dropdown</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {watchType === 'select' && (
        <div className="space-y-2">
          <Label>Dropdown Options</Label>
          <OptionInput
            options={watchOptions}
            onChange={(options) => form.setValue('options', options)}
          />
          {watchOptions.length === 0 && (
            <p className="text-sm text-amber-600">
              Add at least one option for dropdown fields
            </p>
          )}
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Switch
          id="required"
          checked={form.watch('required')}
          onCheckedChange={(checked) => form.setValue('required', checked)}
        />
        <Label htmlFor="required">Required field</Label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isLoading || (watchType === 'select' && watchOptions.length === 0)}>
          {isLoading ? (field ? 'Updating...' : 'Creating...') : (field ? 'Update Field' : 'Create Field')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function CustomFieldManager() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFields, setIsLoadingFields] = useState(true);

  useEffect(() => {
    fetchFields();
  }, []);

  // Fetch existing fields
  const fetchFields = async () => {
    setIsLoadingFields(true);
    try {
      const response = await fetch('/api/custom-fields');
      if (!response.ok) throw new Error('Failed to fetch fields');
      const data = await response.json();
      setFields(data);
    } catch (error) {
      toast.error('Failed to fetch custom fields');
    } finally {
      setIsLoadingFields(false);
    }
  };

  // Create new field
  const handleCreateField = async (data: CustomFieldFormData) => {
    setIsLoading(true);
    try {
      const fieldName = generateFieldName(data.label);
      
      const fieldData = {
        name: fieldName,
        ...data,
      };

      const response = await fetch('/api/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fieldData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create field');
      }

      toast.success('Custom field created successfully');
      setShowAddForm(false);
      fetchFields();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create field');
    } finally {
      setIsLoading(false);
    }
  };

  // Update existing field
  const handleUpdateField = async (data: CustomFieldFormData) => {
    if (!editingField) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/custom-fields?id=${editingField.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update field');
      }

      toast.success('Custom field updated successfully');
      setEditingField(null);
      fetchFields();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update field');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete field with confirmation
  const handleDeleteField = async (field: CustomField) => {
    if (!confirm(`Are you sure you want to delete the "${field.label}" field? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/custom-fields?id=${field.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete field');
      }

      toast.success('Custom field deleted successfully');
      fetchFields();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete field');
    }
  };

  const getTypeDisplayName = (type: string) => {
    switch (type) {
      case 'string': return 'Text';
      case 'number': return 'Number';
      case 'boolean': return 'Yes/No';
      case 'date': return 'Date';
      case 'select': return 'Dropdown';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Custom Fields</h2>
          <p className="text-sm text-muted-foreground">
            Create custom fields to capture additional information about your customers
          </p>
        </div>
        <Button 
          onClick={() => setShowAddForm(true)}
          disabled={showAddForm || !!editingField}
        >
          <IconPlus className="h-4 w-4 mr-2" />
          Add Field
        </Button>
      </div>

      {showAddForm && (
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Add New Custom Field</h3>
          <CustomFieldForm
            onSubmit={handleCreateField}
            onCancel={() => setShowAddForm(false)}
            isLoading={isLoading}
          />
        </Card>
      )}

      <div className="space-y-4">
        {isLoadingFields ? (
          // Show skeleton loaders while loading
          <>
            {[...Array(3)].map((_, index) => (
              <CustomFieldSkeleton key={index} />
            ))}
          </>
        ) : (
          <>
            {fields.map((field) => (
              <Card key={field.id} className="p-4">
                {editingField?.id === field.id ? (
                  <div>
                    <h3 className="text-lg font-medium mb-4">Edit Custom Field</h3>
                    <CustomFieldForm
                      field={editingField}
                      onSubmit={handleUpdateField}
                      onCancel={() => setEditingField(null)}
                      isLoading={isLoading}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-lg">{field.label}</h3>
                        {field.required && (
                          <Badge variant="secondary">Required</Badge>
                        )}
                      </div>
                      {field.options && field.options.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Options:</span>
                          <div className="flex gap-1 flex-wrap">
                            {field.options.map((option, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {option}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingField(field)}
                        disabled={showAddForm || !!editingField}
                        title="Edit field"
                      >
                        <IconPencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteField(field)}
                        disabled={showAddForm || !!editingField}
                        title="Delete field"
                      >
                        <IconTrash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}

            {fields.length === 0 && !isLoadingFields && (
              <Card className="p-8 text-center">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">No custom fields yet</h3>
                  <p className="text-muted-foreground">
                    Create your first custom field to start capturing additional customer information
                  </p>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
} 