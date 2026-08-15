import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { PhoneInputGroup } from '@/components/ui/phone-input';
import { isValidInternationalPhone } from '@/lib/validators';

import { useSystemStore } from '@/stores/systemStore';

const contactSchema = z.object({
  name: z.string().min(2, 'Please enter your name (at least 2 characters)'),
  email: z.string().min(1, 'Email address is required').email('Please enter a valid email address'),
  phone: z.string().optional(),
  countryCode: z.string(),
  subject: z.string().optional().or(z.literal('')),
  message: z.string().min(10, 'Please write a message with at least 10 characters'),
}).refine((data) => {
  if (!data.phone || data.phone.trim() === '') return true;
  return isValidInternationalPhone(data.phone, data.countryCode);
}, {
  message: 'Please enter a valid phone number for the selected country',
  path: ['phone'],
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const { supportPhone, supportEmail } = useSystemStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      countryCode: '+91',
      subject: '',
      message: '',
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'contactSubmissions'), {
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone && data.phone.trim() ? `${data.countryCode}${data.phone.trim()}` : '',
        subject: data.subject?.trim() || 'General Inquiry',
        message: data.message.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      setIsSubmitted(true);
      toast.success('Thank you! Your message has been received by our support team.');
      reset();
    } catch (err: any) {
      console.error('[ContactPage] Submission error:', err);
      toast.error(err?.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorClass = (err: unknown) =>
    err ? 'border-red-500 ring-red-100 bg-red-50' : 'bg-slate-50 border-slate-200 focus:bg-white';

  return (
    <div className="min-h-screen bg-[#F5F5F6] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 container-app py-12 md:py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full inline-block mb-4">
            24/7 Support Hotline
          </span>
          <h1 className="text-4xl sm:text-[2rem] sm:text-4xl font-black text-slate-900 tracking-tight leading-none mb-6">
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
                  <p className="font-bold text-white text-base mt-0.5">India</p>
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
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Name *</Label>
                    <Input placeholder="Alex Johnson" {...register('name')} className={`h-12 rounded-2xl font-semibold ${errorClass(errors.name)}`} />
                    {errors.name && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 tracking-wider">{errors.name.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address *</Label>
                    <Input type="email" placeholder="you@example.com" {...register('email')} className={`h-12 rounded-2xl font-semibold ${errorClass(errors.email)}`} />
                    {errors.email && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 tracking-wider">{errors.email.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone Number (Optional)</Label>
                    <PhoneInputGroup
                      countryCode={watch('countryCode') || '+91'}
                      phone={watch('phone') || ''}
                      onCountryCodeChange={(v) => setValue('countryCode', v)}
                      onPhoneChange={(v) => setValue('phone', v, { shouldValidate: true })}
                      error={!!errors.phone}
                    />
                    {errors.phone && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 tracking-wider">{errors.phone.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subject</Label>
                    <Input placeholder="e.g. Booking Question" {...register('subject')} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Message *</Label>
                  <Textarea placeholder="How can we assist you?" {...register('message')} className={`rounded-2xl min-h-[120px] font-semibold ${errorClass(errors.message)}`} />
                  {errors.message && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 tracking-wider">{errors.message.message}</p>}
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
