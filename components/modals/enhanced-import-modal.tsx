import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from 'sonner';
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Info 
} from "lucide-react";

interface EnhancedImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface CustomField {
  name: string;
  label: string;
  type: string;
  required: boolean;
}

export function EnhancedImportModal({ isOpen, onClose, onImportComplete }: EnhancedImportModalProps) {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customerStatuses, setCustomerStatuses] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<'select' | 'uploading' | 'complete'>('select');
  const [uploadResults, setUploadResults] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCustomFields();
      fetchCustomerStatuses();
    }
  }, [isOpen]);

  const fetchCustomFields = async () => {
    try {
      const response = await fetch('/api/custom-fields');
      if (response.ok) {
        const fields = await response.json();
        setCustomFields(fields);
      }
    } catch (error) {
      console.error('Error fetching custom fields:', error);
    }
  };

  const fetchCustomerStatuses = async () => {
    try {
      const response = await fetch('/api/customer-statuses');
      if (response.ok) {
        const statuses = await response.json();
        setCustomerStatuses(statuses);
      }
    } catch (error) {
      console.error('Error fetching customer statuses:', error);
    }
  };

  const standardColumns = [
    { name: 'First_Name', label: 'First Name', required: true, description: 'Customer\'s first name' },
    { name: 'Last_Name', label: 'Last Name', required: true, description: 'Customer\'s last name' },
    { name: 'Email', label: 'Email', required: false, description: 'Customer\'s email address' },
    { name: 'Phone_Number', label: 'Phone Number', required: false, description: 'Customer\'s phone number' },
    { name: 'Address', label: 'Address', required: false, description: 'Customer\'s address' },
    { name: 'ZIP_Code', label: 'ZIP Code', required: false, description: 'Customer\'s ZIP/postal code' },
    { name: 'Status', label: 'Status', required: false, description: 'Customer status (defaults to "new")' },
    { name: 'Notes', label: 'Notes', required: false, description: 'Additional notes about the customer' },
  ];

  const agentInteractionColumns = [
      { name: 'Total_Juno_Calls', label: 'Total Juno Calls', required: false, description: 'Number of voice calls with Juno AI (numeric)' },
  { name: 'Total_Juno_Emails', label: 'Total Juno Emails', required: false, description: 'Number of emails sent by Juno AI (numeric)' },
  { name: 'Total_Juno_SMS', label: 'Total Juno SMS', required: false, description: 'Number of SMS sent by Juno AI (numeric)' },
  { name: 'Juno_Call_Duration_Total', label: 'Total Call Duration', required: false, description: 'Total minutes of Juno calls (numeric)' },
  { name: 'Last_Juno_Call_Date', label: 'Last Juno Call Date', required: false, description: 'Date of last Juno call (YYYY-MM-DD format)' },
  { name: 'Last_Juno_Interaction_Type', label: 'Last Juno Interaction', required: false, description: 'Type of last Juno interaction (call/email/sms)' },
  { name: 'Last_Juno_Interaction_Date', label: 'Last Juno Interaction Date', required: false, description: 'Date of last Juno interaction (YYYY-MM-DD format)' },
  ];

  // Helper function to convert label to consistent column name format
  const labelToColumnName = (label: string) => {
    return label.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  };

  const generateSampleCSV = () => {
    const headers = [
      ...standardColumns.map(col => col.name),
      ...agentInteractionColumns.map(col => col.name),
      ...customFields.map(field => labelToColumnName(field.label))
    ];

    const sampleData = [
      'John',
      'Doe',
      'john.doe@example.com',
      '+1234567890',
      '123 Main St',
      '12345',
      customerStatuses[0]?.name || 'new',
      'Sample customer note',
      // Agent interaction sample data
          '5', // Total_Juno_Calls
    '3', // Total_Juno_Emails
    '2', // Total_Juno_SMS
    '25', // Juno_Call_Duration_Total
    '2024-01-20', // Last_Juno_Call_Date
    'call', // Last_Juno_Interaction_Type
    '2024-01-20', // Last_Juno_Interaction_Date
      ...customFields.map(field => {
        switch (field.type) {
          case 'boolean': return 'true';
          case 'number': return '100';
          case 'date': return '2024-01-15';
          case 'select': return 'Option 1';
          default: return 'Sample value';
        }
      })
    ];

    const csvContent = [
      headers.join(','),
      sampleData.join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer_import_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.success('Sample CSV template downloaded');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStep('uploading');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/customers/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import customers');
      }

      const results = await response.json();
      setUploadResults(results);
      setUploadStep('complete');
      toast.success(`Successfully imported ${results.count} customers`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import customers');
      setUploadStep('select');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setUploadStep('select');
    setUploadResults(null);
    onClose();
    if (uploadResults?.count > 0) {
      onImportComplete();
    }
  };

  const resetUpload = () => {
    setUploadStep('select');
    setUploadResults(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Customers
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple customers at once
          </DialogDescription>
        </DialogHeader>

        {uploadStep === 'select' && (
          <div className="space-y-6">
            {/* File Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Upload CSV File
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="cursor-pointer"
                    >
                      <Button asChild>
                        <span>Choose CSV File</span>
                      </Button>
                    </label>
                    <p className="mt-2 text-sm text-gray-500">
                      Select a CSV file with your customer data
                    </p>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  onClick={generateSampleCSV}
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Sample CSV Template
                </Button>
              </CardContent>
            </Card>

            {/* Column Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Column Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your CSV file should have column headers in the first row. Column names must match exactly as shown below (case-sensitive). 
                  </AlertDescription>
                </Alert>
                
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Pro tip:</strong> For custom fields, use underscores instead of spaces (e.g., "Company_Size" instead of "Company Size") 
                    for consistency with standard columns.
                  </AlertDescription>
                </Alert>

                <div>
                  <h4 className="font-medium mb-3">Standard Columns</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {standardColumns.map((column) => (
                      <div key={column.name} className="flex items-start justify-between p-3 border rounded">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {column.name}
                            </code>
                            {column.required && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{column.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {customerStatuses.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Available Status Values</h4>
                    <div className="flex flex-wrap gap-2">
                      {customerStatuses.map((status) => (
                        <Badge key={status.name} variant="outline">
                          {status.name} ({status.label})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Separator />
                  <h4 className="font-medium mb-3 mt-4">Agent Interaction Columns (Optional)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {agentInteractionColumns.map((column) => (
                      <div key={column.name} className="flex items-start justify-between p-3 border rounded">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="text-sm bg-blue-50 px-2 py-1 rounded border border-blue-200">
                              {column.name}
                            </code>
                            <Badge variant="outline" className="text-xs">Optional</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{column.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {customFields.length > 0 && (
                  <div>
                    <Separator />
                    <h4 className="font-medium mb-3 mt-4">Custom Fields</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {customFields.map((field) => (
                        <div key={field.name} className="flex items-start justify-between p-3 border rounded">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                {labelToColumnName(field.label)}
                              </code>
                              {field.required && (
                                <Badge variant="destructive" className="text-xs">Required</Badge>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                {field.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              Custom field: {field.label}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {uploadStep === 'uploading' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-lg font-medium">Importing customers...</p>
            <p className="text-sm text-gray-600">Please wait while we process your file</p>
          </div>
        )}

        {uploadStep === 'complete' && uploadResults && (
          <div className="text-center py-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <div>
              <h3 className="text-lg font-medium">Import Successful!</h3>
              <p className="text-gray-600">
                Successfully imported {uploadResults.count} customers
              </p>
            </div>
            
            <div className="flex gap-3 justify-center">
              <Button onClick={resetUpload} variant="outline">
                Import Another File
              </Button>
              <Button onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        )}

        {uploadStep === 'select' && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
} 