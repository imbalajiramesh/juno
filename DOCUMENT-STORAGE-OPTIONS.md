# Document Storage Options for Organization Approval System

## Overview
The organization approval system includes document upload and viewing capabilities. Here are the recommended storage options for production deployment.

## Storage Options

### 1. Local File System (Development Only)
```javascript
// Store files in project directory
const uploadPath = join(process.cwd(), 'uploads', tenantId, fileName);
```
**Pros:** Simple, no external dependencies
**Cons:** Not suitable for production, doesn't scale, no backup

### 2. Supabase Storage (Recommended)
```javascript
// Upload to Supabase Storage bucket
const { data, error } = await supabase.storage
  .from('organization-documents')
  .upload(`${tenantId}/${fileName}`, file);
```
**Pros:** 
- Integrates with existing Supabase setup
- Built-in CDN and backup
- Secure access controls
- Scalable

**Implementation:**
```javascript
// Create bucket with RLS policies
CREATE POLICY "Super admins can access all documents" 
ON storage.objects FOR ALL 
USING (bucket_id = 'organization-documents' AND is_super_admin());

CREATE POLICY "Users can upload to their tenant folder" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'organization-documents' AND 
           auth.uid()::text = get_user_tenant_id());
```

### 3. AWS S3 (Enterprise)
```javascript
// Upload to S3 bucket
const uploadParams = {
  Bucket: 'juno-organization-docs',
  Key: `${tenantId}/${fileName}`,
  Body: fileBuffer,
  ContentType: mimeType
};
```
**Pros:** Highly scalable, enterprise-grade, advanced features
**Cons:** Additional complexity, cost considerations

### 4. Cloudinary (Media-Optimized)
```javascript
// Upload with automatic optimization
const result = await cloudinary.uploader.upload(filePath, {
  folder: `organizations/${tenantId}`,
  resource_type: 'auto'
});
```
**Pros:** Automatic image/document optimization, transformations
**Cons:** Cost for large volumes

## Security Considerations

### Access Control
- Only super admins can view all documents
- Organization admins can only access their own documents
- Implement signed URLs for time-limited access

### File Validation
```javascript
const allowedTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
];

const maxFileSize = 10 * 1024 * 1024; // 10MB
```

### Virus Scanning
Consider integrating virus scanning for uploaded documents:
- ClamAV for self-hosted solutions
- AWS CloudWatch for S3
- Supabase Edge Functions with antivirus

## Implementation Steps

### Phase 1: Basic File Storage
1. Choose storage provider (recommend Supabase Storage)
2. Create storage bucket with proper policies
3. Update document upload API to save files
4. Update document viewing API to serve files

### Phase 2: Enhanced Features
1. File thumbnails for images
2. PDF preview generation
3. File compression
4. Audit logging for document access

### Phase 3: Advanced Features
1. Document version history
2. Digital signatures
3. Automated compliance checking
4. OCR text extraction

## Example Implementation (Supabase Storage)

### Upload Document
```javascript
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const tenantId = formData.get('tenantId') as string;
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('organization-documents')
    .upload(`${tenantId}/${file.name}`, file);
    
  if (error) throw error;
  
  // Save metadata to database
  const { data: document } = await supabase
    .from('organization_documents')
    .insert({
      tenant_id: tenantId,
      file_name: file.name,
      file_path: data.path,
      file_size: file.size,
      mime_type: file.type
    });
}
```

### View Document
```javascript
export async function GET(request: NextRequest, { params }) {
  const { data: doc } = await supabase
    .from('organization_documents')
    .select('*')
    .eq('id', params.id)
    .single();
    
  // Get signed URL for secure access
  const { data } = await supabase.storage
    .from('organization-documents')
    .createSignedUrl(doc.file_path, 3600); // 1 hour expiry
    
  return NextResponse.redirect(data.signedUrl);
}
```

## Recommended Production Setup

**For Juno CRM:** Use Supabase Storage with the following configuration:
1. Create `organization-documents` bucket
2. Enable RLS with tenant-based policies
3. Set up automatic backup
4. Configure CDN for faster access
5. Implement file size limits (10MB per file)
6. Add virus scanning via Edge Functions

This provides a secure, scalable, and cost-effective solution that integrates seamlessly with the existing Supabase infrastructure. 