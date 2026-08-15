import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ChevronDown, Search, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

const FAQS = [
  {
    q: 'How fast do service providers arrive?',
    a: 'Average arrival time is 15-25 minutes depending on traffic and exact GPS distance. You can track your helper live on the OSRM map.',
  },
  {
    q: 'Can I choose which provider helps me?',
    a: 'Yes! Multiple nearby providers submit price quotes and arrival ETAs. You can compare ratings, price, and distance before picking an offer.',
  },
  {
    q: 'Do I need an account to request emergency help?',
    a: 'No! Guests can submit a breakdown request immediately. A guest session is automatically created for your tracking link.',
  },
  {
    q: 'How are provider prices calculated?',
    a: 'Service base prices are set transparently by Admins. Providers submit explicit quotes for any specialized labor or towing distance.',
  },
  {
    q: 'What is the arrival OTP for?',
    a: 'The 4-digit arrival OTP is a safety feature. The service provider must verify the code with you upon arrival before starting the job.',
  },
  {
    q: 'How do I become a service provider on RoadHelp?',
    a: 'Click "For Providers" in the navigation and fill out the registration form with your shop address, radius, and services offered.',
  },
];

export default function FAQPage() {
  const [search, setSearch] = useState('');
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const filtered = FAQS.filter(
    (f) => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F5F5F6] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full inline-block mb-4">
            Help & Knowledgebase
          </span>
          <h1 className="text-4xl sm:text-[2rem] sm:text-4xl font-black text-slate-900 tracking-tight leading-none mb-6">
            Frequently Asked Questions
          </h1>
          <p className="text-slate-500 font-medium text-base leading-relaxed">
            Find answers to common questions about request dispatch, pricing, safety, and provider verification.
          </p>

          <div className="relative mt-8 max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search FAQ..."
              className="h-12 rounded-2xl pl-12 bg-white border-slate-200 font-semibold shadow-sm"
            />
          </div>
        </motion.div>

        <div className="space-y-4 mb-16">
          {filtered.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={faq.q} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all">
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 font-black text-slate-900 text-base sm:text-lg cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
                    {faq.q}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 pt-0 text-slate-600 text-sm leading-relaxed border-t border-slate-100">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}



