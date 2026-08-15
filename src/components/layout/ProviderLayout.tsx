import { Navbar } from './Navbar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { toast } from 'sonner';

interface ProviderLayoutProps {
  children: React.ReactNode;
}

const PROVIDER_LINKS = [
  { to: '/provider/dashboard', label: 'Dashboard' },
  { to: '/provider/history', label: 'Job History' },
  { to: '/provider/earnings', label: 'Earnings' },
  { to: '/provider/profile', label: 'Profile' },
];

function AvailabilityToggle() {
  const { profile, refreshProfile } = useAuth();
  const isOnline = profile?.isOnline ?? false;

  const handleToggle = async (checked: boolean) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), { isOnline: checked });
      await refreshProfile();
      checked ? toast.success('Status: Online') : toast.error('Status: Offline');
    } catch {
      toast.error('Telemetry Sync Failed');
    }
  };

  return (
    <div className={`flex items-center justify-between gap-2 px-2 py-2 rounded-2xl border transition-all duration-500 ${isOnline ? 'bg-green-500/10 border-green-500/20' : 'bg-slate-100 border-slate-200'}`}>
      <Label htmlFor="availability" className={`text-[10px]  mt-2 font-black uppercase tracking-[0.2em] cursor-pointer ${isOnline ? 'text-green-600' : 'text-slate-500'}`}>
        {isOnline ? 'Available' : 'Unavailable'}
      </Label>
      <Switch
        id="availability"
        checked={isOnline}
        onCheckedChange={handleToggle}
        className="data-[state=checked]:bg-green-600 scale-90"
      />
    </div>
  );
}

export function ProviderLayout({ children }: ProviderLayoutProps) {
  return (
    <div className="min-h-screen bg-transparent">
      <Navbar links={PROVIDER_LINKS} extra={<AvailabilityToggle />} />
      <main className="container-app py-5 sm:py-6 lg:py-8"><div className="min-w-0">{children}</div></main>
    </div>
  );
}


