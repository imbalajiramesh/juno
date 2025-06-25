'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { login, resetPassword } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);

    try {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setError('');
    setLoading(true);

    const formData = new FormData();
    formData.append('email', email);

    try {
      const result = await resetPassword(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.message) {
        setResetMessage(result.message);
        setShowForgotPassword(false);
      }
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {showForgotPassword ? 'Reset Password' : 'Welcome Back'}
          </h2>
          <p className="text-gray-600">
            {showForgotPassword 
              ? 'Enter your email to receive a reset link' 
              : 'Sign in to your account to continue'
            }
          </p>
        </div>

        {/* Sign In Form */}
        <div className="bg-white shadow-lg rounded-2xl p-8 mt-8">
          {!showForgotPassword ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-gray-700">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 bg-white border-gray-200 text-gray-900"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-gray-700">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 bg-white border-gray-200 text-gray-900"
                  placeholder="Enter your password"
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              {resetMessage && (
                <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">
                  {resetMessage}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-black hover:bg-gray-800 text-white py-2 px-4 rounded-md font-medium"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-gray-600 hover:text-black underline"
                >
                  Forgot your password?
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-gray-700">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 bg-white border-gray-200 text-gray-900"
                  placeholder="Enter your email"
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-black hover:bg-gray-800 text-white py-2 px-4 rounded-md font-medium"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setError('');
                  }}
                  className="text-sm text-gray-600 hover:text-black underline"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/sign-up" className="text-black hover:text-gray-700 font-medium underline">
                Sign up
              </Link>
            </p>
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