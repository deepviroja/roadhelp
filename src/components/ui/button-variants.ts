import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold tracking-tight transition-all duration-200 select-none active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
        teal: 'bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-600/20 hover:shadow-teal-600/30',
        outline: 'border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300 shadow-sm',
        secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 shadow-sm',
        ghost: 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900',
        link: 'text-blue-600 underline-offset-4 hover:underline font-extrabold',
        glass: 'glass-effect text-slate-900 hover:bg-white/40 border-white/20 shadow-xl',
      },
      size: {
        default: 'h-12 px-8',
        sm: 'h-11 px-6 text-xs',
        lg: 'h-16 px-12 rounded-2xl text-lg',
        xl: 'h-20 px-16 rounded-[2rem] text-xl font-black',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
