import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/shared/Logo';
import { SignupForm } from '@/components/auth/SignupForm';
import { useSystemStore } from '@/stores/systemStore';

export default function Signup() {
  const { appName, pageContent } = useSystemStore();
  return (
    <div className="flex-1 bg-[#F5F5F6] flex items-center justify-center p-6 sm:p-12 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-3xl -ml-64 -mb-64" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-2xl relative z-10"
      >
        <div className="glass-card rounded-[3.5rem] p-10 sm:p-16">
          <div className="text-center mb-14">
            <Logo size="lg" className="justify-center mb-10" />
            <h1 className="text-fluid-3xl font-black text-[#1A1A2E] tracking-tighter leading-none mb-4">Create your account</h1>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.35em] italic">
              {pageContent?.authSignupText || `Join ${appName} for faster help and a smoother booking flow`}
            </p>
          </div>

          <SignupForm />

          <div className="mt-14 pt-10 border-t border-slate-100 text-center">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 transition-all border-b-2 border-blue-600/10 hover:border-blue-600 ml-2">Sign in</Link>
            </p>
          </div>
        </div>
        <p className="text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] mt-12">
          © 2026 {appName.toUpperCase()} CORP. SECURE ONBOARDING.
        </p>
      </motion.div>
    </div>
  );
}
