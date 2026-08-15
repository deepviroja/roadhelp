import * as React from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ eyebrow, title, description, action }: SectionHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500 sm:text-base">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-3">{action}</div>}
    </div>
  );
}

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  compact?: boolean;
}

export function Panel({ className, compact = false, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        'rounded-[1.75rem] border border-slate-200/80 bg-white shadow-sm shadow-slate-900/5',
        compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6 lg:p-8',
        className,
      )}
      {...props}
    />
  );
}
