import { motion } from 'framer-motion';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { ServiceRequestForm } from '@/components/customer/ServiceRequestForm';

export default function NewRequest() {
  return (
    <CustomerLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">New Service Request</h1>
          <p className="text-gray-500 mt-1">Tell us what you need and where you are</p>
        </div>
        <ServiceRequestForm />
      </motion.div>
    </CustomerLayout>
  );
}
