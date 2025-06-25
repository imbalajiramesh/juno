'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IconCheck, IconAlertCircle, IconLoader2 } from '@tabler/icons-react';

interface InvitationData {
  email: string;
  organizationName: string;
  role: string;
  inviterName: string;
  inviterEmail: string;
  expiresAt: string;
}

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    verifyInvitation();
  }, [token]);

  const verifyInvitation = async () => {
    try {
      const response = await fetch(`/api/invitations/accept?token=${token}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid invitation');
        setLoading(false);
        return;
      }

      setInvitation(data.invitation);
    } catch (error) {
      console.error('Error verifying invitation:', error);
      setError('Failed to verify invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setSubmitting(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to accept invitation');
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      
      // Redirect to login after a brief delay
      setTimeout(() => {
        router.push('/login?message=Account created successfully. Please sign in.');
      }, 3000);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setError('Failed to accept invitation');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <IconLoader2 className="h-8 w-8 animate-spin" />
          <p className="text-gray-600">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <IconAlertCircle className="h-12 w-12 text-red-500" />
              <h1 className="text-xl font-bold text-gray-900">Invalid Invitation</h1>
              <p className="text-center text-gray-600">{error}</p>
              <Button onClick={() => router.push('/login')} variant="outline">
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <IconCheck className="h-12 w-12 text-green-500" />
              <h1 className="text-xl font-bold text-gray-900">Welcome to Juno!</h1>
              <p className="text-center text-gray-600">
                Your account has been created successfully. You'll be redirected to the login page shortly.
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Join {invitation?.organizationName}</h2>
          <p className="text-gray-600">
            You've been invited by {invitation?.inviterName} to join as a <strong>{invitation?.role}</strong>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Complete Your Registration</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={invitation?.email || ''}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">This email was invited to join the organization</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  placeholder="Create a secure password (min. 6 characters)"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  placeholder="Confirm your password"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <IconAlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-black hover:bg-gray-800 text-white"
              >
                {submitting ? (
                  <>
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Accept Invitation & Create Account'
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Organization Details:</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Organization:</strong> {invitation?.organizationName}</p>
                <p><strong>Role:</strong> {invitation?.role}</p>
                <p><strong>Invited by:</strong> {invitation?.inviterName} ({invitation?.inviterEmail})</p>
                <p><strong>Expires:</strong> {invitation?.expiresAt ? new Date(invitation.expiresAt).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-gray-600 text-sm">
            Already have an account?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-black hover:text-gray-700 font-medium underline"
            >
              Sign in instead
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <IconLoader2 className="h-8 w-8 animate-spin" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
} 