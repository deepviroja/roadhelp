import { Link } from 'react-router-dom';
import { Logo } from '@/components/shared/Logo';
import { Phone, Mail, MapPin, ShieldCheck, Heart, ArrowRight } from 'lucide-react';
import { useSystemStore } from '@/stores/systemStore';

export function Footer() {
  const { appName } = useSystemStore();

  return (
    <footer className="bg-slate-900 text-white pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-16 border-b border-slate-800">
          {/* Brand & Emergency Info */}
          <div className="lg:col-span-2 space-y-6">
            <Logo size="lg" className='w-fit bg-slate-100 p-2 rounded-md '/>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              24/7 On-Demand Roadside Assistance Marketplace. Connecting stranded motorists with verified nearby towing, battery, and mechanic specialists in minutes.
            </p>
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 flex items-center gap-4 max-w-sm">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">24/7 Emergency Hotline</p>
                <p className="text-lg font-black text-white">+1 (800) 555-ROAD</p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <p className="text-xs font-black uppercase text-blue-400 tracking-[0.2em]">Explore Platform</p>
            <ul className="space-y-2.5 text-xs font-bold text-slate-400">
              <li>
                <Link to="/services" className="hover:text-white transition-colors">Assistance Services</Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-white transition-colors">How It Works</Link>
              </li>
              <li>
                <Link to="/for-customers" className="hover:text-white transition-colors">For Motorists & Customers</Link>
              </li>
              <li>
                <Link to="/for-providers" className="hover:text-white transition-colors">For Service Providers</Link>
              </li>
              <li>
                <Link to="/get-help" className="hover:text-white transition-colors">Request Emergency Help</Link>
              </li>
            </ul>
          </div>

          {/* Services Breakdown */}
          <div className="space-y-4">
            <p className="text-xs font-black uppercase text-blue-400 tracking-[0.2em]">Popular Services</p>
            <ul className="space-y-2.5 text-xs font-bold text-slate-400">
              <li><Link to="/services" className="hover:text-white transition-colors">Towing Assistance</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">Battery Jumpstart</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">Fuel Delivery</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">Tyre Puncture & Replacement</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">Lockout Assistance</Link></li>
            </ul>
          </div>

          {/* Company & Support */}
          <div className="space-y-4">
            <p className="text-xs font-black uppercase text-blue-400 tracking-[0.2em]">Company & Legal</p>
            <ul className="space-y-2.5 text-xs font-bold text-slate-400">
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
              <li><Link to="/faq" className="hover:text-white transition-colors">FAQ & Knowledgebase</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-500">
          <p>© 2026 {appName.toUpperCase()} MARKETPLACE INC. ALL RIGHTS RESERVED.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Verified Partner Network
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
