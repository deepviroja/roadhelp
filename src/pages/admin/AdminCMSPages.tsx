import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Save, Sparkles, Globe, Lock, LifeBuoy, LayoutDashboard } from 'lucide-react';
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
import { ImageUpload } from '@/components/shared/ImageUpload';

export default function AdminCMSPages() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'hero' | 'seo' | 'footer' | 'auth' | 'gethelp' | 'dashboard'>('hero');
  const [isSaving, setIsSaving] = useState(false);

  const [cmsConfig, setCmsConfig] = useState({
    heroHeadline: 'Roadside help',
    heroSubheadline: 'without the stress.',
    heroDescription: 'Choose the issue, share your location, and get matched with a verified provider in a few simple steps.',
    heroCtaText: 'Get Help Now',
    heroBgImage: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=1200&auto=format&fit=crop',
    metaTitle: 'ResQRoad - 24/7 Roadside Assistance Marketplace',
    metaDescription: 'Fast, verified, transparent roadside assistance, towing, battery jump start, and tire repair services near you.',
    supportPhone: '+91 1800 123 4567',
    supportEmail: 'help@resqroad.com',
  });

  const [pageConfig, setPageConfig] = useState({
    authCustomerLoginText: 'Welcome back, Customer!',
    authProviderLoginText: 'Welcome back, Provider!',
    authSignupText: 'Join the RoadHelp community today.',
    getHelpHeadline: 'Get Help Instantly',
    getHelpDescription: 'We are here to assist you.',
    dashboardCustomerWelcome: 'Hello, track your requests here.',
    dashboardProviderWelcome: 'Hello, manage your jobs here.',
  });

  useEffect(() => {
    const loadCMS = async () => {
      const snap = await getDoc(doc(db, 'system', 'config'));
      if (snap.exists()) {
        setCmsConfig((prev) => ({ ...prev, ...snap.data() }));
      }
      
      const pagesSnap = await getDoc(doc(db, 'system', 'pages'));
      if (pagesSnap.exists()) {
        setPageConfig((prev) => ({ ...prev, ...pagesSnap.data() }));
      }
    };
    loadCMS();
  }, []);

  const handleSaveCMS = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'system', 'config'), cmsConfig, { merge: true });
      await setDoc(doc(db, 'system', 'pages'), pageConfig, { merge: true });
      await logAdminAction({
        adminEmail: profile?.email || 'admin@roadhelp.com',
        action: 'UPDATE_CMS_CONFIG',
        module: 'Page CMS',
        details: 'Saved global page CMS and SEO configuration settings',
      });
      toast.success('Website CMS settings saved successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save CMS settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8 pb-16">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-blue-600/10 text-blue-600">
                <FileText className="w-6 h-6" />
              </span>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Website Page & Homepage CMS</h1>
            </div>
            <p className="text-slate-500 text-xs font-medium mt-1">
              Manage website headings, CTA text, background images, and SEO settings without developer code edits.
            </p>
          </div>

          <Button onClick={handleSaveCMS} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl h-12 px-6 shadow-lg shadow-blue-600/20">
            <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>

        {/* CMS Tabs */}
        <div className="flex flex-wrap gap-3 border-b border-slate-200 pb-4">
          <button onClick={() => setActiveTab('hero')} className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'hero' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
            <Sparkles className="w-4 h-4 inline mr-2" /> Hero Banner
          </button>
          <button onClick={() => setActiveTab('seo')} className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'seo' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
            <Globe className="w-4 h-4 inline mr-2" /> SEO Meta Tags
          </button>
          <button onClick={() => setActiveTab('footer')} className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'footer' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
            Footer & Contact Info
          </button>
          <button onClick={() => setActiveTab('auth')} className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'auth' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
            <Lock className="w-4 h-4 inline mr-2" /> Auth Pages
          </button>
          <button onClick={() => setActiveTab('gethelp')} className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'gethelp' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
            <LifeBuoy className="w-4 h-4 inline mr-2" /> Get Help
          </button>
          <button onClick={() => setActiveTab('dashboard')} className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
            <LayoutDashboard className="w-4 h-4 inline mr-2" /> Dashboards
          </button>
        </div>

        {/* Tab 1: Hero Banner */}
        {activeTab === 'hero' && (
          <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-xl p-8 space-y-6">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Homepage Hero Configuration</h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hero Main Headline</Label>
                <Input value={cmsConfig.heroHeadline} onChange={(e) => setCmsConfig({ ...cmsConfig, heroHeadline: e.target.value })} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hero Highlight Subheadline</Label>
                <Input value={cmsConfig.heroSubheadline} onChange={(e) => setCmsConfig({ ...cmsConfig, heroSubheadline: e.target.value })} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold text-blue-600" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hero Description</Label>
                <Textarea value={cmsConfig.heroDescription} onChange={(e) => setCmsConfig({ ...cmsConfig, heroDescription: e.target.value })} className="rounded-2xl bg-slate-50 border-slate-200 font-semibold min-h-[90px]" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hero Background Image</Label>
                <ImageUpload
                  currentImage={cmsConfig.heroBgImage}
                  onUploadComplete={(url) => setCmsConfig({ ...cmsConfig, heroBgImage: url })}
                  onRemove={() => setCmsConfig({ ...cmsConfig, heroBgImage: '' })}
                  folder="cms"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: SEO */}
        {activeTab === 'seo' && (
          <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-xl p-8 space-y-6">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Global Search Engine Optimization (SEO)</h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Global Meta Title</Label>
                <Input value={cmsConfig.metaTitle} onChange={(e) => setCmsConfig({ ...cmsConfig, metaTitle: e.target.value })} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Meta Description</Label>
                <Textarea value={cmsConfig.metaDescription} onChange={(e) => setCmsConfig({ ...cmsConfig, metaDescription: e.target.value })} className="rounded-2xl bg-slate-50 border-slate-200 font-semibold min-h-[100px]" />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Footer */}
        {activeTab === 'footer' && (
          <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-xl p-8 space-y-6">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Footer & Contact Settings</h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Support Phone Number</Label>
                <Input value={cmsConfig.supportPhone} onChange={(e) => setCmsConfig({ ...cmsConfig, supportPhone: e.target.value })} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Support Email Address</Label>
                <Input type="email" value={cmsConfig.supportEmail} onChange={(e) => setCmsConfig({ ...cmsConfig, supportEmail: e.target.value })} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold" />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Auth Pages */}
        {activeTab === 'auth' && (
          <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-xl p-8 space-y-6">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Authentication Pages Configuration</h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Customer Login Greeting</Label>
                <Input value={pageConfig.authCustomerLoginText} onChange={(e) => setPageConfig({ ...pageConfig, authCustomerLoginText: e.target.value })} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Provider Login Greeting</Label>
                <Input value={pageConfig.authProviderLoginText} onChange={(e) => setPageConfig({ ...pageConfig, authProviderLoginText: e.target.value })} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Signup Text</Label>
                <Input value={pageConfig.authSignupText} onChange={(e) => setPageConfig({ ...pageConfig, authSignupText: e.target.value })} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold" />
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Get Help */}
        {activeTab === 'gethelp' && (
          <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-xl p-8 space-y-6">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Get Help Page Configuration</h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Get Help Headline</Label>
                <Input value={pageConfig.getHelpHeadline} onChange={(e) => setPageConfig({ ...pageConfig, getHelpHeadline: e.target.value })} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Get Help Description</Label>
                <Textarea value={pageConfig.getHelpDescription} onChange={(e) => setPageConfig({ ...pageConfig, getHelpDescription: e.target.value })} className="rounded-2xl bg-slate-50 border-slate-200 font-semibold min-h-[90px]" />
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Dashboards */}
        {activeTab === 'dashboard' && (
          <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-xl p-8 space-y-6">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Dashboards Configuration</h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Customer Dashboard Welcome</Label>
                <Input value={pageConfig.dashboardCustomerWelcome} onChange={(e) => setPageConfig({ ...pageConfig, dashboardCustomerWelcome: e.target.value })} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Provider Dashboard Welcome</Label>
                <Input value={pageConfig.dashboardProviderWelcome} onChange={(e) => setPageConfig({ ...pageConfig, dashboardProviderWelcome: e.target.value })} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-semibold" />
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

