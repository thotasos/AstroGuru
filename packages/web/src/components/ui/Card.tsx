import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  hoverable?: boolean;
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  children,
  className,
  glass = false,
  padding = 'md',
  onClick,
  hoverable = false,
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-cosmic-border',
        glass
          ? 'glass'
          : 'bg-cosmic-surface',
        paddingMap[padding],
        hoverable && 'transition-all duration-200 cursor-pointer hover:bg-cosmic-elevated hover:border-stone-600',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn('text-base font-semibold text-stone-50', className)}>
      {children}
    </h3>
  );
}

export function CardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('', className)}>
      {children}
    </div>
  );
}
