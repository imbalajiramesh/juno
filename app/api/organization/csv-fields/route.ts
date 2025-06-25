import { NextRequest, NextResponse } from 'next/server';
import { withTenant } from '@/lib/get-tenant';

function inferFieldType(values: string[]): 'string' | 'number' | 'boolean' | 'date' | 'select' {
  const nonEmptyValues = values.filter(v => v && v.trim() !== '');
  
  if (nonEmptyValues.length === 0) return 'string';

  // Check for boolean values
  const booleanPattern = /^(true|false|yes|no|y|n|1|0)$/i;
  if (nonEmptyValues.every(val => booleanPattern.test(val.trim()))) {
    return 'boolean';
  }

  // Check for numbers
  const numberPattern = /^-?\d+\.?\d*$/;
  if (nonEmptyValues.every(val => numberPattern.test(val.trim()))) {
    return 'number';
  }

  // Check for dates
  const datePattern = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$|^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/;
  if (nonEmptyValues.some(val => datePattern.test(val.trim()))) {
    return 'date';
  }

  // Check for select fields (limited unique values)
  const uniqueValues = Array.from(new Set(nonEmptyValues.map(v => v.trim())));
  if (uniqueValues.length <= 10 && uniqueValues.length < nonEmptyValues.length * 0.5) {
    return 'select';
  }

  return 'string';
}

function generateFieldName(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
}

function generateFieldDescription(name: string, type: string, sampleValues: string[]): string {
  const cleanName = name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const sampleText = sampleValues.slice(0, 3).join(', ');
  
  const typeDescriptions = {
    string: 'text field',
    number: 'numeric value',
    boolean: 'yes/no field',
    date: 'date field',
    select: 'dropdown selection'
  };

  return `${cleanName} (${typeDescriptions[type as keyof typeof typeDescriptions]})${sampleText ? ` - Examples: ${sampleText}` : ''}`;
}

export const POST = withTenant(async (tenantId: string, req: NextRequest) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const csvContent = await file.text();
    
    // Simple CSV parsing without external library
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file appears to be empty or invalid' },
        { status: 400 }
      );
    }

    const csvHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const records = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const record: any = {};
      csvHeaders.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      return record;
    });

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'CSV file appears to be empty' },
        { status: 400 }
      );
    }
    const suggestedFields = [];

    // Skip common CRM fields that already exist
    const skipFields = ['first_name', 'last_name', 'email', 'phone', 'phone_number', 'address', 'status'];

    for (const header of csvHeaders) {
      const fieldName = generateFieldName(header);
      
      // Skip if it's a common field we already have
      if (skipFields.some(skip => fieldName.includes(skip) || skip.includes(fieldName))) {
        continue;
      }

             const columnValues = records.map((record: any) => record[header] || '');
       const fieldType = inferFieldType(columnValues);
       
       const suggestedField: any = {
         name: fieldName,
         label: header,
         type: fieldType,
         required: false,
         description: generateFieldDescription(fieldName, fieldType, columnValues.filter((v: any) => v).slice(0, 3))
       };

       // Add options for select fields
       if (fieldType === 'select') {
         const uniqueValues = Array.from(new Set(columnValues.filter((v: any) => v && v.trim() !== '').map((v: any) => v.trim())));
         suggestedField.options = uniqueValues.slice(0, 20); // Limit to 20 options
       }

      suggestedFields.push(suggestedField);
    }

    return NextResponse.json({ 
      success: true, 
      fields: suggestedFields,
      totalRecords: records.length,
      fileName: file.name
    });

  } catch (error) {
    console.error('Error analyzing CSV:', error);
    return NextResponse.json(
      { error: 'Failed to analyze CSV file' },
      { status: 500 }
    );
  }
}); 