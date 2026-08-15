import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ShieldCheck, Clock, Award, PhoneCall, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ForCustomersPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F6] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 container-app py-12 md:py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full inline-block mb-4">
            Customer Guarantee
          </span>
          <h1 className="text-4xl sm:text-[2rem] sm:text-4xl md:text-[2.25rem] sm:text-5xl font-black text-slate-900 tracking-tight leading-none mb-6">
            Built for Peace of Mind on Every Road
          </h1>
          <p className="text-slate-500 font-medium text-base sm:text-lg leading-relaxed">
            Transparent pricing, verified service mechanics, live OSRM tracking, and security OTP verification.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {[
            {
              title: 'Zero Hidden Fees',
              desc: 'Review exact provider quotes before accepting. Pay only the agreed price with full breakdown transparency.',
              icon: Lock,
            },
            {
              title: 'Real-Time GPS Tracking',
              desc: 'See provider location live on Leaflet map with road distance and estimated driving duration.',
              icon: Clock,
            },
            {
              title: 'Safety OTP Verification',
              desc: 'The provider cannot start work until you share your unique 4-digit arrival OTP code.',
              icon: ShieldCheck,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-xl shadow-slate-900/5">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center mb-6">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="text-center mb-16">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest h-14 px-8 rounded-2xl min-h-[48px] shadow-xl" asChild>
            <Link to="/get-help">
              Request Emergency Assistance <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}



