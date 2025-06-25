'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Sparkles, Brain, FileText, Check, Plus, X } from 'lucide-react';
import Link from 'next/link';

interface SuggestedField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select';
  required: boolean;
  options?: string[];
  description: string;
  selected: boolean;
}

export default function AIFieldsPage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedFields, setSuggestedFields] = useState<SuggestedField[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [useAI, setUseAI] = useState(true);
  const [newOptionInputs, setNewOptionInputs] = useState<Record<number, string>>({});
  const router = useRouter();

  useEffect(() => {
    if (useAI && step === 2) {
      generateAIFields();
    }
  }, [useAI, step]);

  const generateAIFields = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/organization/ai-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to generate AI fields');

      const data = await response.json();
      setSuggestedFields(data.fields.map((field: SuggestedField) => ({ ...field, selected: true })));
    } catch (error) {
      toast.error('Failed to generate AI field suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/organization/csv-fields', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to analyze CSV');

      const data = await response.json();
      setSuggestedFields(data.fields.map((field: SuggestedField) => ({ ...field, selected: true })));
      setStep(2);
    } catch (error) {
      toast.error('Failed to analyze CSV file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldToggle = (index: number) => {
    setSuggestedFields(prev => 
      prev.map((field, i) => 
        i === index ? { ...field, selected: !field.selected } : field
      )
    );
  };

  const handleAddOption = (fieldIndex: number) => {
    const newOption = newOptionInputs[fieldIndex];
    if (!newOption || !newOption.trim()) return;

    setSuggestedFields(prev =>
      prev.map((field, i) => {
        if (i === fieldIndex && field.options) {
          return {
            ...field,
            options: [...field.options, newOption.trim()]
          };
        }
        return field;
      })
    );

    setNewOptionInputs(prev => ({ ...prev, [fieldIndex]: '' }));
  };

  const handleRemoveOption = (fieldIndex: number, optionIndex: number) => {
    setSuggestedFields(prev =>
      prev.map((field, i) => {
        if (i === fieldIndex && field.options) {
          return {
            ...field,
            options: field.options.filter((_, oi) => oi !== optionIndex)
          };
        }
        return field;
      })
    );
  };

  const handleNewOptionInputChange = (fieldIndex: number, value: string) => {
    setNewOptionInputs(prev => ({ ...prev, [fieldIndex]: value }));
  };

  const handleFinishSetup = async () => {
    const selectedFields = suggestedFields.filter(field => field.selected);
    
    if (selectedFields.length === 0) {
      toast.error('Please select at least one field');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/organization/finalize-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: selectedFields }),
      });

      if (!response.ok) throw new Error('Failed to finalize setup');

      toast.success('Organization setup completed successfully!');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Failed to complete setup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/organization-setup" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Organization Setup
          </Link>
        </div>

        <div className="text-center mb-8">
          <Brain className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            AI-Powered CRM Fields
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Let AI suggest custom fields for your industry, or upload a CSV to auto-detect fields
          </p>
        </div>

        {step === 1 && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => { setUseAI(true); setStep(2); }}>
              <CardHeader className="text-center">
                <Sparkles className="mx-auto h-8 w-8 text-primary mb-2" />
                <CardTitle>AI Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground">
                  Get intelligent field suggestions based on your industry and business description.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Upload className="mx-auto h-8 w-8 text-primary mb-2" />
                <CardTitle>Upload CSV</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground mb-4">
                  Upload a sample CSV file to automatically detect and suggest fields.
                </p>
                <div className="flex flex-col items-center space-y-4">
                  <Label htmlFor="csv-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                      <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">
                        {csvFile ? csvFile.name : 'Click to upload CSV file'}
                      </span>
                    </div>
                  </Label>
                  <Input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleCsvUpload}
                    disabled={isLoading}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="mr-2 h-5 w-5" />
                Suggested Fields
              </CardTitle>
                             <p className="text-muted-foreground">
                 Review and select the fields you&apos;d like to add to your CRM. You can always add more later.
               </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-4/5 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/5"></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {suggestedFields.map((field, index) => (
                    <div key={index} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        checked={field.selected}
                        onCheckedChange={() => handleFieldToggle(index)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium">{field.label}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{field.description}</p>
                        {field.options && (
                          <div className="mt-3">
                            <p className="text-xs font-medium mb-3">Options:</p>
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {field.options.map((option, optIndex) => (
                                  <Badge key={optIndex} variant="secondary" className="text-xs flex items-center gap-1 pr-1">
                                    <span>{option}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-3 w-3 p-0 hover:bg-red-100 rounded-full"
                                      onClick={() => handleRemoveOption(index, optIndex)}
                                    >
                                      <X className="h-2 w-2 text-red-500" />
                                    </Button>
                                  </Badge>
                                ))}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <Input
                                  type="text"
                                  placeholder="Add new option..."
                                  value={newOptionInputs[index] || ''}
                                  onChange={(e) => handleNewOptionInputChange(index, e.target.value)}
                                  className="text-xs h-7"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddOption(index);
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2"
                                  onClick={() => handleAddOption(index)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between pt-6">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button onClick={handleFinishSetup} disabled={isLoading}>
                      {isLoading ? 'Setting up...' : 'Complete Setup'}
                      <Check className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 