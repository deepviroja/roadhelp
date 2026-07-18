import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .regex(/[A-Z]/, 'Add one uppercase letter')
  .regex(/[0-9]/, 'Add one number');

const resetSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetFormData = z.infer<typeof resetSchema>;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetFormData) => {
    if (!token) {
      toast.error('Reset token is missing.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: data.password }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to reset password.');
      }

      toast.success('Password updated successfully. You can now sign in.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'We could not update your password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex-1 bg-[#F5F5F6] flex items-center justify-center p-6 min-h-screen">
        <div className="w-full max-w-[450px] text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-10 space-y-6">
          <h2 className="text-2xl font-black text-red-600 tracking-tight">Invalid Link</h2>
          <p className="text-slate-500 text-sm font-medium">This password reset link is invalid or expired.</p>
          <Button onClick={() => navigate('/login')} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#F5F5F6] flex items-center justify-center p-6 sm:p-12 min-h-screen relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-3xl -ml-64 -mb-64" />

      <div className="w-full max-w-[500px] relative z-10">
        <div className="glass-card rounded-[3.5rem] p-10 sm:p-16">
          <div className="text-center mb-10">
            <Logo size="lg" className="justify-center mb-8" />
            <h1 className="text-3xl font-black text-[#1A1A2E] tracking-tighter leading-none mb-3">Choose new password</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Set your account access password</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className={`h-12 rounded-2xl pl-12 pr-12 bg-slate-50 border-slate-200 font-bold ${errors.password ? 'border-red-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[10px] text-red-500 font-bold uppercase mt-1 tracking-wider">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...register('confirmPassword')}
                className={`h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold ${errors.confirmPassword ? 'border-red-500' : ''}`}
              />
              {errors.confirmPassword && (
                <p className="text-[10px] text-red-500 font-bold uppercase mt-1 tracking-wider">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl shadow-blue-600/20"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin" />Updating password...</span>
              ) : (
                'Update Password'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
