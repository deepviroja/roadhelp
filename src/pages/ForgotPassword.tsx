import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Enter your email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || 'We could not send the reset email.');
      }

      toast.success('Password reset email sent. Please check your inbox.');
    } catch (error: any) {
      toast.error(error?.message || 'We could not send the reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 bg-[#F5F5F6] flex items-center justify-center p-6 sm:p-12 overflow-hidden relative min-h-screen">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-3xl -ml-64 -mb-64" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-[520px] relative z-10"
      >
        <div className="glass-card rounded-[3.5rem] p-10 sm:p-16">
          <div className="text-center mb-12">
            <Logo size="lg" className="justify-center mb-8" />
            <h1 className="text-fluid-3xl font-black text-[#1A1A2E] tracking-tighter leading-none mb-4">Reset password</h1>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.35em] italic">We’ll send a secure reset link to your email</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-14 rounded-2xl pl-12 bg-slate-50 border-slate-200 font-medium"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin" />Sending reset link...</span>
              ) : (
                'Send reset link'
              )}
            </Button>
          </form>

          <div className="mt-12 pt-8 border-t border-slate-100 text-center">
            <Link to="/login" className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

