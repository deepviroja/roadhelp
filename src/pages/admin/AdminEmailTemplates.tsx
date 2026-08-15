import { useState, useEffect } from 'react';
import { Mail, Save, FileEdit, Variable, Code, Eye } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type EmailTemplate = {
  subject: string;
  body: string;
};

type Templates = {
  loginOtp: EmailTemplate;
  signupOtp: EmailTemplate;
  welcome: EmailTemplate;
  welcomeGuest: EmailTemplate;
  magicLink: EmailTemplate;
  passwordReset: EmailTemplate;
  requestReceived: EmailTemplate;
};

const DEFAULT_TEMPLATES: Templates = {
  loginOtp: {
    subject: 'Your {{appName}} Verification Code',
    body: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h2 style="color: #2563eb; font-weight: 800; margin: 0;">{{appName}} Verification</h2>
  </div>
  <p style="font-size: 16px;">Hi {{fullName}},</p>
  <p style="font-size: 14px; color: #475569;">Use the following 6-digit verification code to complete your verification. This code is valid for 10 minutes.</p>
  <div style="text-align: center; margin: 32px 0;">
    <div style="display: inline-block; background-color: #f1f5f9; border: 2px solid #cbd5e1; border-radius: 16px; padding: 16px 32px; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0f172a;">
      {{otp}}
    </div>
  </div>
  <p style="font-size: 12px; color: #94a3b8; text-align: center;">If you did not make this request, please ignore this email.</p>
</div>`,
  },
  signupOtp: {
    subject: 'Your {{appName}} Verification Code',
    body: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h2 style="color: #2563eb; font-weight: 800; margin: 0;">{{appName}} Verification</h2>
  </div>
  <p style="font-size: 16px;">Hi {{fullName}},</p>
  <p style="font-size: 14px; color: #475569;">Use the following 6-digit verification code to complete your verification. This code is valid for 10 minutes.</p>
  <div style="text-align: center; margin: 32px 0;">
    <div style="display: inline-block; background-color: #f1f5f9; border: 2px solid #cbd5e1; border-radius: 16px; padding: 16px 32px; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0f172a;">
      {{otp}}
    </div>
  </div>
  <p style="font-size: 12px; color: #94a3b8; text-align: center;">If you did not make this request, please ignore this email.</p>
</div>`,
  },
  welcome: {
    subject: 'Welcome to {{appName}}',
    body: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h2 style="color: #2563eb; font-weight: 800; margin: 0;">Welcome to {{appName}}</h2>
  </div>
  <p style="font-size: 16px;">Hi {{fullName}},</p>
  <p style="font-size: 14px; color: #475569;">Your account is ready. You can sign in using your email address.</p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="{{loginLink}}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px;">
      Sign In Now
    </a>
  </div>
  <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px;">If you wish to set a custom password, you may use the forgot password flow on the sign in page.</p>
</div>`,
  },
  welcomeGuest: {
    subject: 'Welcome to {{appName}} - Account Created',
    body: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h2 style="color: #2563eb; font-weight: 800; margin: 0;">Welcome to {{appName}}</h2>
  </div>
  <p style="font-size: 16px;">Hi {{fullName}},</p>
  <p style="font-size: 14px; color: #475569;">An account has been created for you to help you track your service request.</p>
  
  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 24px 0;">
    <p style="margin: 0; font-size: 13px; color: #64748b;"><strong>Account Details:</strong></p>
    <p style="margin: 8px 0 0 0; font-size: 14px; color: #334155;"><strong>Email:</strong> {{email}}</p>
    <p style="margin: 4px 0 0 0; font-size: 14px; color: #334155;"><strong>Temporary Password:</strong> <code style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 700;">{{password}}</code></p>
    <p style="margin: 12px 0 0 0; font-size: 12px; color: #94a3b8; font-style: italic;">Note: You can change this password at any time in settings or via the forgot password page.</p>
  </div>

  <p style="font-size: 14px; color: #475569;">To track your request in real-time, click the button below to log in directly:</p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="{{magicLink}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
      Track Service Now
    </a>
  </div>
</div>`,
  },
  magicLink: {
    subject: 'Access your {{appName}} Account',
    body: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h2 style="color: #2563eb; font-weight: 800; margin: 0;">{{appName}} Magic Link</h2>
  </div>
  <p style="font-size: 16px;">Hi {{fullName}},</p>
  <p style="font-size: 14px; color: #475569;">Click the button below to log in directly to your {{appName}} dashboard. This link is valid for 10 minutes and can only be used once.</p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="{{magicLink}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
      Sign In to Dashboard
    </a>
  </div>
  <p style="font-size: 12px; color: #94a3b8; text-align: center;">If you did not request this link, you can safely ignore this email.</p>
</div>`,
  },
  passwordReset: {
    subject: 'Reset your {{appName}} password',
    body: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h2 style="color: #2563eb; font-weight: 800; margin: 0;">{{appName}} Security</h2>
  </div>
  <p style="font-size: 16px;">Hi {{fullName}},</p>
  <p style="font-size: 14px; color: #475569;">We received a request to reset your {{appName}} password. Click the button below to choose a new password. This link is valid for 1 hour.</p>
  <div style="text-align: center; margin: 28px 0;">
    <a href="{{resetLink}}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
      Reset Password
    </a>
  </div>
  <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px;">If you did not request this, you can safely ignore this email.</p>
</div>`,
  },
  requestReceived: {
    subject: 'Your {{appName}} Request Received',
    body: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h2 style="color: #2563eb; font-weight: 800; margin: 0;">{{appName}} Dispatch</h2>
  </div>
  <p style="font-size: 16px;">Hi {{fullName}},</p>
  <p style="font-size: 14px; color: #475569;">We have received your new service request.</p>
  <p style="font-size: 14px; color: #475569;">Please sign in to track the status of your request and see real-time updates.</p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="{{loginLink}}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px;">
      Track Service Status
    </a>
  </div>
</div>`,
  }
};

export default function AdminEmailTemplates() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<keyof Templates>('loginOtp');
  const [templates, setTemplates] = useState<Templates>(DEFAULT_TEMPLATES);
  const [initialTemplates, setInitialTemplates] = useState<Templates>(DEFAULT_TEMPLATES);
  const [isSaving, setIsSaving] = useState(false);
  const [editorMode, setEditorMode] = useState<'editor' | 'preview'>('editor');

  const isDirty = JSON.stringify(templates) !== JSON.stringify(initialTemplates);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const snap = await getDoc(doc(db, 'system', 'emailTemplates'));
        if (snap.exists()) {
          const loaded = { ...DEFAULT_TEMPLATES, ...(snap.data() as Templates) };
          setTemplates(loaded);
          setInitialTemplates(loaded);
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
      setInitialTemplates(templates);
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

  const getPreviewHtml = () => {
    const body = templates[activeTab]?.body || '';
    const mockups: Record<string, string> = {
      appName: 'ResQRoad',
      otp: '123456',
      fullName: 'John Doe',
      email: 'johndoe@example.com',
      password: 'TempPass123!',
      loginLink: 'https://roadhelp.com/login',
      resetLink: 'https://roadhelp.com/reset-password',
      magicLink: 'https://roadhelp.com/magic-login?token=xyz',
    };
    
    let html = body;
    Object.entries(mockups).forEach(([key, val]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      html = html.replace(regex, val);
    });
    return html;
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
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 uppercase">Email Template Designer</h1>
            </div>
            <p className="text-slate-500 text-xs font-medium mt-1">
              Design and customize HTML email templates sent to users for OTPs and notifications.
            </p>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={isSaving || !isDirty} 
            className="bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl h-12 px-6 shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Saving...' : isDirty ? 'Save All Templates *' : 'No Changes'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4">Select Template</h3>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as keyof Templates)} orientation="vertical" className="w-full">
              <TabsList className="flex flex-col h-auto bg-transparent gap-2">
                <TabsTrigger value="loginOtp" className="w-full justify-start p-3 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:shadow-none rounded-xl border border-transparent data-[state=active]:border-purple-200 text-xs font-bold">
                  <FileEdit className="w-4 h-4 mr-3" /> Login OTP
                </TabsTrigger>
                <TabsTrigger value="signupOtp" className="w-full justify-start p-3 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:shadow-none rounded-xl border border-transparent data-[state=active]:border-purple-200 text-xs font-bold">
                  <FileEdit className="w-4 h-4 mr-3" /> Signup OTP
                </TabsTrigger>
                <TabsTrigger value="welcome" className="w-full justify-start p-3 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:shadow-none rounded-xl border border-transparent data-[state=active]:border-purple-200 text-xs font-bold">
                  <FileEdit className="w-4 h-4 mr-3" /> Welcome Email
                </TabsTrigger>
                <TabsTrigger value="welcomeGuest" className="w-full justify-start p-3 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:shadow-none rounded-xl border border-transparent data-[state=active]:border-purple-200 text-xs font-bold">
                  <FileEdit className="w-4 h-4 mr-3" /> Welcome Guest
                </TabsTrigger>
                <TabsTrigger value="magicLink" className="w-full justify-start p-3 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:shadow-none rounded-xl border border-transparent data-[state=active]:border-purple-200 text-xs font-bold">
                  <FileEdit className="w-4 h-4 mr-3" /> Magic Link
                </TabsTrigger>
                <TabsTrigger value="passwordReset" className="w-full justify-start p-3 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:shadow-none rounded-xl border border-transparent data-[state=active]:border-purple-200 text-xs font-bold">
                  <FileEdit className="w-4 h-4 mr-3" /> Password Reset
                </TabsTrigger>
                <TabsTrigger value="requestReceived" className="w-full justify-start p-3 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:shadow-none rounded-xl border border-transparent data-[state=active]:border-purple-200 text-xs font-bold">
                  <FileEdit className="w-4 h-4 mr-3" /> Request Received
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
                ) : activeTab === 'welcome' ? (
                  <>
                    <li><code className="bg-slate-200 px-1 py-0.5 rounded text-purple-700">{`{{fullName}}`}</code> - User Name</li>
                    <li><code className="bg-slate-200 px-1 py-0.5 rounded text-purple-700">{`{{loginLink}}`}</code> - Login Page URL</li>
                    <li><code className="bg-slate-200 px-1 py-0.5 rounded text-purple-700">{`{{resetLink}}`}</code> - Reset Password URL</li>
                  </>
                ) : activeTab === 'welcomeGuest' ? (
                  <>
                    <li><code className="bg-slate-200 px-1 py-0.5 rounded text-purple-700">{`{{fullName}}`}</code> - Guest Name</li>
                    <li><code className="bg-slate-200 px-1 py-0.5 rounded text-purple-700">{`{{email}}`}</code> - Login Email</li>
                    <li><code className="bg-slate-200 px-1 py-0.5 rounded text-purple-700">{`{{password}}`}</code> - Temporary Pass</li>
                    <li><code className="bg-slate-200 px-1 py-0.5 rounded text-purple-700">{`{{magicLink}}`}</code> - Tracking Link</li>
                  </>
                ) : activeTab === 'magicLink' ? (
                  <>
                    <li><code className="bg-slate-200 px-1 py-0.5 rounded text-purple-700">{`{{fullName}}`}</code> - User Name</li>
                    <li><code className="bg-slate-200 px-1 py-0.5 rounded text-purple-700">{`{{magicLink}}`}</code> - Auth Direct URL</li>
                  </>
                ) : activeTab === 'passwordReset' ? (
                  <>
                    <li><code className="bg-slate-200 px-1 py-0.5 rounded text-purple-700">{`{{fullName}}`}</code> - User Name</li>
                    <li><code className="bg-slate-200 px-1 py-0.5 rounded text-purple-700">{`{{resetLink}}`}</code> - Password Reset URL</li>
                  </>
                ) : activeTab === 'requestReceived' ? (
                  <>
                    <li><code className="bg-slate-200 px-1 py-0.5 rounded text-purple-700">{`{{fullName}}`}</code> - Customer Name</li>
                    <li><code className="bg-slate-200 px-1 py-0.5 rounded text-purple-700">{`{{loginLink}}`}</code> - Tracker URL</li>
                  </>
                ) : null}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="rounded-[2rem] border border-slate-200/80 bg-white shadow-sm shadow-slate-900/5 overflow-hidden flex flex-col h-full min-h-[620px]">
              
              {/* Subject Input */}
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
                <Label className="text-xs font-black text-slate-500 uppercase tracking-widest min-w-[80px]">Subject:</Label>
                <Input 
                  value={templates[activeTab]?.subject || ''} 
                  onChange={(e) => updateCurrentTemplate('subject', e.target.value)}
                  className="h-12 rounded-xl bg-white border-slate-200 font-bold"
                />
              </div>

              {/* Designer / Preview Tabs */}
              <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as 'editor' | 'preview')} className="flex-1 flex flex-col">
                <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Workspace View</span>
                  <TabsList className="bg-slate-100 p-1 rounded-xl h-10 border border-slate-200/50">
                    <TabsTrigger value="editor" className="rounded-lg px-4 text-xs font-bold flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-purple-700">
                      <Code className="w-3.5 h-3.5" /> HTML Editor
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="rounded-lg px-4 text-xs font-bold flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-purple-700">
                      <Eye className="w-3.5 h-3.5" /> Live Preview
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 flex flex-col p-6">
                  <TabsContent value="editor" className="flex-1 flex flex-col m-0 outline-none">
                    <Label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">HTML Body Content:</Label>
                    <Textarea 
                      value={templates[activeTab]?.body || ''} 
                      onChange={(e) => updateCurrentTemplate('body', e.target.value)}
                      className="flex-1 rounded-xl bg-slate-900 text-green-400 font-mono text-sm border-slate-800 p-6 min-h-[420px] leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      spellCheck={false}
                    />
                  </TabsContent>

                  <TabsContent value="preview" className="flex-1 flex flex-col m-0 outline-none">
                    <Label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Rendered Email Preview:</Label>
                    <div className="flex-1 rounded-xl border border-slate-200 overflow-hidden min-h-[420px] bg-slate-50 p-4">
                      <iframe
                        title="Template Live Preview"
                        srcDoc={getPreviewHtml()}
                        className="w-full h-full min-h-[380px] bg-white rounded-lg shadow-sm border border-slate-100"
                        sandbox="allow-scripts"
                      />
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

