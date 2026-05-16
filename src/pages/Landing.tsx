import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Star, 
  Instagram, Twitter, Facebook,
  ChevronLeft, ChevronRight, ShieldCheck, Zap, CreditCard
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/Logo';
import { useServices } from '@/hooks/useServices';
import { IconRenderer } from '@/components/shared/IconRenderer';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';

const TRUST_BADGES = [
  { icon: Zap, label: '15-25m Avg. Response', desc: 'Industry leading speed' },
  { icon: ShieldCheck, label: 'Verified Pros only', desc: 'Background checked providers' },
  { icon: CreditCard, label: 'No Membership required', desc: 'Only pay for what you need' },
];

export default function Landing() {
  const { services, isLoading: isServicesLoading } = useServices();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    const loadConfig = async () => {
      const snap = await getDoc(doc(db, 'system', 'config'));
      if (snap.exists()) setConfig(snap.data());
    };
    loadConfig();
  }, []);

  const slides = config?.heroSlides?.length > 0 ? [...config.heroSlides] : [
    {
      id: 'default',
      title: 'Stranded? | We\'ll get you moving.',
      image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=1200&auto=format&fit=crop',
    }
  ];

  const steps = config?.steps?.length > 0 ? [...config.steps] : [
    { idx: '01', title: 'Share Location', desc: 'Tell us where you are and what’s wrong with your vehicle.' },
    { idx: '02', title: 'Get Matched', desc: 'We instantly alert the nearest verified professionals.' },
    { idx: '03', title: 'Track Arrival', desc: 'Watch your helper approach in real-time on our live interactive map.' },
    { idx: '04', title: 'Resume Journey', desc: 'Pay securely after the work is done and get back on the road.' }
  ];

  const testimonials = config?.featuredReviews?.length > 0 ? config.featuredReviews : [
    {
      id: 'default',
      name: 'Emily Thompson',
      text: 'RoadHelp arrived in just 12 minutes when I had a flat tire on the highway.',
      rating: 5,
      loc: 'Chicago, IL'
    }
  ];

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const activeServices = useMemo(() => services.filter((s: any) => s.isActive ?? true), [services]);

  return (
    <div className="flex-1 bg-[#F5F5F6] text-[#1A1A2E] font-['Inter'] selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      
      {/* 1. Dynamic Hero Slider */}
      <section className="relative h-screen min-h-[600px] md:min-h-[800px] overflow-hidden bg-[#1A1A2E]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A2E] via-[#1A1A2E]/80 to-transparent z-10" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#1A1A2E] to-transparent z-10 opacity-70" />
            <img 
              src={slides[currentSlide].image} 
              alt="" 
              className="w-full h-full object-cover opacity-50 scale-105 group-hover:scale-100 transition-transform duration-[10s]"
            />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-20 max-w-7xl mx-auto px-6 lg:px-8 h-full flex flex-col justify-center">
          <motion.div
            key={`content-${currentSlide}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="max-w-4xl"
          >
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-600/10 border border-blue-500/30 rounded-full text-blue-400 font-black text-[10px] tracking-[0.3em] mb-10 uppercase backdrop-blur-md">
               <Zap className="w-4 h-4 fill-blue-500" strokeWidth={3} />
               {config?.appName || 'RoadHelp'} - PREMIER ROADSIDE ASSETS
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight mb-6 max-w-4xl">
              {slides[currentSlide].title.split('|').map((part: string, i: number) => (
                <span key={i} className={i % 2 === 1 ? "text-blue-500 block md:inline" : ""}>{part}</span>
              ))}
              {!slides[currentSlide].title.includes('|') && slides[currentSlide].title}
            </h1>
            <p className="text-lg md:text-xl text-slate-300 mb-10 font-medium leading-relaxed max-w-2xl">
              Elite roadside architecture at your fingertips. No subscriptions, absolute transparency, and 15-minute average arrival 24/7.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 h-14 px-8 text-base font-black shadow-lg shadow-blue-600/40 rounded-full group transition-all" asChild>
                <Link to="/get-help">
                  START URGENT REQUEST 
                  <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-base font-black border-white/20 text-white hover:bg-white/10 bg-transparent rounded-full backdrop-blur-md transition-all tracking-widest" asChild>
                <a href="#services">EXPLORE SERVICES</a>
              </Button>
            </div>
          </motion.div>

          {/* Trust Badges on Hero */}
          <div className="absolute bottom-16 left-8 right-12 hidden lg:flex items-center justify-between pointer-events-none">
             <div className="flex gap-16">
                {TRUST_BADGES.map((badge, idx) => (
                   <motion.div 
                     key={idx} 
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: 1 + idx * 0.2 }}
                     className="flex items-center gap-5"
                   >
                      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center justify-center text-blue-400 shadow-2xl">
                         <badge.icon className="w-6 h-6" />
                      </div>
                      <div>
                         <p className="text-[11px] font-black text-white uppercase tracking-[0.2em] mb-1">{badge.label}</p>
                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{badge.desc}</p>
                      </div>
                   </motion.div>
                ))}
             </div>
             
             {/* Slider Controls */}
             {slides.length > 1 && (
               <div className="flex items-center gap-4 pointer-events-auto">
                 <button 
                   onClick={prevSlide}
                   className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-slate-900 transition-all backdrop-blur-xl"
                 >
                   <ChevronLeft className="w-7 h-7" />
                 </button>
                 <button 
                   onClick={nextSlide}
                   className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-slate-900 transition-all backdrop-blur-xl"
                 >
                   <ChevronRight className="w-7 h-7" />
                 </button>
               </div>
             )}
          </div>
        </div>
      </section>

      {/* 2. SERVICES SECTION */}
      <section id="services" className="py-16 md:py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
           <div className="text-center mb-16">
              <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">CORE CAPABILITIES</h2>
              <h3 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">Everything Roadside</h3>
              <p className="text-base md:text-lg text-slate-500 mt-6 font-medium max-w-2xl mx-auto italic">Any protocol, any machine, anywhere. Our certified fleet is synchronized.</p>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {isServicesLoading ? (
                <div className="col-span-full text-center text-slate-300 py-32 animate-pulse font-black uppercase tracking-[0.5em]">SYNCHRONIZING ASSETS...</div>
              ) : activeServices.map((s: any) => (
                <motion.div
                  key={s.id}
                  whileHover={{ y: -5, scale: 1.01 }}
                  className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-blue-600/10 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-bl-full group-hover:bg-blue-600 group-hover:scale-150 transition-all duration-700" />
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-8 group-hover:rotate-12 transition-transform shadow-lg shadow-blue-600/30 relative z-10">
                    <IconRenderer name={s.icon} size={32} />
                  </div>
                  <h4 className="text-2xl font-black mb-4 text-slate-900 tracking-tight relative z-10">{s.name}</h4>
                  <p className="text-slate-500 font-medium leading-relaxed mb-8 relative z-10 text-sm">{s.description}</p>
                  <Link to={`/get-help?service=${encodeURIComponent(s.id)}`} className="inline-flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest group-hover:gap-4 transition-all relative z-10">
                    REQUEST DISPATCH <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              ))}
           </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-16 md:py-24 bg-slate-950 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
           <div className="text-center mb-16">
              <h2 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4 text-center">THE PROTOCOL</h2>
              <h3 className="text-3xl md:text-5xl font-black text-white tracking-tight text-center">Optimized Response Flow</h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative">
              {/* Background Line */}
              <div className="absolute top-32 left-0 right-0 h-px bg-white/10 hidden lg:block z-0" />
              
              {steps.map((step: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="relative z-10 text-center group"
                >
                  <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8 shadow-xl backdrop-blur-xl group-hover:bg-blue-600 group-hover:border-blue-500 transition-all duration-300 transform group-hover:scale-105">
                    <span className="text-2xl font-black text-blue-500 group-hover:text-white transition-colors">{step.idx || `0${i+1}`}</span>
                  </div>
                  <h4 className="text-xl font-black mb-4 tracking-tight group-hover:text-blue-400 transition-colors">{step.title}</h4>
                  <p className="text-slate-400 font-medium leading-relaxed px-2 text-sm">{step.desc}</p>
                </motion.div>
              ))}
           </div>
           
           <div className="mt-20 text-center">
             <Button size="lg" className="h-14 px-10 rounded-full font-black tracking-widest text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/40 transition-all transform hover:scale-105" asChild>
                <Link to="/signup">BECOME A VERIFIED PROVIDER</Link>
             </Button>
           </div>
        </div>
      </section>

      {/* 4. REVIEWS SECTION */}
      <section id="reviews" className="py-16 md:py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
           <div className="text-center mb-16">
              <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">FIELD INTEL</h2>
              <h3 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-8">Trusted Across the Network</h3>
              <div className="flex items-center justify-center gap-1.5 text-amber-500">
                 {[1,2,3,4,5].map(i => <Star key={i} className="w-6 h-6 fill-current stroke-current" />)}
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {testimonials.map((t: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.98 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="glass-card p-8 rounded-3xl flex flex-col h-full hover:shadow-xl hover:shadow-blue-600/5 transition-all group"
                >
                  <div className="flex gap-1 text-amber-500 mb-6">
                     {[...Array(t.rating || 5)].map((_, idx) => <Star key={idx} className="w-4 h-4 fill-current" />)}
                  </div>
                  <p className="text-base font-medium text-slate-800 leading-relaxed mb-8 flex-grow italic tracking-tight">
                    “{t.text}”
                  </p>
                  <div className="flex items-center gap-4 pt-6 border-t border-slate-100">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-lg shadow-md shadow-blue-600/20">
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 leading-tight">{t.name}</p>
                      <p className="text-[10px] text-blue-600 font-bold tracking-widest uppercase mt-1">{t.loc || 'Verified Driver'}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
           </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-24 md:py-32 border-t border-slate-100 bg-[#F5F5F6]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-16 md:gap-24 mb-24 md:mb-32">
            <Logo size="lg" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-10 gap-x-16 text-center md:text-left">
              {[
                { label: 'Platform Capabilities', href: '/#services' },
                { label: 'Dispatch Protocol', href: '/#how-it-works' },
                { label: 'Privacy Framework', href: '/privacy' },
                { label: 'Usage Parameters', href: '/terms' },
                { label: 'Network Portal', href: '/signup' },
              ].map((l) => (
                <a key={l.label} href={l.href} className="text-[11px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-[0.2em] transition-all whitespace-nowrap">{l.label}</a>
              ))}
            </div>
            <div className="flex gap-6">
              {[Twitter, Instagram, Facebook].map((Icon, i) => (
                <a key={i} href="#" className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white hover:scale-110 shadow-sm transition-all">
                  <Icon className="w-6 h-6" />
                </a>
              ))}
            </div>
          </div>
          <div className="text-center pt-16 border-t border-slate-200/50">
            <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.5em] leading-relaxed">
              © 2026 ROADHELP CORP. SECURED BY MULTI-LAYERED ENCRYPTION. 
            </p>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] leading-relaxed">
              This Website is for demo purpose only. No real services are provided.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
