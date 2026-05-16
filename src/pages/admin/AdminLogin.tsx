import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, LogIn, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginSchema, LoginFormData } from '@/lib/validators';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/shared/Logo';

export default function AdminLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { role: 'admin' },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password, 'admin');
      toast.success(`Welcome back, Administrator`);
      navigate('/admin/dashboard');
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        toast.error('Invalid credentials. Check your access.');
      } else if (err.message) {
        toast.error(err.message);
      } else {
        toast.error('Login failed. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F6] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[100px]" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div className="bg-white p-3 rounded-2xl shadow-xl">
            <Logo size="lg" />
          </div>
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-blue-600">
          Admin Portal
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Authorized personnel only
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-[#F5F5F6] py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10 border border-gray-700">
          <div className="mb-6 flex items-center gap-3 p-3 bg-red-900/30 rounded-lg border border-red-900/50">
            <ShieldAlert className="text-red-900 w-6 h-6 flex-shrink-0" />
            <p className="text-xs text-red-900">
              This is a restricted access area. All activities are securely logged and monitored.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <input type="hidden" {...register('role')} value="admin" />

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-400">Admin Email</Label>
              <Input
                id="email"
                type="email"
                placeholder='Enter Email Id'
                {...register('email')}
                className={`bg-gray-100 border-gray-700 text-black placeholder:text-gray-300 ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-blue-500'}`}
              />
              <AnimatePresence>
                {errors.email && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-xs text-red-400 mt-1">
                    {errors.email.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-400">Master Password</Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder='Enter Password'
                  className={`bg-gray-100 border-gray-700 text-black placeholder:text-gray-300 pr-10 ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-blue-500'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-4 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <AnimatePresence>
                {errors.password && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-xs text-red-400 mt-1">
                    {errors.password.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-12 shadow-lg shadow-blue-900/20"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  Authenticating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Access Dashboard
                </span>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
