'use client';

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: cn(
    'bg-gold-500 text-stone-950 font-semibold',
    'hover:bg-gold-400 active:bg-gold-600',
    'shadow-sm hover:shadow-md hover:shadow-gold-500/20',
    'disabled:bg-gold-500/50',
  ),
  secondary: cn(
    'bg-transparent border border-cosmic-border text-stone-200',
    'hover:bg-cosmic-elevated hover:border-stone-500',
    'active:bg-stone-800',
  ),
  ghost: cn(
    'bg-transparent text-stone-300',
    'hover:bg-cosmic-elevated hover:text-stone-50',
    'active:bg-stone-800',
  ),
  danger: cn(
    'bg-red-900/30 border border-red-700/50 text-red-400',
    'hover:bg-red-800/40 hover:border-red-600',
    'active:bg-red-900/50',
  ),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      children,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium',
          'transition-all duration-150 cursor-pointer select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C0A09]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : leftIcon ? (
          <span className="shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {!loading && rightIcon && (
          <span className="shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
