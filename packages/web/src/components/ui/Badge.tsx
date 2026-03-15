import { cn } from '@/lib/utils';

type BadgeVariant = 'active' | 'inactive' | 'warning' | 'info' | 'default';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  inactive: 'bg-stone-700/40 text-stone-400 border border-stone-600/30',
  warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  info: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  default: 'bg-gold-500/15 text-gold-400 border border-gold-500/30',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-xs',
};

export function Badge({
  variant = 'default',
  size = 'md',
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-medium',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
