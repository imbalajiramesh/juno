'use client';

import { useState, useEffect } from 'react';
import { enrollMFA, verifyMFAEnrollment } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';

export default function MFAPage() {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<{
    qrCode: string;
    secret: string;
    factorId: string;
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingMFA, setCheckingMFA] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const activeFactor = factors?.totp?.find((factor: any) => factor.status === 'verified');
      setMfaEnabled(!!activeFactor);
    } catch (error) {
      console.error('Error checking MFA status:', error);
    } finally {
      setCheckingMFA(false);
    }
  };

  const handleEnrollMFA = async () => {
    setLoading(true);
    try {
      const result = await enrollMFA();
      if (result.error) {
        toast.error(result.error);
      } else if (result.qrCode && result.secret && result.factorId) {
        setEnrollmentData({
          qrCode: result.qrCode,
          secret: result.secret,
          factorId: result.factorId
        });
      } else {
        toast.error('Failed to get MFA enrollment data');
      }
    } catch (error) {
      toast.error('Failed to start MFA enrollment');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentData) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('code', verificationCode);
    formData.append('factorId', enrollmentData.factorId);

    try {
      const result = await verifyMFAEnrollment(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('MFA enabled successfully!');
        setMfaEnabled(true);
        setEnrollmentData(null);
        setVerificationCode('');
      }
    } catch (error) {
      toast.error('Failed to verify MFA code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMFA = async () => {
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const activeFactor = factors?.totp?.find((factor: any) => factor.status === 'verified');
      
      if (activeFactor) {
        const { error } = await supabase.auth.mfa.unenroll({
          factorId: activeFactor.id
        });
        
        if (error) {
          toast.error('Failed to disable MFA');
        } else {
          toast.success('MFA disabled successfully');
          setMfaEnabled(false);
        }
      }
    } catch (error) {
      toast.error('Failed to disable MFA');
    }
  };

  if (checkingMFA) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading MFA status...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication (MFA)</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account with two-factor authentication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!mfaEnabled && !enrollmentData && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Two-factor authentication is currently disabled. Enable it to secure your account.
              </p>
              <Button
                onClick={handleEnrollMFA}
                disabled={loading}
                className="bg-black hover:bg-gray-800 text-white"
              >
                {loading ? 'Setting up...' : 'Enable MFA'}
              </Button>
            </div>
          )}

          {enrollmentData && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Setup Your Authenticator App</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      1. Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
                    </p>
                    <div className="flex justify-center p-4 bg-white border rounded-lg">
                      <img src={enrollmentData.qrCode} alt="MFA QR Code" className="max-w-48" />
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      2. Or manually enter this secret key:
                    </p>
                    <code className="block p-2 bg-gray-100 rounded text-sm font-mono break-all">
                      {enrollmentData.secret}
                    </code>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      3. Enter the 6-digit code from your authenticator app:
                    </p>
                    <form onSubmit={handleVerifyEnrollment} className="space-y-4">
                      <div>
                        <Label htmlFor="verificationCode">Verification Code</Label>
                        <Input
                          id="verificationCode"
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          maxLength={6}
                          required
                          className="text-center text-lg tracking-widest"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          type="submit"
                          disabled={loading || verificationCode.length !== 6}
                          className="bg-black hover:bg-gray-800 text-white"
                        >
                          {loading ? 'Verifying...' : 'Verify & Enable'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEnrollmentData(null);
                            setVerificationCode('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {mfaEnabled && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <p className="text-green-700 font-medium">Two-factor authentication is enabled</p>
              </div>
              <p className="text-gray-600">
                Your account is protected with two-factor authentication. You&apos;ll need to enter a code from your authenticator app when signing in.
              </p>
              <Button
                onClick={handleDisableMFA}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Disable MFA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 