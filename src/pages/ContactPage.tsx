import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Phone, Mail, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { db } from '@/config/firebase';
import { collection, addDoc } from 'firebase/firestore';

import { useSystemStore } from '@/stores/systemStore';

export default function ContactPage() {
  const { supportPhone, supportEmail } = useSystemStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'contactSubmissions'), {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        subject: subject.trim() || 'General Inquiry',
        message: message.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      setIsSubmitted(true);
      toast.success('Thank you! Your message has been received by our support team.');
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      console.error('[ContactPage] Submission error:', err);
      toast.error(err?.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F6] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full inline-block mb-4">
            24/7 Support Hotline
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-none mb-6">
            Get in Touch With Our Team
          </h1>
          <p className="text-slate-500 font-medium text-base leading-relaxed">
            Have questions about your booking, provider onboarding, or corporate fleet accounts? We’re here to help.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-5xl mx-auto mb-16">
          <div className="lg:col-span-5 bg-slate-900 text-white rounded-[2.5rem] p-8 sm:p-10 space-y-8 shadow-xl">
            <h3 className="text-2xl font-black tracking-tight">Support Contacts</h3>

            <div className="space-y-6 text-sm text-slate-300">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400 shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Emergency Helpline</p>
                  <p className="font-bold text-white text-base mt-0.5">{supportPhone || '+1 (800) 555-ROAD / 1800-ROAD-HELP'}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400 shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Support</p>
                  <p className="font-bold text-white text-base mt-0.5">{supportEmail || 'support@roadhelp.com'}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Headquarters</p>
                  <p className="font-bold text-white text-base mt-0.5">100 Tech Fleet Way, Suite 400</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white rounded-[2.5rem] border border-slate-200 p-8 sm:p-10 shadow-xl shadow-slate-900/5">
            {isSubmitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">Message Received!</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto">
                  Thank you for reaching out. An admin support specialist will review your inquiry and email you back shortly.
                </p>
                <Button onClick={() => setIsSubmitted(false)} variant="outline" className="mt-4 rounded-xl font-black uppercase text-xs tracking-wider">
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Name *</Label>
                    <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Johnson" className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address *</Label>
                    <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone Number (Optional)</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subject</Label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Booking Question" className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Message *</Label>
                  <Textarea required value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we assist you?" className="rounded-2xl min-h-[120px] bg-slate-50 border-slate-200 font-semibold" />
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl min-h-[48px] shadow-lg shadow-blue-600/20">
                  {isSubmitting ? 'Sending...' : 'Send Message'} <Send className="w-4 h-4 ml-2" />
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}


