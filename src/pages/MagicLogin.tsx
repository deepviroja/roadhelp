import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';

export default function MagicLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Invalid or missing magic link token.');
      toast.error('Invalid magic link.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/verify-magic-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || 'Verification failed');
        }

        // Sign in with custom Firebase token
        await signInWithCustomToken(auth, result.token);
        toast.success('Successfully authenticated!');
        
        // Redirect to customer dashboard
        navigate('/customer/dashboard');
      } catch (err: any) {
        console.error('Magic login error:', err);
        setError(err.message || 'Magic Link verification failed.');
        toast.error(err.message || 'Magic Link verification failed.');
        setTimeout(() => navigate('/login'), 4000);
      }
    };

    verifyToken();
  }, [searchParams, navigate]);

  return (
    <div className="flex-1 bg-[#F5F5F6] flex items-center justify-center p-6 min-h-screen">
      <div className="w-full max-w-[450px] text-center">
        <Logo size="lg" className="justify-center mb-8" />
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-10 space-y-6">
          {error ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-red-600 tracking-tight">Authentication Failed</h2>
              <p className="text-slate-500 text-sm font-medium">{error}</p>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Redirecting to Login...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Verifying Credentials</h2>
              <p className="text-slate-500 text-sm font-medium">Please wait while we establish your secure session...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
