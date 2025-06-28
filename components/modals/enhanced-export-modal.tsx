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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from 'sonner';
import { 
  Download, 
  FileText, 
  Users,
  Info,
  CheckCircle2
} from "lucide-react";

interface EnhancedExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomers?: string[];
  totalCustomers: number;
}

interface CustomField {
  name: string;
  label: string;
  type: string;
}

interface ExportColumn {
  key: string;
  label: string;
  category: 'standard' | 'custom';
  enabled: boolean;
}

export function EnhancedExportModal({ 
  isOpen, 
  onClose, 
  selectedCustomers = [], 
  totalCustomers 
}: EnhancedExportModalProps) {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [exportColumns, setExportColumns] = useState<ExportColumn[]>([]);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [estimatedFileSize, setEstimatedFileSize] = useState('');

  const standardColumns: ExportColumn[] = [
    { key: 'first_name', label: 'First Name', category: 'standard', enabled: true },
    { key: 'last_name', label: 'Last Name', category: 'standard', enabled: true },
    { key: 'email', label: 'Email', category: 'standard', enabled: true },
    { key: 'phone_number', label: 'Phone Number', category: 'standard', enabled: true },
    { key: 'address', label: 'Address', category: 'standard', enabled: false },
    { key: 'zip_code', label: 'ZIP Code', category: 'standard', enabled: false },
    { key: 'status', label: 'Status', category: 'standard', enabled: true },
    { key: 'created_at', label: 'Created Date', category: 'standard', enabled: false },
    { key: 'updated_at', label: 'Last Updated', category: 'standard', enabled: false },
    { key: 'notes', label: 'Notes', category: 'standard', enabled: false },
  ];

  const agentInteractionColumns: ExportColumn[] = [
    { key: 'total_juno_calls', label: 'Total Juno Calls', category: 'standard', enabled: false },
    { key: 'total_juno_emails', label: 'Total Juno Emails', category: 'standard', enabled: false },
    { key: 'total_juno_sms', label: 'Total Juno SMS', category: 'standard', enabled: false },
    { key: 'juno_call_duration_total', label: 'Total Call Duration (mins)', category: 'standard', enabled: false },
    { key: 'last_juno_call_date', label: 'Last Juno Call Date', category: 'standard', enabled: false },
    { key: 'last_juno_interaction_type', label: 'Last Juno Interaction Type', category: 'standard', enabled: false },
    { key: 'last_juno_interaction_date', label: 'Last Juno Interaction Date', category: 'standard', enabled: false },
  ];

  useEffect(() => {
    if (isOpen) {
      fetchCustomFields();
    }
  }, [isOpen]);

  useEffect(() => {
    // Initialize export columns when custom fields are loaded
    const customCols: ExportColumn[] = customFields.map(field => ({
      key: field.name,
      label: field.label,
      category: 'custom',
      enabled: false
    }));

    setExportColumns([...standardColumns, ...agentInteractionColumns, ...customCols]);
  }, [customFields]);

  useEffect(() => {
    // Calculate estimated file size
    const enabledColumnsCount = exportColumns.filter(col => col.enabled).length;
    const rowCount = selectedCustomers.length > 0 ? selectedCustomers.length : totalCustomers;
    
    if (enabledColumnsCount > 0 && rowCount > 0) {
      // Rough estimation: ~50 bytes per cell for CSV, ~80 for XLSX
      const bytesPerCell = exportFormat === 'csv' ? 50 : 80;
      const estimatedBytes = rowCount * enabledColumnsCount * bytesPerCell;
      
      if (estimatedBytes < 1024) {
        setEstimatedFileSize(`${estimatedBytes} bytes`);
      } else if (estimatedBytes < 1024 * 1024) {
        setEstimatedFileSize(`${(estimatedBytes / 1024).toFixed(1)} KB`);
      } else {
        setEstimatedFileSize(`${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`);
      }
    } else {
      setEstimatedFileSize('0 bytes');
    }
  }, [exportColumns, exportFormat, selectedCustomers.length, totalCustomers]);

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

  const toggleColumn = (columnKey: string) => {
    setExportColumns(prev => 
      prev.map(col => 
        col.key === columnKey ? { ...col, enabled: !col.enabled } : col
      )
    );
  };

  const selectAllStandard = () => {
    setExportColumns(prev => 
      prev.map(col => 
        (col.category === 'standard' && !agentInteractionColumns.some(agentCol => agentCol.key === col.key)) 
          ? { ...col, enabled: true } : col
      )
    );
  };

  const selectAllAgent = () => {
    setExportColumns(prev => 
      prev.map(col => 
        agentInteractionColumns.some(agentCol => agentCol.key === col.key) 
          ? { ...col, enabled: true } : col
      )
    );
  };

  const selectAllCustom = () => {
    setExportColumns(prev => 
      prev.map(col => 
        col.category === 'custom' ? { ...col, enabled: true } : col
      )
    );
  };

  const deselectAll = () => {
    setExportColumns(prev => 
      prev.map(col => ({ ...col, enabled: false }))
    );
  };

  const handleExport = async () => {
    const enabledColumns = exportColumns.filter(col => col.enabled);
    
    if (enabledColumns.length === 0) {
      toast.error('Please select at least one column to export');
      return;
    }

    setIsExporting(true);

    try {
      const params = new URLSearchParams();
      params.append('format', exportFormat);
      params.append('columns', enabledColumns.map(col => col.key).join(','));
      
      if (selectedCustomers.length > 0) {
        params.append('customerIds', selectedCustomers.join(','));
      }

      const response = await fetch(`/api/customers/export?${params.toString()}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to export customers');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const filename = `customers_export_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      const customerCount = selectedCustomers.length > 0 ? selectedCustomers.length : totalCustomers;
      toast.success(`Successfully exported ${customerCount} customers`);
      onClose();
    } catch (error) {
      toast.error('Failed to export customers');
    } finally {
      setIsExporting(false);
    }
  };

  const standardCols = exportColumns.filter(col => 
    col.category === 'standard' && !agentInteractionColumns.some(agentCol => agentCol.key === col.key)
  );
  const agentCols = exportColumns.filter(col => 
    col.category === 'standard' && agentInteractionColumns.some(agentCol => agentCol.key === col.key)
  );
  const customCols = exportColumns.filter(col => col.category === 'custom');
  const enabledCount = exportColumns.filter(col => col.enabled).length;
  const exportCount = selectedCustomers.length > 0 ? selectedCustomers.length : totalCustomers;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Customers
          </DialogTitle>
          <DialogDescription>
            Select columns and format to export your customer data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5" />
                Export Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">Customers</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">{exportCount}</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">Columns</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900">{enabledCount}</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-600">Format</span>
                  </div>
                  <div className="text-lg font-bold text-purple-900 uppercase">{exportFormat}</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Download className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-600">Est. Size</span>
                  </div>
                  <div className="text-lg font-bold text-orange-900">{estimatedFileSize}</div>
                </div>
              </div>

              {selectedCustomers.length > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Exporting {selectedCustomers.length} selected customers out of {totalCustomers} total customers.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Format Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export Format</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={exportFormat} onValueChange={(value: 'csv' | 'xlsx') => setExportFormat(value)}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600 mt-2">
                {exportFormat === 'csv' 
                  ? 'CSV format is compatible with most spreadsheet applications'
                  : 'Excel format preserves formatting and is ideal for Excel users'
                }
              </p>
            </CardContent>
          </Card>

          {/* Column Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Columns</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={selectAllStandard}>
                  Select All Standard
                </Button>
                <Button variant="outline" size="sm" onClick={selectAllAgent}>
                  Select All Agent Data
                </Button>
                {customCols.length > 0 && (
                  <Button variant="outline" size="sm" onClick={selectAllCustom}>
                    Select All Custom
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Deselect All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Standard Columns */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  Standard Columns
                  <Badge variant="secondary">{standardCols.filter(col => col.enabled).length}/{standardCols.length}</Badge>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {standardCols.map((column) => (
                    <div key={column.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={column.key}
                        checked={column.enabled}
                        onCheckedChange={() => toggleColumn(column.key)}
                      />
                      <label
                        htmlFor={column.key}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {column.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agent Interaction Columns */}
              <div>
                <Separator />
                <h4 className="font-medium mb-3 mt-4 flex items-center gap-2">
                  Agent Interaction Data
                  <Badge variant="secondary">{agentCols.filter(col => col.enabled).length}/{agentCols.length}</Badge>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {agentCols.map((column) => (
                    <div key={column.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={column.key}
                        checked={column.enabled}
                        onCheckedChange={() => toggleColumn(column.key)}
                      />
                      <label
                        htmlFor={column.key}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {column.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Columns */}
              {customCols.length > 0 && (
                <div>
                  <Separator />
                  <h4 className="font-medium mb-3 mt-4 flex items-center gap-2">
                    Custom Fields
                    <Badge variant="secondary">{customCols.filter(col => col.enabled).length}/{customCols.length}</Badge>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {customCols.map((column) => (
                      <div key={column.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={column.key}
                          checked={column.enabled}
                          onCheckedChange={() => toggleColumn(column.key)}
                        />
                        <label
                          htmlFor={column.key}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {column.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || enabledCount === 0}
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {exportCount} Customers
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 