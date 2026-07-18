import { Link } from 'react-router-dom';
import { useSystemStore } from '@/stores/systemStore';

export default function Privacy() {
  const { appName } = useSystemStore();
  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-16 md:py-24">
        <h1 className="text-4xl md:text-5xl font-black mb-8 text-slate-900 tracking-tight">Privacy Policy</h1>
        <div className="prose prose-lg prose-blue max-w-none text-slate-600">
          <p className="mb-6 font-semibold text-slate-400">Last Updated: March 2026</p>
          <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">1. Information We Collect</h2>
          <p className="mb-6 leading-relaxed">We collect information that you securely provide to us directly such as your name, email, phone number, and location when utilizing the {appName} platform. We also collect automated platform usage analytics to improve service reliability.</p>
          
          <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">2. How We Use Your Information</h2>
          <p className="mb-6 leading-relaxed">Your information is used strictly to provide you with secure roadside assistance. Background location data is exclusively shared dynamically with your assigned professional provider only when you initiate an active service request.</p>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">3. Data Security & Integrity</h2>
          <p className="mb-6 leading-relaxed">We prioritize industry-standard Firebase Security configurations and cloud infrastructure encryption measures. Under no circumstances do we sell your personal data or live movement behavior to arbitrary third-party marketing brokers.</p>
          
          <div className="mt-16 pt-8 border-t border-slate-100">
            <Link to="/" className="inline-flex items-center text-blue-600 font-bold hover:text-blue-700 transition-colors">
              <span className="mr-2">&larr;</span> Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
