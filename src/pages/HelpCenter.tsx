import { motion } from 'framer-motion';
import { HelpCircle, Search, MessageSquare, Phone, Mail, ChevronRight, Zap, Shield, CreditCard } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { useSystemStore } from '@/stores/systemStore';

const CATEGORIES = [
  { icon: Zap, title: 'Urgent Dispatch', desc: 'Real-time tracking and response times' },
  { icon: Shield, title: 'Safety Protocols', desc: 'Provider verification and security' },
  { icon: CreditCard, title: 'Payments & Fees', desc: 'Pricing transparency and refunds' },
];

const FAQS = [
  { q: 'How fast is the response time?', a: 'Our average arrival time is between 15-25 minutes, depending on your location and traffic conditions. You can track your provider in real-time.' },
  { q: 'Are your providers verified?', a: 'Yes, every provider on our platform undergoes a rigorous background check and vehicle inspection to ensure your safety.' },
  { q: 'What if I am not satisfied?', a: 'We offer a complete satisfaction guarantee. If the service is not up to our elite standards, our support team will resolve it immediately.' },
];

export default function HelpCenter() {
  const { appName } = useSystemStore();
  return (
    <div className="min-h-screen bg-[#F5F5F6]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-24 md:py-32">
        {/* Hero Section */}
        <div className="text-center mb-24">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
           >
              <h1 className="text-fluid-5xl font-black text-slate-900 tracking-tighter leading-none mb-8">Support Intel</h1>
              <p className="text-fluid-lg text-slate-500 font-medium max-w-2xl mx-auto mb-12">Search our knowledge base for rapid problem resolution.</p>
              
              <div className="max-w-2xl mx-auto relative group">
                 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                 <Input 
                   placeholder="SEARCH PROTOCOLS..." 
                   className="h-20 pl-16 rounded-[2rem] border-2 border-slate-100 bg-white shadow-premium text-lg font-bold placeholder:text-slate-300 focus:border-blue-600 transition-all"
                 />
              </div>
           </motion.div>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-32">
           {CATEGORIES.map((cat, i) => (
             <motion.div
               key={i}
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: i * 0.1 }}
               className="p-10 glass-card rounded-[3.5rem] hover:shadow-xl transition-all group"
             >
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-8 shadow-2xl shadow-blue-600/20 group-hover:rotate-6 transition-transform">
                   <cat.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{cat.title}</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8">{cat.desc}</p>
                <button className="flex items-center gap-3 text-blue-600 font-black text-[10px] uppercase tracking-widest group-hover:gap-5 transition-all">
                   Browse Category <ChevronRight className="w-4 h-4" />
                </button>
             </motion.div>
           ))}
        </div>

        {/* FAQ Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
           <div>
              <h2 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.5em] mb-6">FREQUENTLY ASKED</h2>
              <h3 className="text-4xl font-black text-slate-900 tracking-tighter mb-12">Rapid FAQ Access</h3>
              <div className="space-y-6">
                 {FAQS.map((faq, i) => (
                   <details key={i} className="group glass-card rounded-[2rem] p-8 cursor-pointer open:bg-white transition-all">
                      <summary className="flex items-center justify-between list-none">
                         <span className="text-lg font-bold text-slate-800 tracking-tight">{faq.q}</span>
                         <ChevronRight className="w-6 h-6 text-slate-400 group-open:rotate-90 transition-transform" />
                      </summary>
                      <p className="mt-6 text-slate-500 font-medium leading-relaxed border-t border-slate-50 pt-6">
                         {faq.a}
                      </p>
                   </details>
                 ))}
              </div>
           </div>

           <div className="bg-slate-950 rounded-[4rem] p-16 text-white shadow-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl -mr-20 -mt-20" />
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-12 border-b border-white/10 pb-4">Direct Uplink</h3>
              
              <div className="space-y-10">
                 <div className="flex items-center gap-6 group">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                       <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Live Intelligence</p>
                       <p className="text-lg font-black tracking-tight">Immediate Chat Support</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-6 group">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-green-400 group-hover:bg-green-600 group-hover:text-white transition-all">
                       <Phone className="w-6 h-6" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Voice Protocol</p>
                       <p className="text-lg font-black tracking-tight">+1 (800) ROAD-HELP</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-6 group">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all">
                       <Mail className="w-6 h-6" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Email Command</p>
                       <p className="text-lg font-black tracking-tight">support@{appName.toLowerCase().replace(/\s+/g, '')}.com</p>
                    </div>
                 </div>
              </div>

              <div className="mt-16 pt-10 border-t border-white/10">
                 <p className="text-sm text-slate-400 font-bold mb-10 italic">Our support assets are available 24/7/365 to ensure mission success.</p>
                 <Button className="w-full h-20 rounded-[2rem] bg-white text-slate-900 hover:bg-blue-600 hover:text-white font-black text-xs uppercase tracking-widest transition-all">
                    Initialize Support Link
                 </Button>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}
