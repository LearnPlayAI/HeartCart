import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
          setStatus('error');
          setMessage('Invalid verification link. Missing token.');
          return;
        }

        // Call the verify email endpoint
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
          setMessage('Your email has been verified successfully! You can now access all features of your HeartCart account.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Email verification failed. The link may have expired or already been used.');
        }
      } catch (error) {
        console.error('Email verification error:', error);
        setStatus('error');
        setMessage('An error occurred while verifying your email. Please try again or contact support.');
      }
    };

    verifyEmail();
  }, []);

  const handleContinue = () => {
    if (status === 'success') {
      setLocation('/auth?tab=login');
    } else {
      setLocation('/auth');
    }
  };

  const handleGoHome = () => {
    setLocation('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            {status === 'loading' && (
              <div className="relative">
                <Mail className="h-12 w-12 text-pink-500" />
                <Loader2 className="absolute -top-1 -right-1 h-6 w-6 text-pink-600 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="relative">
                <div className="bg-green-100 rounded-full p-3">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              </div>
            )}
            {status === 'error' && (
              <div className="relative">
                <div className="bg-red-100 rounded-full p-3">
                  <XCircle className="h-12 w-12 text-red-600" />
                </div>
              </div>
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === 'loading' && 'Verifying Your Email'}
            {status === 'success' && 'Email Verified Successfully!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription className="text-base">
            {status === 'loading' && 'Please wait while we verify your email address...'}
            {status === 'success' && 'Welcome to HeartCart! Your account is now fully activated.'}
            {status === 'error' && 'There was a problem verifying your email address.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {message && (
            <div className={`p-4 rounded-lg text-sm ${
              status === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : status === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              {message}
            </div>
          )}
          
          {status !== 'loading' && (
            <div className="flex flex-col gap-3">
              {status === 'success' ? (
                <>
                  <Button 
                    onClick={handleContinue}
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white"
                  >
                    Continue to Login
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleGoHome}
                    className="w-full"
                  >
                    Go to Home
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={handleContinue}
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white"
                  >
                    Try Again
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleGoHome}
                    className="w-full"
                  >
                    Go to Home
                  </Button>
                  <div className="text-xs text-gray-500 text-center mt-2">
                    Need help? Contact us at sales@heartcart.shop
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}