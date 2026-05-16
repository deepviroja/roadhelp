import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizes = {
    sm: 'text-lg',
    md: 'text-xl font-extrabold',
    lg: 'text-3xl font-black',
  };

  const getStyledName = () => {
    return (
      <span className="flex items-center">
        <span className="text-gray-900">Road</span>
        <span className="text-blue-600">Help</span>
      </span>
    );
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-9 h-9',
  };

  return (
    <Link to="/" className={`flex items-center gap-2.5 group ${className}`}>
      <motion.div
        whileHover={{ rotate: 10, scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        className={`flex items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 text-white ${iconSizes[size]}`}
      >
        <ShieldCheck className="w-2/3 h-2/3" strokeWidth={3} />
      </motion.div>
      <span className={`${sizes[size]} tracking-tight transition-colors`}>
        {getStyledName()}
      </span>
    </Link>
  );
}
