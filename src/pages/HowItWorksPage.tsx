import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ShieldCheck, MapPin, DollarSign, Navigation, Phone, CheckCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HowItWorksPage() {
  const steps = [
    {
      num: '01',
      title: 'Submit Breakdown Request',
      desc: 'Select your required service (flat tire, towing, battery, etc.), confirm vehicle type, and pinpoint your exact GPS location on our Leaflet map.',
      icon: MapPin,
    },
    {
      num: '02',
      title: 'Receive Provider Bids & Offers',
      desc: 'Verified service providers within your radius receive instant telemetry. Compare real-time price quotes, ratings, and arrival ETAs.',
      icon: DollarSign,
    },
    {
      num: '03',
      title: 'Track Live Provider Arrival',
      desc: 'Once you select an offer, track your helper live on the OSRM map with real-time road distance and travel time updates.',
      icon: Navigation,
    },
    {
      num: '04',
      title: 'OTP Arrival & Job Completion',
      desc: "Verify the provider's arrival via a 4-digit security code. Pay securely after the work is finished to your complete satisfaction.",
      icon: CheckCircle,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F6] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 container-app py-12 md:py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full inline-block mb-4">
            Simple & Transparent Process
          </span>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-6">
            How RoadHelp Marketplace Works
          </h1>
          <p className="text-slate-500 font-medium text-base sm:text-lg leading-relaxed">
            Connecting stranded motorists with vetted nearby towing and repair professionals in minutes.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-xl shadow-slate-900/5 relative overflow-hidden group">
                <span className="absolute top-6 right-8 text-[2.25rem] sm:text-5xl font-black text-slate-100 group-hover:text-blue-100 transition-colors">
                  {step.num}
                </span>
                <div className="w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center mb-6 relative z-10">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-semibold tracking-tight text-slate-950 mb-3 relative z-10">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed relative z-10">{step.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-slate-900 rounded-[3rem] p-10 sm:p-14 text-white text-center max-w-4xl mx-auto shadow-2xl relative overflow-hidden mb-16">
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Stranded on the Road Right Now?</h2>
            <p className="text-slate-300 text-sm sm:text-base">No account registration required for emergency help. Request assistance in under 60 seconds.</p>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest h-14 px-8 rounded-2xl min-h-[48px] shadow-xl" asChild>
              <Link to="/get-help">
                Get Assistance Now <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}



