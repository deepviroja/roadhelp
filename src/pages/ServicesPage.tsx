import { useServices } from '@/hooks/useServices';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { IconRenderer } from '@/components/shared/IconRenderer';
import { formatCurrency } from '@/lib/utils';
import { ShieldCheck, ArrowRight, Clock, Award, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ServicesPage() {
  const { services, isLoading } = useServices();
  const activeServices = services.filter((s) => s.isActive ?? true);

  return (
    <div className="min-h-screen bg-[#F5F5F6] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full inline-block mb-4">
            24/7 Roadside Coverage
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-none mb-6">
            Comprehensive Roadside Assistance Services
          </h1>
          <p className="text-slate-500 font-medium text-base sm:text-lg leading-relaxed">
            From towing and tire changes to battery jumpstarts and fuel delivery, our verified network is ready to assist you anywhere, anytime.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="py-20 text-center font-black text-xs uppercase tracking-widest text-slate-400 animate-pulse">
            Loading breakdown services catalog...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activeServices.map((service) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-[2.5rem] border border-slate-200/80 p-8 shadow-xl shadow-slate-900/5 hover:shadow-2xl hover:border-blue-300 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="w-16 h-16 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <IconRenderer name={service.icon} size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">{service.name}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6">{service.description}</p>
                  
                  <div className="space-y-2 mb-8 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      <span>Transparent Bidding & Quote</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>Avg. Arrival: 15 - 25 Mins</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <Award className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Certified & Background-Checked Helpers</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Starting Price</p>
                    <p className="text-xl font-black text-slate-900">{formatCurrency(service.basePrice)}</p>
                  </div>

                  <Button className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider h-12 px-6 rounded-2xl min-h-[48px]" asChild>
                    <Link to={`/get-help?service=${service.id}`}>
                      Book Now <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

