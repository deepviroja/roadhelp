import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Truck, DollarSign, MapPin, Zap, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ForProvidersPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F6] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full inline-block mb-4">
            Partner Network
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-none mb-6">
            Grow Your Breakdown & Towing Business
          </h1>
          <p className="text-slate-500 font-medium text-base sm:text-lg leading-relaxed">
            Join RoadHelp as a verified service provider. Receive radius-matched emergency requests, set your price quotes, and get paid directly.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {[
            {
              title: 'Radius-Matched Dispatch',
              desc: 'Only receive jobs within your configured operational radius (e.g. 15 km) and supported services.',
              icon: MapPin,
            },
            {
              title: 'Flexible Custom Pricing',
              desc: 'Submit your own custom price quotes and arrival ETAs for every incoming request.',
              icon: DollarSign,
            },
            {
              title: 'Instant Satellite Telemetry',
              desc: 'Toggle online/offline state with 1-click and stream live GPS location directly to customers during active jobs.',
              icon: Zap,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-xl shadow-slate-900/5">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center mb-6">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="text-center mb-16">
          <Button className="bg-indigo-600 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-widest h-14 px-8 rounded-2xl min-h-[48px] shadow-xl" asChild>
            <Link to="/signup">
              Register as Service Provider <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}

