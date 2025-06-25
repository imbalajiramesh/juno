'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  IconRefresh, 
  IconCreditCard, 
  IconLoader2,
  IconAlertTriangle,
  IconCheck,
  IconSettings,
  IconCoins,
  IconTrendingUp,
  IconBolt,
  IconInfoCircle
} from '@tabler/icons-react';

interface PaymentMethod {
  id: string;
  card_brand: string;
  card_last4: string;
  card_exp_month: number;
  card_exp_year: number;
  is_default: boolean;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_usd_cents: number;
  is_popular: boolean;
  description: string;
}

interface AutoRechargeSettings {
  id?: string;
  is_enabled: boolean;
  minimum_balance: number;
  recharge_amount: number;
  payment_method_id?: string;
  last_triggered_at?: string;
  payment_methods?: PaymentMethod;
}

interface AutoRechargeSettingsProps {
  paymentMethods: PaymentMethod[];
  onSettingsChange?: () => void;
}

export default function AutoRechargeSettings({ paymentMethods, onSettingsChange }: AutoRechargeSettingsProps) {
  const [settings, setSettings] = useState<AutoRechargeSettings>({
    is_enabled: false,
    minimum_balance: 100,
    recharge_amount: 1000,
  });
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTriggeringNow, setIsTriggeringNow] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchSettings(),
      fetchCurrentBalance(),
      fetchCreditPackages()
    ]).finally(() => setIsLoading(false));
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/stripe/auto-recharge');
      const data = await response.json();

      if (response.ok && data.settings) {
        setSettings(data.settings);
        // Set selected package based on current recharge amount
        const matchingPackage = creditPackages.find(pkg => pkg.credits === data.settings.recharge_amount);
        if (matchingPackage) {
          setSelectedPackage(matchingPackage.id);
        }
      }
    } catch (error) {
      console.error('Error fetching auto-recharge settings:', error);
    }
  };

  const fetchCurrentBalance = async () => {
    try {
      setIsLoadingBalance(true);
      const response = await fetch('/api/credits');
      const data = await response.json();

      if (response.ok) {
        setCurrentBalance(data.balance);
      } else {
        console.error('Error fetching balance:', data.error);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const fetchCreditPackages = async () => {
    try {
      const response = await fetch('/api/credit-packages');
      const data = await response.json();

      if (response.ok) {
        setCreditPackages(data);
        // Auto-select Business package (1000 credits) as default
        const businessPackage = data.find((pkg: CreditPackage) => pkg.credits === 1000);
        if (businessPackage && !selectedPackage) {
          setSelectedPackage(businessPackage.id);
          setSettings(prev => ({ ...prev, recharge_amount: businessPackage.credits }));
        }
      }
    } catch (error) {
      console.error('Error fetching credit packages:', error);
    }
  };

  const handlePackageSelection = (packageId: string) => {
    const selectedPkg = creditPackages.find(pkg => pkg.id === packageId);
    if (selectedPkg) {
      setSelectedPackage(packageId);
      setSettings(prev => ({ ...prev, recharge_amount: selectedPkg.credits }));
    }
  };

  const getBalanceStatus = () => {
    if (currentBalance === null) return null;
    
    if (currentBalance <= 50) {
      return { status: 'critical', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', icon: IconAlertTriangle };
    } else if (currentBalance <= 200) {
      return { status: 'low', color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200', icon: IconAlertTriangle };
    } else {
      return { status: 'good', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', icon: IconCheck };
    }
  };

  const getRecommendedMinBalance = () => {
    if (currentBalance === null) return 100;
    
    // Recommend 25% of current balance as minimum, with sensible bounds
    const recommended = Math.max(50, Math.min(500, Math.floor(currentBalance * 0.25)));
    return recommended;
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);

      // Validation
      if (settings.is_enabled) {
        if (!settings.payment_method_id) {
          toast.error('Please select a payment method for auto-recharge');
          return;
        }
        if (settings.minimum_balance < 10) {
          toast.error('Minimum balance must be at least 10 credits');
          return;
        }
        if (settings.recharge_amount < 100) {
          toast.error('Recharge amount must be at least 100 credits');
          return;
        }
        if (settings.minimum_balance >= settings.recharge_amount) {
          toast.error('Recharge amount must be greater than minimum balance');
          return;
        }
      }

      const response = await fetch('/api/stripe/auto-recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isEnabled: settings.is_enabled,
          minimumBalance: settings.minimum_balance,
          rechargeAmount: settings.recharge_amount,
          paymentMethodId: settings.payment_method_id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSettings(data.settings);
        toast.success('Auto-recharge settings updated successfully');
        onSettingsChange?.();
      } else {
        toast.error(data.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const triggerRechargeNow = async () => {
    try {
      setIsTriggeringNow(true);

      const response = await fetch('/api/stripe/auto-recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerNow: true }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.success) {
          const taxInfo = data.taxAmount > 0 
            ? ` (Total: $${data.totalAmount.toFixed(2)} USD including ${data.taxName})`
            : ` ($${data.subtotal.toFixed(2)} USD)`;
          toast.success(`Auto-recharge successful! ${data.creditsAdded} credits added.${taxInfo}`);
          await fetchCurrentBalance(); // Refresh balance
          onSettingsChange?.();
        } else {
          toast.info(data.message || 'Auto-recharge not needed at this time');
        }
      } else {
        toast.error(data.error || 'Failed to trigger auto-recharge');
      }
    } catch (error) {
      console.error('Error triggering auto-recharge:', error);
      toast.error('Failed to trigger auto-recharge');
    } finally {
      setIsTriggeringNow(false);
    }
  };

  const formatCardDisplay = (method: PaymentMethod) => {
    return `${method.card_brand.toUpperCase()} ****${method.card_last4}`;
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading auto-recharge settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const balanceStatus = getBalanceStatus();
  const recommendedMinBalance = getRecommendedMinBalance();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <IconRefresh className="mr-2 h-5 w-5" />
          Auto-Recharge Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Balance Display */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium flex items-center">
              <IconCoins className="mr-2 h-4 w-4" />
              Current Balance
            </Label>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchCurrentBalance}
              disabled={isLoadingBalance}
            >
              {isLoadingBalance ? (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              ) : (
                <IconRefresh className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {currentBalance !== null && balanceStatus && (
            <div className={`p-4 rounded-lg border ${balanceStatus.bgColor}`}>
              <div className="flex items-center space-x-3">
                <balanceStatus.icon className={`h-5 w-5 ${balanceStatus.color}`} />
                <div>
                  <p className={`font-semibold ${balanceStatus.color}`}>
                    {currentBalance.toLocaleString()} credits
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {balanceStatus.status === 'critical' && 'Critical: Balance very low!'}
                    {balanceStatus.status === 'low' && 'Low balance - consider enabling auto-recharge'}
                    {balanceStatus.status === 'good' && 'Balance looks good'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Enable/Disable Switch */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base font-medium">Enable Auto-Recharge</Label>
            <p className="text-sm text-muted-foreground">
              Automatically add credits when your balance gets low
            </p>
          </div>
          <Switch
            checked={settings.is_enabled}
            onCheckedChange={(checked) => 
              setSettings(prev => ({ ...prev, is_enabled: checked }))
            }
          />
        </div>

        {settings.is_enabled && (
          <>
            {/* Warning if no payment methods */}
            {paymentMethods.length === 0 && (
              <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <IconAlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    No payment methods available
                  </p>
                  <p className="text-sm text-yellow-700">
                    You need to add a payment method before enabling auto-recharge.
                  </p>
                </div>
              </div>
            )}

            {/* Minimum Balance Setting */}
            <div className="space-y-3">
              <Label htmlFor="min-balance">Minimum Balance Threshold</Label>
              <div className="flex items-center space-x-3">
                <Input
                  id="min-balance"
                  type="number"
                  min="10"
                  max="10000"
                  value={settings.minimum_balance}
                  onChange={(e) => 
                    setSettings(prev => ({ 
                      ...prev, 
                      minimum_balance: parseInt(e.target.value) || 0 
                    }))
                  }
                  placeholder="100"
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSettings(prev => ({ ...prev, minimum_balance: recommendedMinBalance }))}
                >
                  Use Recommended ({recommendedMinBalance})
                </Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-center">
                <IconInfoCircle className="h-3 w-3 mr-1" />
                Auto-recharge will trigger when your balance drops below this amount
              </p>
            </div>

            {/* Credit Package Selection */}
            <div className="space-y-3">
              <Label>Auto-Recharge Package</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {creditPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedPackage === pkg.id
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handlePackageSelection(pkg.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{pkg.name}</h4>
                      {pkg.is_popular && (
                        <Badge variant="secondary" className="text-xs">
                          <IconTrendingUp className="h-3 w-3 mr-1" />
                          Popular
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {pkg.credits.toLocaleString()} credits
                      </span>
                      <span className="font-semibold">
                        {formatPrice(pkg.price_usd_cents)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pkg.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method Selection */}
            {paymentMethods.length > 0 && (
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={settings.payment_method_id || ''}
                  onValueChange={(value) => 
                    setSettings(prev => ({ ...prev, payment_method_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        <div className="flex items-center space-x-2">
                          <IconCreditCard className="h-4 w-4" />
                          <span>{formatCardDisplay(method)}</span>
                          {method.is_default && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Auto-Recharge Preview */}
            {settings.payment_method_id && selectedPackage && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <IconBolt className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-800">
                      Auto-Recharge Summary
                    </p>
                    <div className="text-sm text-blue-700 mt-1 space-y-1">
                      <p>• When balance drops below <strong>{settings.minimum_balance} credits</strong></p>
                      <p>• Automatically purchase <strong>{settings.recharge_amount.toLocaleString()} credits</strong></p>
                      <p>• Charge <strong>{formatCardDisplay(paymentMethods.find(pm => pm.id === settings.payment_method_id)!)}</strong></p>
                      <p>• Cost: <strong>{formatPrice(creditPackages.find(pkg => pkg.id === selectedPackage)?.price_usd_cents || 0)} + tax</strong></p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Status Information */}
            {settings.last_triggered_at && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <IconCheck className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Auto-recharge is active
                    </p>
                    <p className="text-sm text-green-700">
                      Last triggered: {new Date(settings.last_triggered_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button
            onClick={saveSettings}
            disabled={isSaving || (settings.is_enabled && paymentMethods.length === 0)}
          >
            {isSaving ? (
              <>
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <IconSettings className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>

          {settings.is_enabled && settings.payment_method_id && (
            <Button
              variant="outline"
              onClick={triggerRechargeNow}
              disabled={isTriggeringNow}
            >
              {isTriggeringNow ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <IconBolt className="mr-2 h-4 w-4" />
                  Test Auto-Recharge
                </>
              )}
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Auto-recharge runs daily at 8 AM UTC and checks balances in real-time</p>
          <p>• You'll receive email notifications about auto-recharge activities</p>
          <p>• Cards are charged securely using saved payment methods</p>
          <p>• All transactions include applicable taxes and are recorded for your records</p>
        </div>
      </CardContent>
    </Card>
  );
} 