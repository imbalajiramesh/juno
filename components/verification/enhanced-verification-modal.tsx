'use client';

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { VerificationTimeline } from './verification-timeline';
import { CheckCircle, Clock, AlertTriangle, Info, Zap, Shield, Smartphone, Building } from 'lucide-react';
import { toast } from 'sonner';

interface PhoneNumber {
  id: string;
  phone_number: string;
  status: string;
}

interface ComplianceData {
  dlc_brand_registered: boolean;
  dlc_campaign_registered: boolean;
  phone_verified: boolean;
  carrier_verified: boolean;
  dlc_brand_id?: string;
  dlc_campaign_id?: string;
  phone_verification_id?: string;
  carrier_verification_id?: string;
  dlc_campaign_status?: string;
  services_available?: {
    dlc_brand_registration: { cost: number; description: string };
    dlc_campaign_registration: { cost: number; description: string };
    phone_verification: { cost: number; description: string };
    carrier_verification: { cost: number; description: string };
  };
}

interface EnhancedVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: any;
  onVerificationStart: (serviceId: string) => void;
  complianceData?: any;
  creditBalance?: number;
  organizationStatus?: 'approved' | 'pending' | 'rejected' | null;
}

const verificationServices = [
  {
    id: 'brand_registration_low',
    name: 'Low Volume Brand Registration',
    cost: 800,
    timeline: '1-3 business days',
    description: 'Register your business identity with carriers to enable professional SMS messaging and enhanced caller ID',
    explanation: 'Brand Registration transforms how your business appears to customers. Instead of showing just a phone number, your calls and texts will display your business name and verified status. This dramatically improves answer rates and customer trust.',
    benefits: [
      '🏢 Business name displays on caller ID instead of just numbers',
      '✅ "Verified" badges and trust indicators from carriers',
      '📞 Higher answer rates and customer engagement',
      '🛡️ Dramatically reduces spam filtering and blocking',
      '📱 Required foundation for all business SMS in the US',
      '🔢 Works with multiple phone numbers under your brand'
    ],
    process: [
      'Business information verification',
      'Document review by The Campaign Registry',
      'Carrier approval and caller ID registration',
      'Business name propagation to carrier networks'
    ],
    requirements: ['Business Tax ID (EIN)', 'Business registration documents'],
    isOneTime: true,
    category: 'Brand Registration',
    volumeInfo: 'Low Volume: Suitable for businesses sending up to 6,000 message segments per day. Perfect for most small to medium businesses.',
    callerIdExample: {
      before: '(555) 123-4567',
      after: 'ABC Plumbing ✓ (555) 123-4567'
    }
  },
  {
    id: 'brand_registration_high',
    name: 'High Volume Brand Registration',
    cost: 10000,
    timeline: '3-5 business days',
    description: 'Premium business registration for high-volume messaging with enhanced caller ID and trust scoring',
    explanation: 'High Volume Brand Registration provides premium caller ID enhancement with enhanced trust scoring. Your business gets priority treatment from carriers, resulting in even better caller ID display, higher answer rates, and premium delivery status.',
    benefits: [
      '🏢 Premium business name display with enhanced formatting',
      '⭐ Premium "Verified Business" status with carriers',
      '📞 Maximum answer rates with priority caller ID display',
      '🚀 Up to 600,000 message segments per day capacity',
      '⚡ Priority message routing and processing',
      '🔐 Comprehensive secondary vetting for maximum trust'
    ],
    process: [
      'Enhanced business verification',
      'Comprehensive document review',
      'Premium caller ID registration with carriers',
      'Premium brand status activation'
    ],
    requirements: ['Business Tax ID (EIN)', 'Business registration documents', 'Additional verification for high-volume status'],
    isOneTime: true,
    category: 'Brand Registration',
    volumeInfo: 'High Volume: For businesses sending over 6,000 message segments per day. Includes premium carrier status and enhanced caller ID display.',
    callerIdExample: {
      before: '(555) 123-4567',
      after: 'ABC Enterprise ⭐ VERIFIED (555) 123-4567'
    }
  },
  {
    id: 'campaign_setup',
    name: 'Campaign Registration',
    cost: 4000,
    timeline: '1-3 business days',
    description: 'Register your specific messaging use cases and compliance procedures with carriers',
    explanation: 'Campaign Registration defines what types of messages you send and how you handle customer consent. Each campaign is like getting permission for a specific type of communication - whether that\'s appointment reminders, order updates, or promotional offers.',
    benefits: [
      'Legally compliant messaging framework',
      'Defines your specific messaging use cases',
      'Ensures proper customer consent procedures',
      'Reduces message blocking and filtering',
      'Professional messaging compliance'
    ],
    process: [
      'Define messaging use case and content',
      'Set up customer consent procedures',
      'Carrier review and approval',
      'Campaign activation and monitoring'
    ],
    requirements: ['Approved brand registration', 'Defined messaging use case', 'Customer opt-in/opt-out procedures'],
    isOneTime: true,
    category: 'Campaign Setup',
    recurring: {
      lowVolume: 400,
      standard: 2500,
      description: 'Monthly maintenance fee to keep your campaigns active and compliant'
    }
  }
];

export function EnhancedVerificationModal({
  isOpen,
  onClose,
  phoneNumber,
  onVerificationStart,
  complianceData,
  creditBalance = 0,
  organizationStatus = null
}: EnhancedVerificationModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if auto-verification is available
  const canAutoVerify = organizationStatus === 'approved';

  const handleVerificationStart = async (serviceId: string) => {
    setIsSubmitting(true);
    try {
      await onVerificationStart(serviceId);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate progress based on completed verifications
  const completedServices = verificationServices.filter(service => {
    if (service.id === 'brand_registration_low' || service.id === 'brand_registration_high') {
      return complianceData?.dlc_brand_registered;
    }
    if (service.id === 'campaign_setup') {
      return complianceData?.dlc_campaign_registered;
    }
    return false;
  }).length;

  const progressPercentage = Math.round((completedServices / verificationServices.length) * 100);



  const handleAutoVerification = async () => {
    if (!organizationStatus || !complianceData) return;

    setIsSubmitting(true);
    try {
      // Automatically submit brand registration with organization documents
      if (!complianceData.dlc_brand_registered && organizationStatus === 'approved') {
        await onVerificationStart('dlc_brand_registration');
      }

      toast.success('Automated verification process started!');
    } catch (error) {
      console.error('Auto verification error:', error);
      toast.error('Failed to start automated verification');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            SMS Verification & Compliance
          </DialogTitle>
          <DialogDescription>
            Enhance deliverability and compliance for {phoneNumber?.phone_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Verification Progress</span>
                <Badge variant={progressPercentage === 100 ? 'default' : 'secondary'}>
                  {progressPercentage.toFixed(0)}% Complete
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={progressPercentage} className="mb-4" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  {complianceData?.phone_verified ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-gray-400" />
                  )}
                  <span>Phone Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  {complianceData?.dlc_brand_registered ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-gray-400" />
                  )}
                  <span>Brand Registered</span>
                </div>
                <div className="flex items-center gap-2">
                  {complianceData?.dlc_campaign_registered ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-gray-400" />
                  )}
                  <span>Campaign Setup</span>
                </div>
                <div className="flex items-center gap-2">
                  {complianceData?.carrier_verified ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-gray-400" />
                  )}
                  <span>Carrier Verified</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auto-Verification Option */}
          {canAutoVerify && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <strong>Automated Verification Available!</strong>
                    <br />
                    We can automatically submit your verification using approved organization documents.
                  </div>
                  <Button 
                    onClick={handleAutoVerification}
                    disabled={isSubmitting}
                    className="ml-4"
                  >
                    {isSubmitting ? 'Starting...' : 'Auto-Verify'}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Timeline</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
                              <VerificationTimeline 
                  phoneNumber={phoneNumber} 
                  complianceData={complianceData}
                  onStepClick={handleVerificationStart}
                />
            </TabsContent>

            <TabsContent value="services" className="space-y-4">
              <div className="grid gap-6">
                {verificationServices.map((service) => (
                  <div key={service.id} className="border rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{service.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                        {service.explanation && (
                          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">{service.explanation}</p>
                        )}
                        {service.volumeInfo && (
                          <p className="text-xs text-blue-600 mt-2 bg-blue-50 p-2 rounded-sm">{service.volumeInfo}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {service.cost.toLocaleString()} credits
                        </div>
                        {service.recurring && (
                          <div className="text-sm text-gray-600 mt-1">
                            + {service.recurring.lowVolume}-{service.recurring.standard} credits/month
                          </div>
                        )}
                        <div className="text-sm text-gray-500">{service.timeline}</div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="font-medium text-green-700 mb-2">Benefits</h4>
                        <ul className="text-sm space-y-1">
                          {service.benefits.map((benefit, index) => (
                            <li key={index} className="flex items-start">
                              <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-blue-700 mb-2">Process</h4>
                        <ol className="text-sm space-y-1">
                          {service.process.map((step, index) => (
                            <li key={index} className="flex items-start">
                              <span className="inline-block w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs text-center leading-5 mr-2 flex-shrink-0">
                                {index + 1}
                              </span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>

                    {service.callerIdExample && (
                      <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
                        <h4 className="font-medium text-green-800 mb-2">📞 Caller ID Enhancement</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-red-600 font-medium">Before:</span>
                            <span className="ml-2 bg-red-50 px-2 py-1 rounded text-red-700">{service.callerIdExample.before}</span>
                          </div>
                          <div>
                            <span className="text-green-600 font-medium">After:</span>
                            <span className="ml-2 bg-green-100 px-2 py-1 rounded text-green-700">{service.callerIdExample.after}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {service.requirements && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                        <h4 className="font-medium text-yellow-800 mb-1">Requirements</h4>
                        <ul className="text-sm text-yellow-700">
                          {service.requirements.map((req, index) => (
                            <li key={index}>• {req}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {service.recurring && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                        <h4 className="font-medium text-blue-800 mb-1">Monthly Campaign Fees</h4>
                        <div className="text-sm text-blue-700 space-y-1">
                          <div>• Low Volume Campaigns: {service.recurring.lowVolume} credits/month</div>
                          <div>• Standard Campaigns: {service.recurring.standard} credits/month</div>
                          <div className="text-xs mt-2">{service.recurring.description}</div>
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={() => handleVerificationStart(service.id)}
                      disabled={!canAutoVerify}
                      className="w-full"
                    >
                      {canAutoVerify ? `Start ${service.name}` : 'Complete Organization Approval First'}
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="status" className="space-y-4">
              {complianceData && (
                <div className="grid gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Current Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        {complianceData.dlc_brand_id && (
                          <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm">Brand ID:</span>
                            <span className="text-sm font-mono">{complianceData.dlc_brand_id}</span>
                          </div>
                        )}
                        {complianceData.dlc_campaign_id && (
                          <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm">Campaign ID:</span>
                            <span className="text-sm font-mono">{complianceData.dlc_campaign_id}</span>
                          </div>
                        )}
                        {complianceData.dlc_campaign_status && (
                          <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm">Campaign Status:</span>
                            <Badge variant={complianceData.dlc_campaign_status === 'approved' ? 'default' : 'secondary'}>
                              {complianceData.dlc_campaign_status}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Credit Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{creditBalance} credits</div>
                      <p className="text-sm text-muted-foreground">Available for verification services</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">What This Enables</h4>
              <p className="text-sm text-blue-700 mb-2">
                10DLC compliance is required by US carriers for all business messaging. This process:
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Establishes your business as a trusted sender</li>
                <li>• Prevents your messages from being blocked or filtered</li>
                <li>• Enables professional, high-volume business messaging</li>
                <li>• Ensures legal compliance with US messaging regulations</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Important Notes</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Brand registration must be completed before campaign setup</li>
                <li>• Monthly campaign fees apply to keep your messaging active</li>
                <li>• All fees include expedited processing for faster approval</li>
                <li>• Processing times depend on carrier and registry approval</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 