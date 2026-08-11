import { useState, useEffect } from 'react';
import { Mail, Save, FileEdit, Variable } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/lib/auditLogger';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type EmailTemplate = {
  subject: string;
  body: string;
};

type Templates = {
  loginOtp: EmailTemplate;
  signupOtp: EmailTemplate;
  bookingConfirmation: EmailTemplate;
};

const DEFAULT_TEMPLATES: Templates = {
  loginOtp: {
    subject: 'Your Login Verification Code',
    body: `<h1>Login Verification</h1>
<p>Hello,</p>
<p>Your one-time password (OTP) for login is: <strong>{{otp}}</strong></p>
<p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
<p>Thanks,<br>RoadHelp Team</p>`,
  },
  signupOtp: {
    subject: 'Verify Your Account Registration',
    body: `<h1>Account Registration</h1>
<p>Hello,</p>
<p>Your one-time password (OTP) for registration is: <strong>{{otp}}</strong></p>
<p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
<p>Thanks,<br>RoadHelp Team</p>`,
  },
  bookingConfirmation: {
    subject: 'Booking Confirmation - #{{bookingId}}',
    body: `<h1>Booking Confirmed!</h1>
<p>Hello {{customerName}},</p>
<p>Your service request #{{bookingId}} for <strong>{{serviceType}}</strong> has been confirmed.</p>
<p>Our provider will arrive shortly.</p>
<p>Thanks,<br>RoadHelp Team</p>`,
  }
};

export default function AdminEmailTemplates() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<keyof Templates>('loginOtp');
  const [templates, setTemplates] = useState<Templates>(DEFAULT_TEMPLATES);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const snap = await getDoc(doc(db, 'system', 'emailTemplates'));
        if (snap.exists()) {
          setTemplates((prev) => ({ ...prev, ...snap.data() as Templates }));
        }
      } catch (err) {
        console.error('Failed to load templates:', err);
      }
    };
    loadTemplates();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'system', 'emailTemplates'), templates, { merge: true });
      await logAdminAction({
        adminEmail: profile?.email || 'admin@roadhelp.com',
        action: 'UPDATE_EMAIL_TEMPLATES',
        module: 'Email Settings',
        details: 'Updated email templates configuration',
      });
      toast.success('Email templates saved successfully!');
    } catch (err: any) {
      toast.error('Failed to save templates');
    } finally {
      setIsSaving(false);
    }
  };

  const updateCurrentTemplate = (field: keyof EmailTemplate, value: string) => {
    setTemplates((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [field]: value,
      }
    }));
  };

  return (
    <AdminLayout>
      <div className="space-y-8 pb-16">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-purple-600/10 text-purple-600">
                <Mail className="w-6 h-6" />
              </span>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Email Template Designer</h1>
            </div>
            <p className="text-slate-500 text-xs font-medium mt-1">
              Design and customize HTML email templates sent to users for OTPs and notifications.
            </p>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl h-12 px-6 shadow-lg shadow-purple-600/20">
            <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Saving...' : 'Save All Templates'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Select Template</h3>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as keyof Templates)} orientation="vertical" className="w-full">
              <TabsList className="flex flex-col h-auto bg-transparent gap-2">
                <TabsTrigger value="loginOtp" className="w-full justify-start p-4 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:shadow-none rounded-xl border border-transparent data-[state=active]:border-purple-200">
                  <FileEdit className="w-4 h-4 mr-3" /> Login OTP
                </TabsTrigger>
                <TabsTrigger value="signupOtp" className="w-full justify-start p-4 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:shadow-none rounded-xl border border-transparent data-[state=active]:border-purple-200">
                  <FileEdit className="w-4 h-4 mr-3" /> Signup OTP
                </TabsTrigger>
                <TabsTrigger value="bookingConfirmation" className="w-full justify-start p-4 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:shadow-none rounded-xl border border-transparent data-[state=active]:border-purple-200">
                  <FileEdit className="w-4 h-4 mr-3" /> Booking Confirmation
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-3">
                <Variable className="w-4 h-4" /> Available Variables
              </h4>
              <ul className="text-[11px] font-bold text-slate-500 space-y-2">
                {activeTab === 'loginOtp' || activeTab === 'signupOtp' ? (
                  <li><code className="bg-slate-200 px-1 py-0.5 rounded text-purple-700">{`{{otp}}`}</code> - 6 Digit Code</li>
                ) : (
                  <>
                    <li><code className="bg-slate-200 px-1 py-0.5 rounded text-purple-700">{`{{bookingId}}`}</code> - Request ID</li>
                    <li><code className="bg-slate-200 px-1 py-0.5 rounded text-purple-700">{`{{customerName}}`}</code> - Customer Name</li>
                    <li><code className="bg-slate-200 px-1 py-0.5 rounded text-purple-700">{`{{serviceType}}`}</code> - Service Type</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-xl overflow-hidden flex flex-col h-full min-h-[600px]">
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-widest min-w-[80px]">Subject:</Label>
                <Input 
                  value={templates[activeTab]?.subject || ''} 
                  onChange={(e) => updateCurrentTemplate('subject', e.target.value)}
                  className="h-12 rounded-xl bg-white border-slate-200 font-bold"
                />
              </div>
              <div className="flex-1 flex flex-col p-6">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">HTML Body Content:</Label>
                <Textarea 
                  value={templates[activeTab]?.body || ''} 
                  onChange={(e) => updateCurrentTemplate('body', e.target.value)}
                  className="flex-1 rounded-xl bg-slate-900 text-green-400 font-mono text-sm border-slate-800 p-6 min-h-[400px] leading-relaxed"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
