import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Search,
  Star,
  Instagram,
  Twitter,
  Facebook,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  Clock3,
  MessageSquareText,
  CircleHelp,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Logo } from '@/components/shared/Logo';
import { Footer } from '@/components/layout/Footer';
import { useServices } from '@/hooks/useServices';
import { IconRenderer } from '@/components/shared/IconRenderer';
import { getServiceLabel } from '@/lib/utils';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useSystemStore } from '@/stores/systemStore';


const TRUST_BADGES = [
  { icon: Clock3, label: 'Fast arrival', desc: 'Average response in under 30 minutes' },
  { icon: ShieldCheck, label: 'Verified providers', desc: 'Every partner is reviewed before activation' },
  { icon: Zap, label: 'Simple pricing', desc: 'Clear pricing before you confirm the booking' },
];

const EXTRA_ISSUES = [
  'Battery issue',
  'Fuel delivery',
  'Tyre puncture',
  'Towing',
  'Engine issue',
  'Lockout',
  'Accident help',
  'Brake issue',
  'Electrical issue',
  'Other',
];

const ISSUE_SERVICE_HINTS: Record<string, string> = {
  'Battery issue': 'jumpStart',
  'Fuel delivery': 'fuelDelivery',
  'Tyre puncture': 'flatTire',
  'Towing': 'towing',
  'Engine issue': 'engineIssue',
  'Accident help': 'accidentHelp',
  'Brake issue': 'brakeIssue',
  'Electrical issue': 'electricalIssue',
  'Lockout': 'lockout',
};

export default function Landing() {
  const navigate = useNavigate();
  const { appName } = useSystemStore();
  const { services, isLoading: isServicesLoading } = useServices();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [config, setConfig] = useState<any>(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const [customIssue, setCustomIssue] = useState('');

  useEffect(() => {
    const loadConfig = async () => {
      const snap = await getDoc(doc(db, 'system', 'config'));
      if (snap.exists()) setConfig(snap.data());
    };
    loadConfig();
  }, []);

  const slides = config?.heroSlides?.length > 0
    ? [...config.heroSlides]
    : [
        {
          id: 'default',
          title: 'Help when the road stops being easy.',
          image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=1200&auto=format&fit=crop',
        },
      ];

  const steps = config?.steps?.length > 0
    ? [...config.steps]
    : [
        { idx: '01', title: 'Tell us what happened', desc: 'Choose a service or describe the problem in your own words.' },
        { idx: '02', title: 'Share your location', desc: 'Use GPS or drop a pin so the nearest provider can reach you.' },
        { idx: '03', title: 'Review the booking', desc: 'Check the details, price estimate, and contact information.' },
        { idx: '04', title: 'Get moving again', desc: 'We send the request and keep the process simple from there.' },
      ];

  const testimonials = config?.featuredReviews?.length > 0
    ? config.featuredReviews
    : [
        {
          id: 'default',
          name: 'Emily Thompson',
          text: 'I had a flat tire late at night and still got clear updates and quick help.',
          rating: 5,
          loc: 'Chicago, IL',
        },
      ];

  const activeServices = useMemo(
    () => services.filter((s: any) => (s.isActive ? true : false) && s.id !== 'otherService'),
    [services],
  );

  const filteredServices = useMemo(() => {
    const query = serviceSearch.trim().toLowerCase();
    if (!query) return activeServices;
    return activeServices.filter((service: any) =>
      [service.name, getServiceLabel(service.id as any), service.description].join(' ').toLowerCase().includes(query),
    );
  }, [activeServices, serviceSearch]);

  const startHelp = (serviceId?: string, issue?: string, serviceLabel?: string) => {
    const normalizedIssue = (issue || customIssue).trim().toLowerCase();
    const resolvedService = serviceId
      ? activeServices.find((service) => service.id === serviceId)
      : normalizedIssue
        ? activeServices.find((service) => {
            const serviceName = service.name.toLowerCase();
            const serviceLabelName = getServiceLabel(service.id as any).toLowerCase();
            const hintedId = ISSUE_SERVICE_HINTS[issue || customIssue || ''];
            return service.id === hintedId || serviceName === normalizedIssue || serviceLabelName === normalizedIssue;
          })
        : null;

    const serviceType = resolvedService?.id || (issue || customIssue ? 'otherService' : '');
    const draft = {
      serviceType,
      serviceLabel:
        resolvedService?.id === 'otherService'
          ? (serviceLabel || issue || customIssue || 'Other Service')
          : serviceLabel || resolvedService?.name || issue || customIssue,
      description: issue || customIssue,
      notes: issue || customIssue,
    };
    const problemText = (issue || customIssue).trim();
    const problemParam = problemText ? `&problem=${encodeURIComponent(problemText)}` : '';
    navigate(
      serviceType
        ? `/get-help?service=${encodeURIComponent(serviceType)}${problemParam}`
        : problemText
        ? `/get-help?problem=${encodeURIComponent(problemText)}`
        : '/get-help'
    );
  };


  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <div className="flex-1 bg-[#F5F5F6] text-[#1A1A2E] selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      <section className="relative min-h-[88vh] overflow-hidden bg-[#0f172a] text-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            className="absolute inset-0"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/80 to-transparent z-10" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0f172a] to-transparent z-10 opacity-80" />
            <img
              src={slides[currentSlide].image}
              alt=""
              className="w-full h-full object-cover opacity-45 scale-105"
            />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-20 container-app pt-8 pb-16 min-h-[88vh] flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-4xl"
          >
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 border border-white/10 rounded-full text-[10px] tracking-[0.3em] mb-8 uppercase backdrop-blur-md font-black">
              <Zap className="w-4 h-4 text-cyan-300" strokeWidth={3} />
              {appName}, ready when your day changes course
            </div>
            <h1 className=" font-black tracking-tight leading-[0.95] mb-6 max-w-4xl">
              <span className="text-3xl sm:text-4xl block">{config?.heroHeadline || 'Roadside help'}</span>
              <span className="text-3xl sm:text-4xl block text-cyan-300">{config?.heroSubheadline || 'without the stress.'}</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 mb-10 font-medium leading-relaxed max-w-2xl">
              Choose the issue, share your location, and get matched with a verified provider in a few simple steps.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 h-14 px-8 text-base font-black rounded-full group transition-all" asChild>
                <Link to="/get-help">
                  Get help now
                  <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-base font-black border-white/20 text-white hover:bg-white/10 bg-transparent rounded-full backdrop-blur-md transition-all tracking-widest" asChild>
                <Link to="/services">Browse services</Link>
              </Button>

            </div>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-3 mt-16 max-w-5xl">
            {TRUST_BADGES.map((badge, idx) => (
              <motion.div
                key={badge.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.08 }}
                className="rounded-3xl bg-white/8 border border-white/10 backdrop-blur-xl p-5 flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-cyan-300 shrink-0">
                  <badge.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] mb-1">{badge.label}</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{badge.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {slides.length > 1 && (
            <div className="absolute bottom-8 right-6 lg:right-8 flex items-center gap-3 z-20">
              <button onClick={prevSlide} className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-slate-900 transition-all backdrop-blur-xl" aria-label="Previous slide">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={nextSlide} className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-slate-900 transition-all backdrop-blur-xl" aria-label="Next slide">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      </section>

      <section id="services" className="py-16 md:py-24 bg-white relative">
        <div className="container-app">
          <div className="max-w-3xl mb-10">
            <p className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] mb-4">Services</p>
            <h2 className="text-3xl md:text-[2rem] sm:text-4xl font-black text-slate-900 tracking-tight">Choose a service, or tell us what you need.</h2>
            <p className="text-base md:text-lg text-slate-500 mt-5 font-medium leading-relaxed">We keep the list short, clear, and focused on the most common roadside problems. If your issue is different, add a short note and we'll handle it from there.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.9fr] gap-8 items-center">
            <div>
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    placeholder="Search services or describe the issue"
                    className="h-14 rounded-2xl pl-12 bg-slate-50 border-slate-200 font-medium"
                  />
                </div>
                <Button type="button" className="h-14 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black" onClick={() => startHelp()}>
                  Continue
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {isServicesLoading ? (
                  <div className="col-span-full text-center text-slate-300 py-20 animate-pulse font-black uppercase tracking-[0.4em]">Loading services...</div>
                ) : filteredServices.length > 0 ? filteredServices.map((service: any) => (
                  <motion.button
                    key={service.id}
                    type="button"
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => startHelp(service.id, service.name, service.name)}
                    className="bg-slate-50 p-6 rounded-[1.75rem] border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-blue-600/10 transition-all duration-100 group relative overflow-hidden text-left"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 rounded-bl-[2rem] group-hover:bg-blue-600/50 transition-all" />
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 mb-6 shadow-sm">
                      <IconRenderer name={service.icon} size={30} />
                    </div>
                    <h3 className="text-xl font-black mb-2 text-slate-900 tracking-tight">{getServiceLabel(service.id as any)}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-6">{service.description}</p>
                    <span className="inline-flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-[0.2em]">
                      Start booking <ArrowRight className="w-4 h-4" />
                    </span>
                  </motion.button>
                )) : (
                  <div className="col-span-full rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
                    No services match your search. Try one of the quick issue options below.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] bg-slate-100/20 border-slate-200 text-black p-8 md:p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-44 h-44 bg-cyan-400/10 rounded-full -mr-20 -mt-20 blur-2xl" />
              <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-500 mb-3">Need something else?</p>
              <h3 className="text-2xl font-black tracking-tight mb-4">Tell us in a sentence.</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">If your problem is not on the list, write a short note and we'll still route you to the right help.</p>
              <Textarea
                value={customIssue}
                onChange={(e) => setCustomIssue(e.target.value)}
                placeholder="Example: My truck is overheating and I need a quick check."
                className="min-h-[120px] rounded-2xl bg-white/5 border-white/10 text-black placeholder:text-slate-400 resize-none mb-4"
              />
              <Button type="button" className="w-full h-12 rounded-2xl bg-cyan-400 hover:bg-cyan-600 text-slate-950 font-black" onClick={() => startHelp(customIssue ? 'otherService' : undefined, customIssue, customIssue)}>
                Use this request
              </Button>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {EXTRA_ISSUES.map((issue) => (
                  <button
                    key={issue}
                    type="button"
                    onClick={() => startHelp(undefined, issue, issue)}
                    className="rounded-2xl border border-black bg-white/5 px-4 py-3 text-left text-sm font-medium text-slate-400 hover:bg-slate-200 transition-all"
                  >
                    {issue}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-16 md:py-24 bg-slate-950 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="container-app relative z-10">
          <div className="text-center mb-16">
            <p className="text-xs font-black text-cyan-300 uppercase tracking-[0.3em] mb-4">How it works</p>
            <h3 className="text-3xl md:text-[2rem] sm:text-4xl font-black text-white tracking-tight text-center">A calmer way to get help</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            <div className="absolute top-32 left-0 right-0 h-px bg-white/10 hidden lg:block z-0" />
            {steps.map((step: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative z-10 text-center group"
              >
                <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8 shadow-xl backdrop-blur-xl group-hover:bg-cyan-400 group-hover:border-cyan-300 transition-all duration-300 transform group-hover:scale-105">
                  <span className="text-2xl font-black text-cyan-300 group-hover:text-slate-950 transition-colors">{step.idx || `0${i + 1}`}</span>
                </div>
                <h4 className="text-xl font-black mb-4 tracking-tight group-hover:text-cyan-300 transition-colors">{step.title}</h4>
                <p className="text-slate-400 font-medium leading-relaxed px-2 text-sm">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-20 text-center">
            <Button size="lg" className="h-14 px-10 rounded-full font-black tracking-widest text-slate-950 bg-white hover:bg-cyan-300 shadow-lg transition-all" asChild>
              <Link to="/signup">Create an account</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="reviews" className="py-16 md:py-24 bg-white relative overflow-hidden">
        <div className="container-app">
          <div className="text-center mb-16">
            <p className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] mb-4">Customer stories</p>
            <h3 className="text-3xl md:text-[2rem] sm:text-4xl font-black text-slate-900 tracking-tight mb-8">Trusted by drivers who needed help fast</h3>
            <div className="flex items-center justify-center gap-1.5 text-amber-500">
              {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-6 h-6 fill-current stroke-current" />)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {testimonials.map((t: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 flex flex-col h-full hover:shadow-xl hover:shadow-blue-600/5 transition-all"
              >
                <div className="flex gap-1 text-amber-500 mb-6">
                  {[...Array(t.rating || 5)].map((_, idx) => <Star key={idx} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="text-base font-medium text-slate-800 leading-relaxed mb-8 flex-grow italic tracking-tight">“{t.text}”</p>
                <div className="flex items-center gap-4 pt-6 border-t border-slate-100">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-lg shadow-md shadow-blue-600/20">{t.name[0]}</div>
                  <div>
                    <p className="font-bold text-slate-900 leading-tight">{t.name}</p>
                    <p className="text-[10px] text-blue-600 font-bold tracking-widest uppercase mt-1">{t.loc || 'Verified user'}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}








