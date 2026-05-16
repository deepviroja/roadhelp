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
    <div className="min-h-screen bg-gray-50">
      <Navbar links={CUSTOMER_LINKS} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
