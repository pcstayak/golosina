import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'border border-border rounded-[14px] overflow-hidden',
        'bg-[rgba(255,255,255,0.03)]',
        '[html[data-theme="mist"]_&]:bg-[rgba(17,24,39,0.02)]',
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export function CardBody({ children, className }: CardBodyProps) {
  return (
    <div className={cn('p-3', className)}>
      {children}
    </div>
  );
}
