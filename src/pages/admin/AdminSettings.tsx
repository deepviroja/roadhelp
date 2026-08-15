import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Plus,
  Save,
  Users,
  Key,
  Star,
  Trash2,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  List,
  RotateCcw,
  XCircle,
  Image as ImageIcon,
} from "lucide-react";
import { ImageUrlInput } from "@/components/shared/ImageUrlInput";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/config/firebase";
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  getDoc,
  orderBy,
  limit,
} from "firebase/firestore";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { ServiceRequest } from "@/types";
import { Textarea } from "@/components/ui/textarea";
import { formatSafe } from "@/lib/date-utils";

// Use environment variables for secondary app config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

let secondaryAuth: any = null;
try {
  const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
  secondaryAuth = getAuth(secondaryApp);
} catch {
  // Ignore
}

interface Slide {
  id: string;
  title: string;
  image: string;
  order: number;
}

interface Step {
  id: string;
  idx: string;
  title: string;
  desc: string;
  order: number;
}

interface FeaturedReview {
  id: string;
  requestId?: string;
  name: string;
  rating: number;
  text: string;
  date: string;
  serviceName?: string;
}

export default function AdminSettings() {
  const [isAdminCreating, setIsAdminCreating] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [recentReviews, setRecentReviews] = useState<ServiceRequest[]>([]);
  const [showManualReviewForm, setShowManualReviewForm] = useState(false);
  const [manualReview, setManualReview] = useState({
    name: '',
    rating: 5,
    text: '',
    serviceName: '',
  });

  const handleAddManualReview = () => {
    if (!manualReview.name.trim() || !manualReview.text.trim()) {
      toast.error('Please enter name and review content.');
      return;
    }
    const newReview = {
      id: crypto.randomUUID(),
      name: manualReview.name,
      rating: manualReview.rating,
      text: manualReview.text,
      serviceName: manualReview.serviceName || 'Roadside Assistance',
      date: new Date().toLocaleDateString(),
    };
    setPlatformConfig({
      ...platformConfig,
      featuredReviews: [...platformConfig.featuredReviews, newReview].slice(0, 5),
    });
    setShowManualReviewForm(false);
    setManualReview({ name: '', rating: 5, text: '', serviceName: '' });
    toast.success('Manual review featured successfully!');
  };

  const { register, handleSubmit, reset } = useForm();

  // Platform settings state
  const [platformConfig, setPlatformConfig] = useState({
    appName: "RoadHelp",
    supportPhone: "+91 1800 123 4567",
    supportEmail: "help@roadhelp.com",
    logoUrl: "",
    smtpFromEmail: "noreply@roadhelp.com",
    smtpFromName: "RoadHelp Team",
    acceptingNewProviders: true,
    maintenanceMode: false,
    disableOtp: false,
    baseCommissionRate: 15,
    payoutDelayDays: 7,
    currency: "INR",
    currencySymbol: "₹",
    trackingInterval: 5,
    requestVisibilityHours: 24,
    heroHeadline: "Roadside help",
    heroSubheadline: "without the stress.",
    heroSlides: [] as Slide[],
    featuredReviews: [] as FeaturedReview[],
    steps: [] as Step[],
    sosConfig: {
      policeNumber: "100",
      ambulanceNumber: "108",
      helplineNumber: "1073",
      teamContactNumber: "1090",
      teamCount: 3,
    },
  });

  const [backupConfig, setBackupConfig] = useState<any>(null);

  const loadAdmins = async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "admin"));
      const snap = await getDocs(q);
      setAdmins(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error(error);
    }
  };

  const loadRecentReviews = async () => {
    try {
      const q = query(
        collection(db, "serviceRequests"),
        where("rating", ">", 0),
        orderBy("rating", "desc"),
        limit(20),
      );
      const snap = await getDocs(q);
      setRecentReviews(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ServiceRequest),
      );
    } catch (error) {
      console.error(error);
    }
  };

  const loadConfig = async () => {
    try {
      const docSnap = await getDoc(doc(db, "system", "config"));
      if (docSnap.exists()) {
        const data = docSnap.data();
        const config = {
          appName: data.appName || "RoadHelp",
          supportPhone: data.supportPhone || "+91 1800 123 4567",
          supportEmail: data.supportEmail || "help@roadhelp.com",
          logoUrl: data.logoUrl || "",
          smtpFromEmail: data.smtpFromEmail || "noreply@roadhelp.com",
          smtpFromName: data.smtpFromName || "RoadHelp Team",
          acceptingNewProviders: data.acceptingNewProviders !== false,
          maintenanceMode: data.maintenanceMode || false,
          disableOtp: data.disableOtp || false,
          baseCommissionRate: data.baseCommissionRate || 15,
          payoutDelayDays: data.payoutDelayDays || 7,
          currency: data.currency || "INR",
          currencySymbol: data.currencySymbol || "₹",
          trackingInterval: data.trackingInterval || 5,
          requestVisibilityHours: Number(data.requestVisibilityHours || 24),
          heroHeadline: data.heroHeadline || "Roadside help",
          heroSubheadline: data.heroSubheadline || "without the stress.",
          heroSlides: data.heroSlides || [],
          featuredReviews: data.featuredReviews || [],
          steps: data.steps || [],
          sosConfig: data.sosConfig || {
            policeNumber: "100",
            ambulanceNumber: "108",
            helplineNumber: "1073",
            teamContactNumber: "1090",
            teamCount: 3,
          },
        };
        setPlatformConfig(config);
        setBackupConfig(config);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadAdmins();
    loadRecentReviews();
    loadConfig();
  }, []);

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      await setDoc(doc(db, "system", "config"), platformConfig, {
        merge: true,
      });
      setBackupConfig(platformConfig);
      toast.success("Platform configuration updated successfully!");
    } catch {
      toast.error("Failed to update config");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleDiscardChanges = () => {
    if (backupConfig) {
      setPlatformConfig(backupConfig);
      toast.info("Unsaved changes discarded");
    }
  };

  const hasChanges =
    JSON.stringify(platformConfig) !== JSON.stringify(backupConfig);

  // Slides logic
  const addSlide = () => {
    const newSlide: Slide = {
      id: Math.random().toString(36).substr(2, 9),
      title: "Emergency Response | AnytimeAnywhere",
      image:
        "https://images.unsplash.com/photo-1562141989-c5c79ac8f576?auto=format&fit=crop&q=80",
      order: platformConfig.heroSlides.length,
    };
    setPlatformConfig({
      ...platformConfig,
      heroSlides: [...platformConfig.heroSlides, newSlide],
    });
  };

  const updateSlide = (id: string, updates: Partial<Slide>) => {
    const newSlides = platformConfig.heroSlides.map((s) =>
      s.id === id ? { ...s, ...updates } : s,
    );
    setPlatformConfig({ ...platformConfig, heroSlides: newSlides });
  };

  const moveSlide = (id: string, direction: "up" | "down") => {
    const slides = [...platformConfig.heroSlides];
    const index = slides.findIndex((s) => s.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === slides.length - 1)
    )
      return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    [slides[index], slides[newIndex]] = [slides[newIndex], slides[index]];
    setPlatformConfig({ ...platformConfig, heroSlides: slides });
  };

  const removeSlide = (id: string) => {
    setPlatformConfig({
      ...platformConfig,
      heroSlides: platformConfig.heroSlides.filter((s) => s.id !== id),
    });
  };

  // Steps logic
  const addStep = () => {
    const newStep: Step = {
      id: Math.random().toString(36).substr(2, 9),
      idx: `0${platformConfig.steps.length + 1}`,
      title: "Request Help",
      desc: "Select your problem and share your location.",
      order: platformConfig.steps.length,
    };
    setPlatformConfig({
      ...platformConfig,
      steps: [...platformConfig.steps, newStep],
    });
  };

  const updateStep = (id: string, updates: Partial<Step>) => {
    const newSteps = platformConfig.steps.map((s) =>
      s.id === id ? { ...s, ...updates } : s,
    );
    setPlatformConfig({ ...platformConfig, steps: newSteps });
  };

  const moveStep = (id: string, direction: "up" | "down") => {
    const steps = [...platformConfig.steps];
    const index = steps.findIndex((s) => s.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === steps.length - 1)
    )
      return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    [steps[index], steps[newIndex]] = [steps[newIndex], steps[index]];
    setPlatformConfig({ ...platformConfig, steps: steps });
  };

  const removeStep = (id: string) => {
    setPlatformConfig({
      ...platformConfig,
      steps: platformConfig.steps.filter((s) => s.id !== id),
    });
  };

  const toggleFeaturedReview = (req: ServiceRequest) => {
    const exists = platformConfig.featuredReviews.find(
      (r) => r.requestId === req.id,
    );
    if (exists) {
      setPlatformConfig({
        ...platformConfig,
        featuredReviews: platformConfig.featuredReviews.filter(
          (r) => r.requestId !== req.id,
        ),
      });
    } else {
      const newReview: FeaturedReview = {
        id: Math.random().toString(36).substr(2, 9),
        requestId: req.id,
        name: req.customerName,
        rating: req.rating || 5,
        text: req.review || "Great service!",
        date: new Date().toLocaleDateString(),
      };
      setPlatformConfig({
        ...platformConfig,
        featuredReviews: [...platformConfig.featuredReviews, newReview].slice(
          0,
          5,
        ), // Max 5
      });
    }
  };

  const onAddAdmin = async (data: any) => {
    if (!data.email || !data.password || !data.fullName) {
      toast.error("Please fill all fields");
      return;
    }
    setIsAdminCreating(true);
    try {
      if (!secondaryAuth) throw new Error("Secondary auth not initialized");
      const credential = await createUserWithEmailAndPassword(
        secondaryAuth,
        data.email,
        data.password,
      );
      await setDoc(doc(db, "users", credential.user.uid), {
        uid: credential.user.uid,
        email: data.email,
        fullName: data.fullName,
        role: "admin",
        createdAt: serverTimestamp(),
      });
      await signOut(secondaryAuth);
      toast.success("New Administrator added successfully!");
      reset();
      loadAdmins();
    } catch (error: any) {
      toast.error(error.message || "Failed to add admin");
    } finally {
      setIsAdminCreating(false);
    }
  };

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto space-y-8 pb-16"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Platform Settings & CMS
            </h1>
            <p className="text-slate-500 font-medium text-xs mt-1">
              Manage website settings, emergency hotlines, commission rates, and homepage content.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <Button
                variant="ghost"
                onClick={handleDiscardChanges}
                className="text-slate-500 hover:text-red-600 font-black text-xs uppercase tracking-widest gap-2 h-12 px-6"
              >
                <RotateCcw className="w-4 h-4" /> Discard Changes
              </Button>
            )}
            <Button
              onClick={handleSaveConfig}
              disabled={isSavingConfig || !hasChanges}
              className={`h-12 px-8 rounded-2xl font-black text-xs uppercase tracking-widest gap-2 shadow-lg transition-all ${
                hasChanges
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
                  : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none"
              }`}
            >
              <Save className="w-4 h-4" />
              {isSavingConfig ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-8">
          <TabsList className="bg-white border border-slate-200/80 p-1.5 h-14 rounded-2xl inline-flex items-center shadow-sm">
            <TabsTrigger
              value="general"
              className="rounded-xl h-11 px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-black uppercase text-xs tracking-wider transition-all"
            >
              General Settings
            </TabsTrigger>
            <TabsTrigger
              value="landing"
              className="rounded-xl h-11 px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-black uppercase text-xs tracking-wider transition-all"
            >
              Homepage Content
            </TabsTrigger>
            <TabsTrigger
              value="payouts"
              className="rounded-xl h-11 px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-black uppercase text-xs tracking-wider transition-all"
            >
              Commission & Payouts
            </TabsTrigger>
            <TabsTrigger
              value="request-visibility"
              className="rounded-xl h-11 px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-black uppercase text-xs tracking-wider transition-all"
            >
              Request Visibility
            </TabsTrigger>
          </TabsList>


          <TabsContent value="general" className="space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                    <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Platform Brand Identity
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="ml-1 text-[9px] font-black uppercase tracking-widest text-slate-400">App Name</Label>
                        <Input
                          value={platformConfig.appName}
                          onChange={(e) =>
                            setPlatformConfig({
                              ...platformConfig,
                              appName: e.target.value,
                            })
                          }
                          className="h-14 font-black rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="ml-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Support Phone</Label>
                        <Input
                          value={(platformConfig as any).supportPhone || ''}
                          onChange={(e) =>
                            setPlatformConfig({
                              ...platformConfig,
                              supportPhone: e.target.value,
                            } as any)
                          }
                          placeholder="+91 1800 123 4567"
                          className="h-14 font-black rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="ml-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Support Email</Label>
                        <Input
                          value={(platformConfig as any).supportEmail || ''}
                          onChange={(e) =>
                            setPlatformConfig({
                              ...platformConfig,
                              supportEmail: e.target.value,
                            } as any)
                          }
                          placeholder="help@roadhelp.com"
                          className="h-14 font-black rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="ml-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Landing hero headline</Label>
                      <Input
                        value={platformConfig.heroHeadline || ''}
                        onChange={(e) => setPlatformConfig({ ...platformConfig, heroHeadline: e.target.value })}
                        className="font-black rounded-2xl h-14 bg-slate-50 border-slate-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="ml-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Landing hero subheadline</Label>
                      <Input
                        value={platformConfig.heroSubheadline || ''}
                        onChange={(e) => setPlatformConfig({ ...platformConfig, heroSubheadline: e.target.value })}
                        className="font-black rounded-2xl h-14 bg-slate-50 border-slate-100"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="ml-1 text-[9px] font-black uppercase tracking-widest text-slate-400">SMTP Sender Email</Label>
                      <Input
                        value={platformConfig.smtpFromEmail || ''}
                        onChange={(e) => setPlatformConfig({ ...platformConfig, smtpFromEmail: e.target.value })}
                        className="font-black rounded-2xl h-14 bg-slate-50 border-slate-100"
                        placeholder="noreply@roadhelp.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="ml-1 text-[9px] font-black uppercase tracking-widest text-slate-400">SMTP Sender Name</Label>
                      <Input
                        value={platformConfig.smtpFromName || ''}
                        onChange={(e) => setPlatformConfig({ ...platformConfig, smtpFromName: e.target.value })}
                        className="font-black rounded-2xl h-14 bg-slate-50 border-slate-100"
                        placeholder="RoadHelp Team"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 ml-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Real-time Telemetry Sync (Seconds)
                      </Label>
                      <span 
                        title="Interval in seconds for the provider's GPS tracker to send coordinates to the database. Lower values provide more precise tracking but increase read/write operations."
                        className="cursor-help text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold"
                      >
                        i
                      </span>
                    </div>
                    <Input
                      type="number"
                      value={platformConfig.trackingInterval === undefined ? '' : platformConfig.trackingInterval}
                      onChange={(e) =>
                        setPlatformConfig({
                          ...platformConfig,
                          // @ts-expect-error - allow empty string
                          trackingInterval: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      className="h-14 text-xl font-black rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Platform Web Logo
                    </Label>
                    <ImageUrlInput
                      currentImage={platformConfig.logoUrl}
                      onImageChange={(url) => setPlatformConfig({ ...platformConfig, logoUrl: url })}
                      onRemove={() => setPlatformConfig({ ...platformConfig, logoUrl: '' })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-blue-50/30 rounded-[2.5rem] border border-blue-50">
                <div className="flex items-center justify-between p-4 bg-white rounded-3xl border border-blue-100/50 shadow-sm">
                  <div>
                    <Label className="text-sm font-black text-slate-900 leading-none">
                      Provider Onboarding
                    </Label>
                    <p className="text-[9px] text-blue-600 font-bold uppercase tracking-tight mt-1">
                      Accept dynamic registrations
                    </p>
                  </div>
                  <Switch
                    checked={platformConfig.acceptingNewProviders}
                    onCheckedChange={(c) =>
                      setPlatformConfig({
                        ...platformConfig,
                        acceptingNewProviders: c,
                      })
                    }
                    className="data-[state=checked]:bg-green-500 scale-125"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-3xl border border-amber-100/50 shadow-sm">
                  <div>
                    <Label className="text-sm font-black text-slate-900 leading-none">
                      Website under maintenance{" "}
                    </Label>
                    <p className="text-[9px] text-amber-600 font-bold uppercase tracking-tight mt-1">
                      Suspend platform operations
                    </p>
                  </div>
                  <Switch
                    checked={platformConfig.maintenanceMode}
                    onCheckedChange={(c) =>
                      setPlatformConfig({
                        ...platformConfig,
                        maintenanceMode: c,
                      })
                    }
                    className="data-[state=checked]:bg-amber-500 scale-125"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-3xl border border-purple-100/50 shadow-sm">
                  <div>
                    <Label className="text-sm font-black text-slate-900 leading-none">
                      Disable Email OTP Verification
                    </Label>
                    <p className="text-[9px] text-purple-600 font-bold uppercase tracking-tight mt-1">
                      Allow direct login / signup without OTP email
                    </p>
                  </div>
                  <Switch
                    checked={(platformConfig as any).disableOtp || false}
                    onCheckedChange={(c) =>
                      setPlatformConfig({
                        ...platformConfig,
                        disableOtp: c,
                      } as any)
                    }
                    className="data-[state=checked]:bg-purple-500 scale-125"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="landing" className="space-y-10">
            {/* HERO SLIDER */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10">
              <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-50">
                <div>
                  <h2 className="text-2xl font-black flex items-center gap-3">
                    <ImageIcon className="w-6 h-6 text-blue-600" /> Homepage Slideshow Banner
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Manage slideshow images and text on the main landing page
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={addSlide}
                    variant="outline"
                    className="h-12 px-6 gap-2 rounded-2xl border-blue-100 text-blue-600 hover:bg-blue-50 font-black uppercase text-[10px] tracking-widest transition-all"
                  >
                    <Plus className="w-4 h-4" /> Append Layer
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {platformConfig.heroSlides.map((slide, index) => (
                  <motion.div
                    layout
                    key={slide.id}
                    className="p-8 rounded-[3rem] border-2 border-slate-100 bg-white hover:border-blue-200 transition-all space-y-6 relative group"
                  >
                    <div className="relative rounded-[2rem] overflow-hidden aspect-[21/9] bg-slate-100 border-4 border-white shadow-xl">
                      <ImageUrlInput
                        currentImage={slide.image}
                        onImageChange={(url) => {
                          const newSlides = [...platformConfig.heroSlides];
                          newSlides[index].image = url;
                          setPlatformConfig({ ...platformConfig, heroSlides: newSlides });
                        }}
                        onRemove={() => {
                          const newSlides = [...platformConfig.heroSlides];
                          newSlides[index].image = "";
                          setPlatformConfig({ ...platformConfig, heroSlides: newSlides });
                        }}
                      />
                      <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all z-10">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="w-10 h-10 rounded-2xl bg-white shadow-lg pointer-events-auto"
                          onClick={() => moveSlide(slide.id, "up")}
                        >
                          <ArrowUp className="w-5 h-5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="w-10 h-10 rounded-2xl bg-white shadow-lg pointer-events-auto"
                          onClick={() => moveSlide(slide.id, "down")}
                        >
                          <ArrowDown className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-4 items-end">
                      <div className="flex-1 space-y-2">
                        <Label className="ml-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                          Headline Text (Use | for accents)
                        </Label>
                        <Input
                          value={slide.title}
                          onChange={(e) =>
                            updateSlide(slide.id, { title: e.target.value })
                          }
                          className="font-black rounded-2xl h-14 bg-slate-50 border-slate-100 text-lg"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => removeSlide(slide.id)}
                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl w-14 h-14 transition-colors p-0 border border-slate-50"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* SOS PROTOCOL CONFIGURATION */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-50">
                <div>
                  <h2 className="text-2xl font-black flex items-center gap-3">
                    <Shield className="w-6 h-6 text-red-600" /> SOS Protocol Configuration
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Manage emergency numbers for the global SOS button
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="space-y-2">
                    <Label className="ml-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Police Hotline</Label>
                    <Input 
                      value={platformConfig.sosConfig?.policeNumber || "100"} 
                      onChange={(e) => setPlatformConfig({
                         ...platformConfig,
                         sosConfig: { ...platformConfig.sosConfig, policeNumber: e.target.value } as any
                      })}
                      className="font-black rounded-2xl h-14 bg-slate-50 border-slate-100" 
                    />
                 </div>
                 <div className="space-y-2">
                    <Label className="ml-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Ambulance Hotline</Label>
                    <Input 
                      value={platformConfig.sosConfig?.ambulanceNumber || "108"} 
                      onChange={(e) => setPlatformConfig({
                         ...platformConfig,
                         sosConfig: { ...platformConfig.sosConfig, ambulanceNumber: e.target.value } as any
                      })}
                      className="font-black rounded-2xl h-14 bg-slate-50 border-slate-100" 
                    />
                 </div>
                 <div className="space-y-2">
                    <Label className="ml-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Support Hotline</Label>
                    <Input 
                      value={platformConfig.sosConfig?.helplineNumber || "1073"} 
                      onChange={(e) => setPlatformConfig({
                         ...platformConfig,
                         sosConfig: { ...platformConfig.sosConfig, helplineNumber: e.target.value } as any
                      })}
                      className="font-black rounded-2xl h-14 bg-slate-50 border-slate-100" 
                    />
                 </div>
                 <div className="space-y-2">
                    <Label className="ml-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Response Team Contact</Label>
                    <Input 
                      value={platformConfig.sosConfig?.teamContactNumber || "1090"} 
                      onChange={(e) => setPlatformConfig({
                         ...platformConfig,
                         sosConfig: { ...platformConfig.sosConfig, teamContactNumber: e.target.value } as any
                      })}
                      className="font-black rounded-2xl h-14 bg-slate-50 border-slate-100" 
                    />
                 </div>
                 <div className="space-y-2">
                    <Label className="ml-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Response team size</Label>
                    <Input
                      type="number"
                      min="1"
                      value={platformConfig.sosConfig?.teamCount || 3}
                      onChange={(e) => setPlatformConfig({
                        ...platformConfig,
                        sosConfig: { ...platformConfig.sosConfig, teamCount: Number(e.target.value) || 0 } as any
                      })}
                      className="font-black rounded-2xl h-14 bg-slate-50 border-slate-100"
                    />
                 </div>
              </div>
            </div>

            {/* HOW IT WORKS STEPS */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10">
              <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-50">
                <div>
                  <h2 className="text-2xl font-black flex items-center gap-3">
                    <List className="w-6 h-6 text-indigo-600" /> How It Works Steps
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Define the customer journey in order
                  </p>
                </div>
                <Button
                  onClick={addStep}
                  variant="outline"
                  className="h-12 px-6 gap-2 rounded-2xl border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-black uppercase text-[10px] tracking-widest transition-all"
                >
                  <Plus className="w-4 h-4" /> Append Sequence
                </Button>
              </div>

              <div className="space-y-6">
                {platformConfig.steps.map((step, _idx) => (
                  <motion.div
                    layout
                    key={step.id}
                    className="p-10 rounded-[3rem] border-2 border-slate-50 bg-slate-50/30 flex flex-col md:flex-row gap-10 relative group hover:bg-white hover:border-indigo-100 transition-all shadow-hover"
                  >
                    <div className="flex items-center gap-6 md:flex-col md:justify-center md:w-24">
                      <span className="text-[2.25rem] sm:text-5xl font-black text-slate-200 group-hover:text-indigo-100 transition-colors leading-none">
                        {step.idx}
                      </span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-10 h-10 rounded-2xl bg-white border border-slate-100 shadow-sm"
                          onClick={() => moveStep(step.id, "up")}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-10 h-10 rounded-2xl bg-white border border-slate-100 shadow-sm"
                          onClick={() => moveStep(step.id, "down")}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label className="ml-1 text-[9px] font-black uppercase text-slate-400">
                            Order Ref (01, 02...)
                          </Label>
                          <Input
                            value={step.idx}
                            onChange={(e) =>
                              updateStep(step.id, { idx: e.target.value })
                            }
                            className="h-12 rounded-2xl bg-white border-slate-100 font-bold"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label className="ml-1 text-[9px] font-black uppercase text-slate-400">
                            Headline
                          </Label>
                          <Input
                            value={step.title}
                            onChange={(e) =>
                              updateStep(step.id, { title: e.target.value })
                            }
                            className="h-12 rounded-2xl bg-white border-slate-100 font-black"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="ml-1 text-[9px] font-black uppercase text-slate-400">
                          Detailed Instruction
                        </Label>
                        <Textarea
                          value={step.desc}
                          onChange={(e) =>
                            updateStep(step.id, { desc: e.target.value })
                          }
                          className="rounded-2xl bg-white border-slate-100 resize-none h-24 p-6 font-bold"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => removeStep(step.id)}
                      className="absolute top-8 right-8 text-slate-200 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-6 h-6" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* REVIEWS */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10">
              <div className="mb-12 border-b border-slate-50 pb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black flex items-center gap-3">
                    <Star className="w-6 h-6 text-amber-500" /> Curated
                    Customer Reviews
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Select customer feedback to display on the home page
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setShowManualReviewForm(!showManualReviewForm)}
                    variant="outline"
                    className="h-10 px-4 gap-2 rounded-xl border-blue-100 text-blue-600 hover:bg-blue-50 font-black uppercase text-[10px] tracking-widest transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Manual Review
                  </Button>
                  <div className="px-5 py-2 bg-amber-50 rounded-full border border-amber-100 text-[10px] font-black text-amber-600 uppercase tracking-widest">
                    {platformConfig.featuredReviews.length} / 5 Slots Active
                  </div>
                </div>
              </div>

              {showManualReviewForm && (
                <div className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8 mb-8 space-y-4 max-w-2xl">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Add Manual Review</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Customer Name</Label>
                      <Input
                        value={manualReview.name}
                        onChange={(e) => setManualReview({ ...manualReview, name: e.target.value })}
                        placeholder="e.g. John Doe"
                        className="bg-white border-slate-200 rounded-xl font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Service/Vehicle (Optional)</Label>
                      <Input
                        value={manualReview.serviceName}
                        onChange={(e) => setManualReview({ ...manualReview, serviceName: e.target.value })}
                        placeholder="e.g. Flat Tire / Towing"
                        className="bg-white border-slate-200 rounded-xl font-bold"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Rating (1 to 5)</Label>
                      <select
                        value={manualReview.rating}
                        onChange={(e) => setManualReview({ ...manualReview, rating: Number(e.target.value) })}
                        className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-semibold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="5">5 Stars</option>
                        <option value="4">4 Stars</option>
                        <option value="3">3 Stars</option>
                        <option value="2">2 Stars</option>
                        <option value="1">1 Star</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Review Content</Label>
                    <Textarea
                      value={manualReview.text}
                      onChange={(e) => setManualReview({ ...manualReview, text: e.target.value })}
                      placeholder="e.g. Incredible service! The provider arrived in 10 minutes and solved my problem cleanly."
                      rows={3}
                      className="bg-white border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <Button variant="ghost" onClick={() => setShowManualReviewForm(false)} className="rounded-xl">Cancel</Button>
                    <Button onClick={handleAddManualReview} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold px-6">
                      Add Review
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                <div className="space-y-6">
                  <Label className="ml-1 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Active Social Proof
                  </Label>
                  <div className="space-y-4">
                    {platformConfig.featuredReviews.map((review) => (
                      <motion.div
                        layout
                        key={review.id}
                        className="p-8 bg-amber-50/50 border border-amber-100 rounded-[2.5rem] flex items-start gap-6 relative group overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-[3rem] pointer-events-none" />
                        <div className="flex-1 relative z-10">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-black text-[#1A1A2E]">
                              {review.name}
                            </p>
                            <div className="flex gap-0.5">
                              {[...Array(review.rating)].map((_, i) => (
                                <Star
                                  key={i}
                                  className="w-3 h-3 fill-amber-500 text-amber-500"
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 italic font-medium leading-[1.6]">
                            "{review.text}"
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setPlatformConfig({
                              ...platformConfig,
                              featuredReviews:
                                platformConfig.featuredReviews.filter(
                                  (r) => r.id !== review.id,
                                ),
                            })
                          }
                          className="h-10 w-10 p-0 text-amber-600 hover:bg-amber-200/50 rounded-full flex-shrink-0 relative z-20"
                        >
                          <XCircle className="w-5 h-5" />
                        </Button>
                      </motion.div>
                    ))}
                    {platformConfig.featuredReviews.length === 0 && (
                      <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50">
                        <Star className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                          No featured items selected
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <Label className="ml-1 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Incoming Feedback Stream
                  </Label>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-hide pr-6 scrollbar-hide">
                    {recentReviews.map((req) => (
                      <div
                        key={req.id}
                        className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:border-blue-500/30 transition-all group relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="font-black text-slate-900">
                              {req.customerName}
                            </p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                               {formatSafe(req.completedAt)}
                             </p>

                          </div>
                          <div className="flex items-center gap-0.5">
                            {[...Array(req.rating || 5)].map((_, i) => (
                              <Star
                                key={i}
                                className="w-3 h-3 fill-amber-400 text-amber-400"
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed italic">
                          "{req.review || "Exceptional service provided"}"
                        </p>
                        <Button
                          size="sm"
                          variant={
                            platformConfig.featuredReviews.find(
                              (r) => r.requestId === req.id,
                            )
                              ? "secondary"
                              : "outline"
                          }
                          onClick={() => toggleFeaturedReview(req)}
                          className={`w-full h-12 rounded-[1.25rem] font-black uppercase text-[9px] tracking-[0.2em] transition-all ${
                            platformConfig.featuredReviews.find(
                              (r) => r.requestId === req.id,
                            )
                              ? "bg-blue-600 text-white hover:bg-red-500 hover:text-white"
                              : "border-slate-100 hover:bg-slate-900 hover:text-white"
                          }`}
                        >
                          {platformConfig.featuredReviews.find(
                            (r) => r.requestId === req.id,
                          )
                            ? "Deselect from Feature"
                            : "Promote to Feature"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="request-visibility" className="space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 max-w-2xl">
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Request Visibility Window</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Controls how long a request remains visible to providers before it auto-closes.</p>
                </div>
                <div className="flex items-center gap-6 pt-2">
                  <Input
                    type="number"
                    min="1"
                    max="168"
                    value={platformConfig.requestVisibilityHours || 24}
                    onChange={(e) => setPlatformConfig({ ...platformConfig, requestVisibilityHours: Number(e.target.value) || 24 })}
                    className="h-20 w-40 text-4xl font-black rounded-3xl bg-slate-50 border-slate-100 text-center focus:bg-white focus:border-blue-500 transition-all"
                  />
                  <div>
                    <span className="text-2xl font-semibold tracking-tight text-slate-950er block">HOURS</span>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Provider feed TTL</span>
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-400 italic">After this window, requests are marked expired for providers and remain visible to admin history.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="payouts" className="space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 max-w-2xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
              <div className="flex items-center gap-6 mb-12 relative z-10">
                <div className="bg-green-600 p-6 rounded-3xl shadow-xl shadow-green-600/20 text-white">
                  <Key className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-950er">
                    Monetization Engine
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Configure revenue capture and settlement logic
                  </p>
                </div>
              </div>

              <div className="space-y-12 relative z-10">
                <div className="space-y-4">
                  <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Payout Hold Delay
                  </Label>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed italic">
                    Minimum hold period before job earnings transition to
                    provider payout pool.
                  </p>
                  <div className="flex items-center gap-6 pt-2">
                    <Input
                      type="number"
                      min="0"
                      max="30"
                      value={platformConfig.payoutDelayDays}
                      onChange={(e) =>
                        setPlatformConfig({
                          ...platformConfig,
                          payoutDelayDays: Number(e.target.value),
                        })
                      }
                      className="h-20 w-40 text-4xl font-black rounded-3xl bg-slate-50 border-slate-100 text-center focus:bg-white focus:border-green-500 transition-all"
                    />
                    <div>
                      <span className="text-2xl font-semibold tracking-tight text-slate-950er block">
                        DAYS
                      </span>
                      <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">
                        Active Policy
                      </span>
                    </div>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-[2rem] mt-6 flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-700 leading-relaxed font-bold uppercase tracking-tight">
                      Hold period safeguards against chargebacks and
                      post-service disputes. Recommendations: 3-7 days.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-10 border-t border-slate-50">
                  <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Platform Transaction Commission
                  </Label>
                  <div className="flex items-center gap-6 pt-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={platformConfig.baseCommissionRate}
                      onChange={(e) =>
                        setPlatformConfig({
                          ...platformConfig,
                          baseCommissionRate: Number(e.target.value),
                        })
                      }
                      className="h-20 w-40 text-4xl font-black rounded-3xl bg-slate-50 border-slate-100 text-center focus:bg-white focus:border-blue-500 transition-all"
                    />
                    <div>
                      <span className="text-2xl font-semibold tracking-tight text-slate-950er block">
                        PERCENT
                      </span>
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                        Revenue Capture
                      </span>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-slate-400 italic mt-2">
                    Deducted dynamically from total job value excluding direct
                    provider tips.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="admins" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-1 my-4 gap-10">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm p-10">
                  <div className="flex items-center gap-3 mb-10 pb-8 border-b border-slate-50">
                    <Shield className="text-indigo-600 w-8 h-8" />
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-slate-900 leading-none">
                        Security Registry
                      </h2>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Authorized system administrators
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {admins.map((admin) => (
                      <motion.div
                        layout
                        key={admin.id}
                        className="p-6 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 flex items-center gap-5 group hover:bg-white hover:border-indigo-200 transition-all shadow-sm"
                      >
                        <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center border shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:rotate-6">
                          <Users className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 truncate text-lg leading-tight">
                            {admin.fullName}
                          </p>
                          <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest truncate">
                            {admin.email}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="bg-slate-900 rounded-[3rem] p-10 sticky top-24 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-indigo-500/10 transition-all" />
                  <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
                    Add Admin
                  </h2>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-10 leading-relaxed">
                    Create a new administrator account.
                  </p>
                  <form
                    onSubmit={handleSubmit(onAddAdmin)}
                    className="space-y-6"
                  >
                    <div className="space-y-1.5">
                      <Label className="ml-1 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">
                        Full Legal Name
                      </Label>
                      <Input
                        placeholder="Johnathan Doe"
                        {...register("fullName")}
                        className="h-14 rounded-2xl bg-white/5 border-white/10 text-white font-bold placeholder:text-white/20 focus:bg-white focus:text-slate-900 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="ml-1 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">
                        Email Address
                      </Label>
                      <Input
                        type="email"
                        placeholder="admin@roadhelp.network"
                        {...register("email")}
                        className="h-14 rounded-2xl bg-white/5 border-white/10 text-white font-bold placeholder:text-white/20 focus:bg-white focus:text-slate-900 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="ml-1 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">
                        Password
                      </Label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...register("password")}
                        className="h-14 rounded-2xl bg-white/5 border-white/10 text-white font-bold placeholder:text-white/20 focus:bg-white focus:text-slate-900 transition-all"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isAdminCreating}
                      className="w-full bg-blue-600 hover:bg-white hover:text-blue-600 text-white mt-4 h-16 rounded-[1.5rem] font-black shadow-2xl shadow-blue-600/30 group transform active:scale-95 transition-all text-xs uppercase tracking-[0.1em]"
                    >
                      <Plus className="w-5 h-5 mr-3 group-hover:scale-125 transition-transform" />
                      {isAdminCreating ? "PROCESSING..." : "REGISTER ADMIN"}
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </AdminLayout>
  );
}





