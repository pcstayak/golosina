import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'assigned' | 'reviewed';
  className?: string;
  style?: React.CSSProperties;
}

export function Badge({ children, variant = 'default', className, style }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-extrabold px-2.5 py-1.5 rounded-full',
        'border border-border',
        'bg-[rgba(255,255,255,0.05)] text-muted',
        '[html[data-theme="mist"]_&]:bg-[rgba(17,24,39,0.04)]',
        className
      )}
      style={style}
    >
      {variant === 'assigned' && (
        <span className="w-2 h-2 rounded-full bg-warning" />
      )}
      {variant === 'reviewed' && (
        <span className="w-2 h-2 rounded-full bg-success" />
      )}
      {children}
    </span>
  );
}
