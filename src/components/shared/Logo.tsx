import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { useSystemStore } from '@/stores/systemStore';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const { appName, logoUrl, initialized } = useSystemStore();
  const sizes = {
    sm: 'text-lg',
    md: 'text-xl font-extrabold',
    lg: 'text-3xl font-black',
    
  };

  const getStyledName = () => {
    const lowerName = appName.toLowerCase();
    if (lowerName === 'roadhelp') {
      return (
        <span className="flex items-center">
          <span className="text-gray-900">Road</span>
          <span className="text-blue-600">Help</span>
        </span>
      );
    }
    if (lowerName === 'resqroad') {
      const idx = lowerName.indexOf('road');
      if (idx !== -1) {
        return (
          <span className="flex items-center">
            <span className="text-gray-900">{appName.substring(0, idx)}</span>
            <span className="text-blue-600">{appName.substring(idx)}</span>
          </span>
        );
      }
    }
    const match = appName.slice(1).match(/[A-Z]/);
    if (match && match.index !== undefined) {
      const splitIdx = match.index + 1;
      return (
        <span className="flex items-center">
          <span className="text-gray-900">{appName.substring(0, splitIdx)}</span>
          <span className="text-blue-600">{appName.substring(splitIdx)}</span>
        </span>
      );
    }
    return <span className="text-gray-900">{appName}</span>;
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-9 h-9',
  };

  return (
    <Link to="/" className={`flex items-center gap-2.5 group ${className}`}>
      {initialized && logoUrl ? (
        <img
          src={logoUrl}
          alt={appName}
          className={`object-contain rounded-xl ${
            size === 'sm' ? 'h-8' : size === 'md' ? 'h-10' : 'h-14'
          }`}
        />
      ) : (
        <motion.div
          whileHover={{ rotate: 10, scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          className={`flex items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 text-white ${iconSizes[size]}`}
        >
          <ShieldCheck className="w-2/3 h-2/3" strokeWidth={3} />
        </motion.div>
      )}
      <span className={`${sizes[size]} tracking-tight transition-colors`}>
        {initialized ? (
          getStyledName()
        ) : (
          <span className="inline-block h-6 w-24 bg-slate-200 animate-pulse rounded-md" />
        )}
      </span>
    </Link>
  );
}
