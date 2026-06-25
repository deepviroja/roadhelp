import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { loginSchema, LoginFormData } from '@/lib/validators';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [activeRole, setActiveRole] = useState<UserRole>('customer');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    resolver: zodResolver(loginSchema),
    defaultValues: { role: 'customer' },
  });

  const roleRedirects: Record<UserRole, string> = {
    customer: '/customer/dashboard',
    provider: '/provider/dashboard',
    admin: '/admin/dashboard',
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.identifier, data.password, data.role);
      toast.success(`Welcome back, ${data.role}.`);
      navigate(roleRedirects[data.role]);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('The email or password is incorrect.');
      } else {
        toast.error(error?.message || 'We could not sign you in. Please try again.');
      }
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
            <Label htmlFor="identifier">Email or mobile number</Label>
            <Input
              id="identifier"
              type="text"
              placeholder="you@example.com or 9876543210"
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
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
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
    </div>
  );
}



