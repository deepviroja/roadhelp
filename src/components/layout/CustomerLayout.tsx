import { Navbar } from './Navbar';

interface CustomerLayoutProps {
  children: React.ReactNode;
}

const CUSTOMER_LINKS = [
  { to: '/customer/dashboard', label: 'Dashboard' },
  { to: '/customer/new-request', label: 'New Request' },
  { to: '/customer/nearby', label: 'Nearby' },
  { to: '/customer/history', label: 'History' },
  { to: '/customer/profile', label: 'Profile' },
];

export function CustomerLayout({ children }: CustomerLayoutProps) {
  return (
    <div className="min-h-screen bg-transparent">
      <Navbar links={CUSTOMER_LINKS} />
      <main className="container-app py-5 sm:py-6 lg:py-8">{children}</main>
    </div>
  );
}


