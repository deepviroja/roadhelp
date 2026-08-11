import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'ResQRoad | 24/7 Roadside Assistance Marketplace',
  '/services': 'Services Catalog | ResQRoad',
  '/how-it-works': 'How It Works | ResQRoad',
  '/for-customers': 'For Motorists | ResQRoad',
  '/for-providers': 'For Service Partners | ResQRoad',
  '/about': 'About Us | ResQRoad',
  '/contact': 'Contact Support | ResQRoad',
  '/faq': 'Frequently Asked Questions | ResQRoad',
  '/get-help': 'Get Emergency Help | ResQRoad',
  '/login': 'Sign In | ResQRoad',
  '/signup': 'Create Account | ResQRoad',
  '/admin': 'Admin Portal | ResQRoad',
  '/admin/dashboard': 'Admin Dashboard | ResQRoad',
  '/admin/users': 'Manage Customers | ResQRoad',
  '/admin/providers': 'Manage Providers | ResQRoad',
  '/admin/requests': 'Service Requests | ResQRoad',
  '/admin/contact-messages': 'Contact Inquiries | ResQRoad',
  '/admin/services': 'Manage Services | ResQRoad',
  '/admin/vehicles': 'Vehicle Categories | ResQRoad',
  '/admin/forms': 'Form Builder | ResQRoad',
  '/admin/pages': 'Page CMS | ResQRoad',
  '/admin/admins': 'Admins & Permissions | ResQRoad',
  '/admin/logs': 'Audit Activity Logs | ResQRoad',
  '/admin/settings': 'Platform Settings | ResQRoad',
  '/customer/dashboard': 'Customer Dashboard | ResQRoad',
  '/provider/dashboard': 'Provider Dashboard | ResQRoad',
};

export function useDocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    let title = ROUTE_TITLES[pathname];

    if (!title) {
      if (pathname.startsWith('/customer/track/')) {
        title = 'Live Tracking Request | ResQRoad';
      } else if (pathname.startsWith('/provider/active-job/')) {
        title = 'Active Assistance Job | ResQRoad';
      } else {
        title = 'ResQRoad | 24/7 Roadside Assistance';
      }
    }

    document.title = title;
  }, [pathname]);
}
