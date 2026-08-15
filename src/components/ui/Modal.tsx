import { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = 'lg',
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarGap > 0) {
      document.body.style.paddingRight = `${scrollbarGap}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }[maxWidth];

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[300] h-full w-full bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className={`bg-white rounded-[2.5rem] w-full ${maxWidthClass} shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[calc(100vh-2rem)] sm:max-h-[90vh]`}
        >
          {/* Header Row */}
          <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-3">
              {icon && <div className="p-2.5 rounded-2xl bg-blue-600/10 text-blue-600 shrink-0">{icon}</div>}
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">{title}</h2>
                {subtitle && <p className="text-xs font-semibold text-slate-500 mt-0.5">{subtitle}</p>}
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-all shrink-0 border border-slate-200/60"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 sm:p-8 space-y-5 overflow-y-auto flex-1">{children}</div>

          {/* Footer Row */}
          {footer && (
            <div className="px-6 py-4 sm:px-8 sm:py-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-3 shrink-0">
              {footer}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
