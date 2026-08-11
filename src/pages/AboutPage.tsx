import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ShieldCheck, MapPin, Award, Users, HeartHandshake } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F6] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full inline-block mb-4">
            Our Mission & Vision
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-none mb-6">
            Connecting Stranded Drivers with Instant Roadside Help
          </h1>
          <p className="text-slate-500 font-medium text-base sm:text-lg leading-relaxed">
            RoadHelp was founded to eliminate the frustration, long wait times, and opaque pricing of traditional roadside breakdown services.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-xl shadow-slate-900/5 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">Why RoadHelp Exists</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              When your car breaks down or a tire pops on an unfamiliar highway, every minute counts. We created a real-time marketplace where nearby verified mechanics and towing operators bid for your request transparently.
            </p>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-xl shadow-slate-900/5 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">Safety & Trust First</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Every provider on our platform undergoes strict credential verification. We use OpenStreetMap & OSRM routing for exact location tracking and safety OTP confirmation before work commences.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

