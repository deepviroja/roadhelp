import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { loginSchema, LoginFormData } from '@/lib/validators';
import { UserRole } from '@/types';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/config/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [activeRole, setActiveRole] = useState<UserRole>('customer');
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [emailForOtp, setEmailForOtp] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<LoginFormData>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    resolver: zodResolver(loginSchema),
    defaultValues: { role: 'customer' },
  });

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    setIsRequestingOtp(true);
    try {
      const vals = getValues();
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/login-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: vals.identifier,
          password: vals.password,
          role: vals.role,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Resend failed.');
      toast.success('A new verification code has been sent to your email.');
      setResendCountdown(30);
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend OTP.');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const roleRedirects: Record<UserRole, string> = {
    customer: '/customer/dashboard',
    provider: '/provider/dashboard',
    admin: '/admin/dashboard',
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsRequestingOtp(true);
    const cleanIdentifier = data.identifier.trim().toLowerCase();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/login-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanIdentifier,
          password: data.password,
          role: data.role,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'We could not sign you in. Please try again.');
      }

      // Check if it's verified (should be false since standard login requires OTP)
      if (result.verified && result.token) {
        await signInWithCustomToken(auth, result.token);
        toast.success(`Welcome back.`);
        navigate(roleRedirects[data.role]);
      } else {
        // Resolve email to verify OTP
        // Find email by checking if identifier contains @, otherwise resolve from backend if possible
        const resolvedEmail = data.identifier.includes('@') 
          ? data.identifier.trim().toLowerCase() 
          : (data.identifier.replace(/\D+/g, '') + '@resolved.com'); // Placeholder, or get from backend response if added
        
        // Wait, let's look at the response: we can return the email in the login-request!
        // Yes, let's see if the backend returns the email. Our backend code does:
        // `res.status(200).json({ success: true, verified: false, message: '...' });`
        // Wait, let's check if we can pass the email in result!
        // Ah, our backend code did not output email, but we resolved it from identifier. Let's make sure the backend returns the email!
        // Wait, our backend code for loginRequest:
        // `await db.collection('pendingOtps').doc(`login_${email}`).set(...)`
        // We can update the backend to return the email or resolve it here.
        // Let's resolve it by matching what the user typed: if they typed an email, use it. If they typed a phone, we'll need the backend to return it, or we can just send the identifier to the verify-login-otp endpoint and let the backend resolve it!
        // Wait, yes! Let's pass `email` as `identifier` to `verify-login-otp` and let the backend resolve it to email!
        // That is extremely robust! Let's check:
        // `exports.verifyLoginOtp = async (req, res) => { const { email, otp } = req.body; ... const cleanEmail = email.trim().toLowerCase(); ... }`
        // Wait! In `authController.js` we can update `verifyLoginOtp` to also accept phone number as the `email` field and resolve it first! Or we can return `email` from the login request.
        // Returning `email` from `/login-request` is so simple and clean!
        // Let's make sure we return the resolved `email` from `/login-request`:
        // `{ success: true, verified: false, email: email, message: '...' }`
        // This is extremely simple and elegant!
        setEmailForOtp(result.email || data.identifier);
        setShowOtpDialog(true);
        setResendCountdown(30);
        toast.success('Verification code sent to your email.');
      }
    } catch (error: any) {
      toast.error(error?.message || 'The email or password is incorrect.');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpValue.trim()) {
      toast.error('Please enter the verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/verify-login-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailForOtp,
          otp: otpValue.trim(),
        }),
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Incorrect verification code.');
      }
      // Sign in with custom Firebase token
      await signInWithCustomToken(auth, result.token);
      toast.success('Sign in successful!');
      setShowOtpDialog(false);
      navigate(roleRedirects[activeRole]);
    } catch (error: any) {
      toast.error(error.message || 'Incorrect verification code. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleRoleChange = (role: string) => {
    const r = role as UserRole;
    setActiveRole(r);
    setValue('role', r, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <div className="w-full">
      <Tabs value={activeRole} onValueChange={handleRoleChange}>
        <TabsList className="w-full grid grid-cols-2 mb-10 max-w-sm mx-auto">
          <TabsTrigger value="customer" className="data-[state=active]:text-blue-600">Customer</TabsTrigger>
          <TabsTrigger value="provider" className="data-[state=active]:text-blue-600">Provider</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <input type="hidden" {...register('role')} value={activeRole} />

          <div className="space-y-1">
            <Label htmlFor="identifier">Email address</Label>
            <Input
              id="identifier"
              type="email"
              placeholder="you@example.com"
              {...register('identifier')}
              className={errors.identifier ? 'border-red-500 ring-red-100' : ''}
            />
            {errors.identifier && (
              <p className="text-[11px] text-red-500 font-bold uppercase mt-1.5 tracking-wider">{errors.identifier.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-end mb-1">
               <Label htmlFor="password">Password</Label>
               <Link to="/forgot-password" className="text-[11px] font-black text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-widest pb-2">
                 Forgot password?
               </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password')}
                className={errors.password ? 'border-red-500 ring-red-100 pr-14' : 'pr-14'}
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
              <p className="text-[11px] text-red-500 font-bold uppercase mt-1.5 tracking-wider">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-lg font-black shadow-xl shadow-blue-600/20"
            disabled={isRequestingOtp}
          >
            {isRequestingOtp ? (
              <span className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                Requesting OTP...
              </span>
            ) : (
              <span className="flex items-center gap-3">
                <LogIn className="w-5 h-5" />
                Sign in
              </span>
            )}
          </Button>
        </form>
      </Tabs>

      {/* OTP Challenge Dialog */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="max-w-md rounded-[2.5rem] border-none shadow-2xl p-8 bg-white">
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-black text-slate-900 flex items-center justify-center gap-2">
              <ShieldAlert className="w-6 h-6 text-blue-600" />
              OTP Verification
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs font-semibold uppercase mt-1.5 tracking-wider">
              Verify your security code to complete sign in
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            <div className="space-y-2 text-center">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">
                Verification Code Sent to Email
              </Label>
              <Input
                type="text"
                maxLength={6}
                placeholder="Enter 6-digit OTP"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="h-16 text-center text-3xl font-black tracking-[8px] bg-slate-50 border-slate-200 rounded-2xl focus:bg-white focus:ring-slate-300"
              />
            </div>

            <Button
              onClick={handleVerifyOtp}
              disabled={isVerifyingOtp || otpValue.length !== 6}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest"
            >
              {isVerifyingOtp ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </span>
              ) : (
                'Verify & Login'
              )}
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                disabled={resendCountdown > 0 || isRequestingOtp}
                onClick={handleResendOtp}
                className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 disabled:text-slate-400 transition-colors cursor-pointer"
              >
                {resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : 'Resend Verification Code'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
