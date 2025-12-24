import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PanelProps {
  children: ReactNode;
  className?: string;
}

export function Panel({ children, className }: PanelProps) {
  return (
    <div
      className={cn(
        'border border-border bg-panel rounded-[14px] shadow-custom overflow-hidden backdrop-blur-[10px]',
        className
      )}
    >
      {children}
    </div>
  );
}

interface PanelHeaderProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function PanelHeader({ children, className, style }: PanelHeaderProps) {
  return (
    <div
      className={cn(
        'px-4 py-3.5 flex items-center justify-between gap-3 border-b border-border bg-panel-2',
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}

interface PanelContentProps {
  children: ReactNode;
  className?: string;
}

export function PanelContent({ children, className }: PanelContentProps) {
  return (
    <div className={cn('p-4', className)}>
      {children}
    </div>
  );
}
