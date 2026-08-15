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
    sm: 'text-base',
    md: 'text-lg font-semibold',
    lg: 'text-2xl font-bold',
  };

  const getStyledName = () => {
    const lowerName = appName.toLowerCase();
    if (lowerName === 'roadhelp') {
      return (
        <span className="flex items-center">
          <span className="text-slate-950">Road</span>
          <span className="text-primary">Help</span>
        </span>
      );
    }
    if (lowerName === 'resqroad') {
      const idx = lowerName.indexOf('road');
      if (idx !== -1) {
        return (
          <span className="flex items-center">
            <span className="text-slate-950">{appName.substring(0, idx)}</span>
            <span className="text-primary">{appName.substring(idx)}</span>
          </span>
        );
      }
    }
    const match = appName.slice(1).match(/[A-Z]/);
    if (match && match.index !== undefined) {
      const splitIdx = match.index + 1;
      return (
        <span className="flex items-center">
          <span className="text-slate-950">{appName.substring(0, splitIdx)}</span>
          <span className="text-primary">{appName.substring(splitIdx)}</span>
        </span>
      );
    }
    return <span className="text-slate-950">{appName}</span>;
  };

  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  return (
    <Link to="/" className={`flex items-center gap-2.5 group ${className}`}>
      {initialized && logoUrl ? (
        <img
          src={logoUrl}
          alt={appName}
          className={`object-contain rounded-xl ${size === 'sm' ? 'h-8' : size === 'md' ? 'h-10' : 'h-12'}`}
        />
      ) : (
        <motion.div
          whileHover={{ rotate: 8, scale: 1.03 }}
          transition={{ type: 'spring', stiffness: 400, damping: 14 }}
          className={`flex items-center justify-center rounded-2xl bg-primary text-white shadow-sm shadow-primary/20 ${iconSizes[size]}`}
        >
          <ShieldCheck className="h-2/3 w-2/3" strokeWidth={2.75} />
        </motion.div>
      )}
      <span className={`${sizes[size]} tracking-tight transition-colors`}>
        {initialized ? (
          getStyledName()
        ) : (
          <span className="inline-block h-5 w-24 rounded-md bg-slate-200 animate-pulse" />
        )}
      </span>
    </Link>
  );
}

