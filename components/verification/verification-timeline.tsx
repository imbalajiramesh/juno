import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Circle } from 'lucide-react';

interface VerificationStep {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  cost: number;
  benefits: string[];
  status: 'completed' | 'in_progress' | 'pending' | 'failed';
  requirements?: string[];
  isRecurring?: boolean;
  recurringCost?: string;
}

interface VerificationTimelineProps {
  phoneNumber: any;
  complianceData?: any;
  onStepClick?: (stepId: string) => void;
}

const StatusIcon = ({ status }: { status: VerificationStep['status'] }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'in_progress':
      return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
    case 'failed':
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Circle className="h-5 w-5 text-gray-300" />;
  }
};

const StatusBadge = ({ status }: { status: VerificationStep['status'] }) => {
  const variants = {
    completed: 'bg-green-100 text-green-800',
    in_progress: 'bg-blue-100 text-blue-800',
    failed: 'bg-red-100 text-red-800',
    pending: 'bg-gray-100 text-gray-800'
  };

  const labels = {
    completed: 'Completed',
    in_progress: 'In Progress',
    failed: 'Failed',
    pending: 'Pending'
  };

  return (
    <Badge className={variants[status]}>
      {labels[status]}
    </Badge>
  );
};

export function VerificationTimeline({ phoneNumber, complianceData, onStepClick }: VerificationTimelineProps) {
  const verificationSteps: VerificationStep[] = [
    {
      id: 'brand_registration',
      title: 'Brand Registration',
      description: 'Register your business identity with carriers to enable professional SMS messaging',
      estimatedTime: '1-3 business days',
      cost: 800, // Low volume pricing as default
      benefits: [
        'Establishes business credibility with carriers',
        'Required foundation for all business SMS in the US',
        'Enables up to 6,000 message segments per day',
        'Works with multiple phone numbers',
        'Reduces message filtering and improves delivery'
      ],
      requirements: [
        'Business Tax ID (EIN)',
        'Business registration documents',
        'Valid business website'
      ],
      status: complianceData?.dlc_brand_registered ? 'completed' : 'pending'
    },
    {
      id: 'campaign_setup',
      title: 'Campaign Registration',
      description: 'Register your specific messaging use cases and compliance procedures with carriers',
      estimatedTime: '1-3 business days', 
      cost: 4000,
      benefits: [
        'Legally compliant messaging framework',
        'Defines your specific messaging use cases',
        'Ensures proper customer consent procedures',
        'Reduces message blocking and filtering',
        'Professional messaging compliance'
      ],
      requirements: [
        'Approved brand registration',
        'Defined messaging use case',
        'Customer opt-in/opt-out procedures'
      ],
      status: complianceData?.dlc_campaign_registered ? 'completed' : 
               complianceData?.dlc_brand_registered ? 'pending' : 'pending',
      isRecurring: true,
      recurringCost: '400-2,500 credits/month'
    }
  ];

  return (
    <div className="space-y-4">
      {verificationSteps.map((step, index) => (
        <Card 
          key={step.id} 
          className={`transition-all duration-200 ${
            step.id === 'brand_registration' ? 'ring-2 ring-blue-500 border-blue-200' : ''
          } ${step.status === 'completed' ? 'bg-green-50 border-green-200' : ''}`}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Step Number & Status Icon */}
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-gray-200 text-sm font-medium">
                  {index + 1}
                </div>
                {index < verificationSteps.length - 1 && (
                  <div className="w-px h-12 bg-gray-200 mt-2"></div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <StatusIcon status={step.status} />
                  <h3 className="font-medium text-gray-900">{step.title}</h3>
                  <StatusBadge status={step.status} />
                  <span className="text-sm text-gray-500 ml-auto">{step.estimatedTime}</span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{step.description}</p>
                
                {step.requirements && step.requirements.length > 0 && (
                  <div className="space-y-1">
                    {step.requirements.map((requirement, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        <span>{requirement}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Cost:</span>
                    <span className="text-lg font-bold text-blue-600">
                      {step.cost.toLocaleString()} credits
                    </span>
                  </div>
                  
                  {step.isRecurring && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Monthly:</span>
                      <span className="text-sm font-medium text-orange-600">
                        {step.recurringCost}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 