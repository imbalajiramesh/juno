'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Upload, FileText, CheckCircle, XCircle, Clock, AlertCircle, Trash2 } from 'lucide-react';

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  file_size: number;
  status: string;
  upload_date: string;
  rejection_reason?: string;
}

interface OrganizationStatus {
  approval_status: string;
  rejection_reason?: string;
  additional_info_requested?: string;
}

const DOCUMENT_TYPES = {
  business_registration: {
    name: 'Business Registration',
    description: 'Articles of incorporation, business license, or registration certificate',
    required: true
  },
  tax_id: {
    name: 'Tax ID',
    description: 'EIN (Employer Identification Number) or tax registration certificate',
    required: true
  },
  address_proof: {
    name: 'Address Proof',
    description: 'Utility bill, lease agreement, or property tax statement',
    required: true
  },
  business_license: {
    name: 'Business License',
    description: 'Professional license or permit (if applicable)',
    required: false
  },
  partnership_agreement: {
    name: 'Partnership Agreement',
    description: 'For partnerships and LLCs',
    required: false
  },
  duns_number: {
    name: 'DUNS Number',
    description: 'For larger businesses (10DLC compliance)',
    required: false
  },
  website_verification: {
    name: 'Website Verification',
    description: 'Screenshot or verification of business website',
    required: false
  },
  privacy_policy: {
    name: 'Privacy Policy',
    description: 'Your website\'s privacy policy document',
    required: true
  },
  terms_of_service: {
    name: 'Terms of Service',
    description: 'Your website\'s terms of service document',
    required: true
  },
  message_templates: {
    name: 'Message Templates',
    description: 'Sample SMS/email templates you plan to use',
    required: true
  },
  opt_in_flow: {
    name: 'Opt-in Flow',
    description: 'Documentation of your customer consent process',
    required: true
  }
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [orgStatus, setOrgStatus] = useState<OrganizationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch real documents and organization status
      const [documentsResponse, statusResponse] = await Promise.all([
        fetch('/api/documents'),
        fetch('/api/organization/status')
      ]);

      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json();
        setDocuments(documentsData);
      } else {
        console.error('Failed to fetch documents:', documentsResponse.status);
        setDocuments([]);
      }

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setOrgStatus(statusData);
      } else {
        console.error('Failed to fetch organization status:', statusResponse.status);
        setOrgStatus({ approval_status: 'pending' });
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
      setDocuments([]);
      setOrgStatus({ approval_status: 'pending' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF, JPG, or PNG file');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedDocType) {
      toast.error('Please select a file and document type');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create form data for real upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('document_type', selectedDocType);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      // Upload to real API
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        const result = await response.json();
        toast.success('Document uploaded successfully and is pending review');
        setUploadDialog(false);
        setSelectedFile(null);
        setSelectedDocType('');
        fetchData(); // Refresh the documents list
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      // TODO: Implement delete after migration
      toast.success('Document deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete document');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      approved: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      rejected: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`w-3 h-3 ${config.color}`} />
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getCompletionStatus = () => {
    const requiredDocs = Object.entries(DOCUMENT_TYPES).filter(([_, info]) => info.required);
    const uploadedRequiredDocs = documents.filter(doc => 
      requiredDocs.some(([type]) => type === doc.document_type) && 
      doc.status === 'approved'
    );
    
    return {
      completed: uploadedRequiredDocs.length,
      total: requiredDocs.length,
      percentage: Math.round((uploadedRequiredDocs.length / requiredDocs.length) * 100)
    };
  };

  const getOrgStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
      approved: { variant: 'default' as const, icon: CheckCircle, color: 'bg-green-100 text-green-800' },
      rejected: { variant: 'destructive' as const, icon: XCircle, color: 'bg-red-100 text-red-800' },
      requires_more_info: { variant: 'outline' as const, icon: AlertCircle, color: 'bg-orange-100 text-orange-800' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="w-4 h-4" />
        {status.replace('_', ' ').toUpperCase()}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  const completionStatus = getCompletionStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organization Documents</h1>
        <p className="text-gray-600">Upload and manage your business verification documents</p>
      </div>

      {/* Organization Status */}
      {orgStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Organization Status
              {getOrgStatusBadge(orgStatus.approval_status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orgStatus.approval_status === 'pending' && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Your organization is pending approval. Please ensure all required documents are uploaded and approved.
                </AlertDescription>
              </Alert>
            )}
            
            {orgStatus.approval_status === 'requires_more_info' && orgStatus.additional_info_requested && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Additional information required:</strong> {orgStatus.additional_info_requested}
                </AlertDescription>
              </Alert>
            )}
            
            {orgStatus.approval_status === 'rejected' && orgStatus.rejection_reason && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Application rejected:</strong> {orgStatus.rejection_reason}
                </AlertDescription>
              </Alert>
            )}

            {orgStatus.approval_status === 'approved' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Congratulations! Your organization has been approved and all features are now available.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completion Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Document Completion</CardTitle>
          <CardDescription>
            {completionStatus.completed} of {completionStatus.total} required documents approved
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={completionStatus.percentage} className="w-full" />
            <p className="text-sm text-gray-600">
              {completionStatus.percentage}% complete
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Document Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Your Documents
            <Button onClick={() => setUploadDialog(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </CardTitle>
          <CardDescription>Manage your uploaded business documents</CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No documents uploaded yet</p>
              <p className="text-sm text-gray-500">Upload your first document to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div>
                      <h3 className="font-medium">{DOCUMENT_TYPES[doc.document_type as keyof typeof DOCUMENT_TYPES]?.name || doc.document_type}</h3>
                      <p className="text-sm text-gray-600">{doc.file_name}</p>
                      <p className="text-xs text-gray-500">
                        Uploaded {new Date(doc.upload_date).toLocaleDateString()}
                      </p>
                      {doc.rejection_reason && (
                        <p className="text-xs text-red-600 mt-1">
                          Rejected: {doc.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(doc.status)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Required Documents Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Required Documents Checklist</CardTitle>
          <CardDescription>Ensure you have all required documents for approval</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(DOCUMENT_TYPES).map(([type, info]) => {
              const uploadedDoc = documents.find(doc => doc.document_type === type);
              const isUploaded = !!uploadedDoc;
              const isApproved = uploadedDoc?.status === 'approved';
              
              return (
                <div key={type} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="mt-1">
                    {isApproved ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : isUploaded ? (
                      <Clock className="w-5 h-5 text-yellow-600" />
                    ) : (
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{info.name}</h4>
                      {info.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                    </div>
                    <p className="text-sm text-gray-600">{info.description}</p>
                    {uploadedDoc && (
                      <p className="text-xs text-gray-500 mt-1">
                        Status: {uploadedDoc.status}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl">Upload Document</DialogTitle>
            <DialogDescription className="text-base">
              Upload a business document for verification. Accepted formats: PDF, JPG, PNG (max 10MB)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="document_type" className="text-sm font-medium">Document Type</Label>
              <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPES).map(([type, info]) => (
                    <SelectItem key={type} value={type}>
                      {info.name} {info.required && '(Required)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file" className="text-sm font-medium">File</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                disabled={uploading}
                className="cursor-pointer"
              />
              {selectedFile && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Selected:</span> {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>

            {uploading && (
              <div className="space-y-3 pt-2">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-gray-600 text-center">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setUploadDialog(false)} 
              disabled={uploading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || !selectedDocType || uploading}
              className="flex-1"
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 