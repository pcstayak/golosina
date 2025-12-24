import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  children: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center gap-2 font-bold transition-all duration-200 focus:outline-none';

  const variantStyles = {
    primary: 'border-0 text-primary-contrast bg-gradient-to-br from-primary to-primary-2 hover:opacity-90',
    secondary: 'border border-border bg-panel text-text hover:bg-panel-2',
    ghost: 'border border-border bg-transparent text-text hover:bg-panel',
    danger: 'border-0 bg-danger text-white hover:opacity-90',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-2 rounded-[10px] text-[13px]',
    md: 'px-3 py-2.5 rounded-[12px] text-sm',
  };

  return (
    <button
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}