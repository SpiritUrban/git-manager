import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'warning' | 'danger' | 'success' | 'outline';
  color?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  color,
  className = '',
}) => {
  const base = 'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium tracking-tight select-none';

  const variants = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    primary: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50',
    danger: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50',
    outline: 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-transparent',
  };

  const style = color
    ? { backgroundColor: `${color}18`, color: color, borderColor: `${color}40` }
    : undefined;

  return (
    <span
      className={`${base} ${color ? 'border' : variants[variant]} ${className}`}
      style={style}
    >
      {children}
    </span>
  );
};
