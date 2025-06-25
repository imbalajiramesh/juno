'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconPlus, IconPhone, IconSettings } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface PhoneNumber {
  id: string;
  phone_number: string;
  status: 'active' | 'inactive' | 'suspended';
  monthly_cost_credits: number;
  setup_cost_credits: number;
  next_billing_date: string;
  created_at: string;
}

interface ComplianceData {
  dlc_brand_registered: boolean;
  dlc_campaign_registered: boolean;
  phone_verified: boolean;
  carrier_verified: boolean;
  services_available?: {
    dlc_brand_registration: { cost: number; description: string };
    dlc_campaign_registration: { cost: number; description: string };
    phone_verification: { cost: number; description: string };
    carrier_verification: { cost: number; description: string };
  };
}

interface CreditInfo {
  balance: number;
}

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string;
  region: string;
  capabilities: string[];
}

const PHONE_SETUP_CREDITS = 500;
const PHONE_MONTHLY_CREDITS = 100;

export default function PhoneNumbersPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [credits, setCredits] = useState<CreditInfo>({ balance: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string>('');
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<PhoneNumber | null>(null);
  const [complianceData, setComplianceData] = useState<ComplianceData | null>(null);
  const [isComplianceModalOpen, setIsComplianceModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    area_code: '',
    country: 'US',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchPhoneNumbers(),
        fetchCredits(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPhoneNumbers = async () => {
    try {
      const response = await fetch('/api/phone-numbers');
      if (response.ok) {
        const data = await response.json();
        setPhoneNumbers(data.phoneNumbers);
      }
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
    }
  };

  const fetchCredits = async () => {
    try {
      const response = await fetch('/api/credits');
      if (response.ok) {
        const data = await response.json();
        setCredits({ balance: data.balance });
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  const searchAvailableNumbers = async () => {
    if (!formData.area_code) {
      toast.error('Please enter an area code');
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/phone-numbers/search?areaCode=${formData.area_code}&country=${formData.country}`);
      
      if (response.ok) {
        const data = await response.json();
        setAvailableNumbers(data.numbers || []);
        if (data.numbers && data.numbers.length === 0) {
          toast.warning('No numbers available in this area code. Try a different area code.');
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to search numbers');
      }
    } catch (error) {
      console.error('Error searching numbers:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to search numbers');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePurchasePhoneNumber = async () => {
    if (!selectedNumber) {
      toast.error('Please select a phone number');
      return;
    }

    if (credits.balance < PHONE_SETUP_CREDITS) {
      toast.error(`Insufficient credits. Need ${PHONE_SETUP_CREDITS} credits for setup.`);
      return;
    }

    setIsPurchasing(true);
    try {
      const response = await fetch('/api/phone-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumber: selectedNumber,
          country: formData.country 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPhoneNumbers(prev => [data.phoneNumber, ...prev]);
        setIsModalOpen(false);
        setFormData({ area_code: '', country: 'US' });
        setAvailableNumbers([]);
        setSelectedNumber('');
        toast.success(`Phone number acquired! ${data.creditsDeducted} credits deducted.`);
        fetchCredits(); // Refresh credit balance
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to acquire phone number');
      }
    } catch (error) {
      console.error('Error acquiring phone number:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to acquire phone number');
    } finally {
      setIsPurchasing(false);
    }
  };

  const fetchComplianceData = async (phoneNumberId: string) => {
    try {
      const response = await fetch(`/api/phone-numbers/${phoneNumberId}/compliance`);
      if (response.ok) {
        const data = await response.json();
        setComplianceData(data);
      }
    } catch (error) {
      console.error('Error fetching compliance data:', error);
    }
  };

  const handleOpenCompliance = async (phoneNumber: PhoneNumber) => {
    setSelectedPhoneNumber(phoneNumber);
    await fetchComplianceData(phoneNumber.id);
    setIsComplianceModalOpen(true);
  };

  const handleComplianceService = async (serviceType: string, serviceData?: any) => {
    if (!selectedPhoneNumber) return;

    try {
      const response = await fetch(`/api/phone-numbers/${selectedPhoneNumber.id}/compliance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_type: serviceType, ...serviceData }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success(`${serviceType.replace('_', ' ')} initiated! ${result.credits_charged} credits charged.`);
          fetchComplianceData(selectedPhoneNumber.id); // Refresh compliance data
          fetchCredits(); // Refresh credit balance
        } else {
          toast.error(result.error || 'Failed to initiate service');
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to initiate service');
      }
    } catch (error) {
      console.error('Error initiating compliance service:', error);
      toast.error('Failed to initiate service');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Juno Numbers</h1>
          <p className="text-muted-foreground">
            Manage dedicated phone numbers for your voice agents and customer communications
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <IconPlus className="mr-2 h-4 w-4" />
          Get Phone Number
        </Button>
      </div>

      {/* Pricing Information */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-green-900 mb-2">Setup Fee</h3>
              <div className="text-2xl font-bold text-green-900">{PHONE_SETUP_CREDITS}</div>
              <p className="text-sm text-green-700">One-time setup cost per number</p>
            </div>
            <div>
              <h3 className="font-medium text-green-900 mb-2">Monthly Fee</h3>
              <div className="text-2xl font-bold text-green-900">{PHONE_MONTHLY_CREDITS}</div>
              <p className="text-sm text-green-700">Recurring monthly charge per number</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Balance */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900">Current Balance</h3>
              <p className="text-sm text-blue-700">Available credits for phone number services</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-900">{credits.balance}</div>
              <div className="text-sm text-blue-700">credits</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phone Numbers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : phoneNumbers.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <IconPhone className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No phone numbers yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Get dedicated phone numbers to enable voice communications with your customers
              </p>
              <Button onClick={() => setIsModalOpen(true)}>
                <IconPhone className="mr-2 h-4 w-4" />
                Get Your First Number
              </Button>
            </CardContent>
          </Card>
        ) : (
          phoneNumbers.map((number) => (
            <Card key={number.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{number.phone_number}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Next billing: {new Date(number.next_billing_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={number.status === 'active' ? 'default' : 'secondary'}>
                    {number.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Monthly Cost</p>
                    <p className="text-sm text-muted-foreground">{number.monthly_cost_credits} credits</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Setup Cost</p>
                    <p className="text-sm text-muted-foreground">{number.setup_cost_credits} credits</p>
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full">
                      <IconSettings className="mr-2 h-4 w-4" />
                      Configure
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => handleOpenCompliance(number)}
                    >
                      SMS Compliance
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Get Phone Number Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Get Phone Number</DialogTitle>
            <DialogDescription>
              Acquire a new dedicated phone number for your business communications
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="area_code">Area Code *</Label>
              <div className="flex gap-2">
                <Input
                  id="area_code"
                  placeholder="e.g., 415"
                  value={formData.area_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, area_code: e.target.value }))}
                  className="flex-1"
                />
                <Button 
                  onClick={searchAvailableNumbers} 
                  disabled={isSearching || !formData.area_code}
                  variant="outline"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select value={formData.country} onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {availableNumbers.length > 0 && (
              <div className="space-y-2">
                <Label>Available Numbers</Label>
                <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2">
                  {availableNumbers.map((number) => (
                    <div
                      key={number.phoneNumber}
                      className={`p-2 border rounded cursor-pointer transition-colors ${
                        selectedNumber === number.phoneNumber 
                          ? 'bg-blue-50 border-blue-300' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedNumber(number.phoneNumber)}
                    >
                      <div className="font-medium">{number.friendlyName}</div>
                      <div className="text-sm text-muted-foreground">
                        {number.locality}, {number.region}
                      </div>
                      {number.capabilities.length > 0 && (
                        <div className="text-xs text-blue-600">
                          {number.capabilities.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 bg-muted rounded-md">
              <h4 className="font-medium mb-2">Cost Breakdown</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Setup fee:</span>
                  <span>{PHONE_SETUP_CREDITS} credits</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly fee:</span>
                  <span>{PHONE_MONTHLY_CREDITS} credits/month</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-sm">Your balance:</span>
                <span className="font-medium">{credits.balance} credits</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePurchasePhoneNumber} 
              disabled={isPurchasing || credits.balance < PHONE_SETUP_CREDITS || !selectedNumber}
            >
              {isPurchasing ? 'Acquiring...' : 'Get Number'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SMS Compliance Modal */}
      <Dialog open={isComplianceModalOpen} onOpenChange={setIsComplianceModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>SMS Compliance & Verification</DialogTitle>
            <DialogDescription>
              Optional services to enable business SMS and improve deliverability for {selectedPhoneNumber?.phone_number}
            </DialogDescription>
          </DialogHeader>

          {complianceData && (
            <div className="space-y-6">
              {/* Current Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Current Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${complianceData.dlc_brand_registered ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-sm">10DLC Brand Registered</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${complianceData.phone_verified ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-sm">Phone Verified</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${complianceData.dlc_campaign_registered ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-sm">Campaign Registered</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${complianceData.carrier_verified ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-sm">Carrier Verified</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Available Services */}
              {complianceData.services_available && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Available Services</h3>
                  
                  {/* DLC Brand Registration */}
                  {!complianceData.dlc_brand_registered && (
                    <Card className="border-orange-200 bg-orange-50">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-orange-900">10DLC Brand Registration</h4>
                            <p className="text-sm text-orange-700 mb-2">
                              {complianceData.services_available.dlc_brand_registration.description}
                            </p>
                            <p className="text-xs text-orange-600">
                              Required for business SMS in the US. Improves delivery rates and reduces spam filtering.
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-orange-900">
                              {complianceData.services_available.dlc_brand_registration.cost} credits
                            </div>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            // This would open a form for business details
                            const businessName = prompt('Business Name:');
                            const businessWebsite = prompt('Business Website:');
                            const businessType = 'corporation'; // Could be a select
                            
                            if (businessName && businessWebsite) {
                              handleComplianceService('dlc_brand_registration', {
                                business_name: businessName,
                                business_website: businessWebsite,
                                business_type: businessType
                              });
                            }
                          }}
                          disabled={credits.balance < complianceData.services_available.dlc_brand_registration.cost}
                        >
                          Register Brand
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Phone Verification */}
                  {!complianceData.phone_verified && (
                    <Card className="border-blue-200 bg-blue-50">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-blue-900">Phone Number Verification</h4>
                            <p className="text-sm text-blue-700 mb-2">
                              {complianceData.services_available.phone_verification.description}
                            </p>
                            <p className="text-xs text-blue-600">
                              Verifies number ownership and improves SMS deliverability.
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-blue-900">
                              {complianceData.services_available.phone_verification.cost} credits
                            </div>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleComplianceService('phone_verification')}
                          disabled={credits.balance < complianceData.services_available.phone_verification.cost}
                        >
                          Verify Number
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Carrier Verification */}
                  {!complianceData.carrier_verified && (
                    <Card className="border-purple-200 bg-purple-50">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-purple-900">Carrier Verification</h4>
                            <p className="text-sm text-purple-700 mb-2">
                              {complianceData.services_available.carrier_verification.description}
                            </p>
                            <p className="text-xs text-purple-600">
                              Premium verification with carrier-level approval for maximum deliverability.
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-purple-900">
                              {complianceData.services_available.carrier_verification.cost} credits
                            </div>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleComplianceService('carrier_verification')}
                          disabled={credits.balance < complianceData.services_available.carrier_verification.cost}
                        >
                          Carrier Verify
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Current Balance */}
              <Card className="bg-gray-50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Your Credit Balance</span>
                    <span className="font-bold">{credits.balance} credits</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 