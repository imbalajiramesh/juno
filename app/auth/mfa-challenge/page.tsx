'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { verifyMFAChallenge } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function MFAChallengeForm() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const challengeId = searchParams.get('challengeId');
  const factorId = searchParams.get('factorId');

  useEffect(() => {
    if (!challengeId || !factorId) {
      router.push('/login');
    }
  }, [challengeId, factorId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeId || !factorId) return;

    setError('');
    setLoading(true);

    const formData = new FormData();
    formData.append('code', code);
    formData.append('challengeId', challengeId);
    formData.append('factorId', factorId);

    try {
      const result = await verifyMFAChallenge(formData);
      if (result?.error) {
        setError(result.error);
      }
      // If successful, the action will redirect to dashboard
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col items-center justify-center">
      <div className="w-full max-w-md mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logo and Title Section */}
        <div className="text-center">
          <div className="flex justify-center -mb-16">
            <Image
              className="h-20 w-auto"
              src="/fox.png"
              alt="Fox"
              width={80}
              height={80}
              priority
            />
          </div>
          <div className="flex justify-center -mt-8 -mb-8">
            <Image
              className="h-48 w-auto"
              src="/logo.png"
              alt="Juno"
              width={192}
              height={192}
              priority
            />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Two-Factor Authentication</h2>
          <p className="text-gray-600">Enter the 6-digit code from your authenticator app</p>
        </div>

        {/* MFA Challenge Form */}
        <div className="bg-white shadow-lg rounded-2xl p-8 mt-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="code" className="text-gray-700">Verification Code</Label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                required
                className="mt-1 bg-white border-gray-200 text-gray-900 text-center text-lg tracking-widest"
                autoComplete="one-time-code"
                autoFocus
              />
              <p className="text-sm text-gray-500 mt-1">
                Open your authenticator app and enter the 6-digit code
              </p>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-black hover:bg-gray-800 text-white py-2 px-4 rounded-md font-medium"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/login')}
              className="text-sm text-gray-600 hover:text-black underline"
            >
              Back to Sign In
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-600 text-sm">
            © {new Date().getFullYear()} Juno. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MFAChallengePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MFAChallengeForm />
    </Suspense>
  );
} 