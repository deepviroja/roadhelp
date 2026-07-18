import { Link } from 'react-router-dom';
import { useSystemStore } from '@/stores/systemStore';

export default function Terms() {
  const { appName } = useSystemStore();
  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-16 md:py-24">
        <h1 className="text-4xl md:text-5xl font-black mb-8 text-slate-900 tracking-tight">Terms of Use</h1>
        <div className="prose prose-lg prose-blue max-w-none text-slate-600">
          <p className="mb-6 font-semibold text-slate-400">Last Updated: March 2026</p>
          <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">1. Agreement to Terms</h2>
          <p className="mb-6 leading-relaxed">By accessing the {appName} platform, you agree to be fully bound by these dynamic Terms of Use and to comply securely with all applicable local driving and highway safety regulations.</p>
          
          <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">2. Platform Role</h2>
          <p className="mb-6 leading-relaxed">{appName} functions as a digital dispatch interface connecting stranded individuals with independent third-party verifiable service and towing providers. We act as an intermediary infrastructure engine and do not independently employ these service teams.</p>

          <h2 className="text-2xl font-bold mt-10 mb-4 text-slate-900">3. Liability</h2>
          <p className="mb-6 leading-relaxed">While we rigorously vet our service professionals, {appName} is not directly liable for unforeseen physical or material damages resulting from the execution of requested maneuvers. Always secure your vehicle and remain in a safe, visible location away from active traffic lanes during service.</p>
          
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
