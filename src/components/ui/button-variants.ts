import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-tight transition-all duration-200 select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/15',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
        teal: 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm shadow-teal-600/15',
        outline: 'border border-border bg-background hover:bg-muted text-foreground hover:border-slate-300 shadow-sm',
        secondary: 'bg-muted text-foreground hover:bg-slate-200 shadow-sm',
        ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline font-semibold',
        glass: 'glass-effect text-foreground hover:bg-white/85 border-white/50 shadow-sm',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-10 px-4 text-xs',
        lg: 'h-12 px-6 rounded-2xl text-base',
        xl: 'h-14 px-8 rounded-2xl text-lg',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

