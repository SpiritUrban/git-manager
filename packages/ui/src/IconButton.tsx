import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  title: string;
  variant?: 'ghost' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  title,
  variant = 'ghost',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-95';

  const variantStyles = {
    ghost: 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 focus:ring-indigo-500',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 focus:ring-indigo-500',
    danger: 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 focus:ring-rose-500',
    outline: 'border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 focus:ring-indigo-500',
  };

  const sizeStyles = {
    sm: 'p-1 text-xs',
    md: 'p-1.5 text-sm',
    lg: 'p-2.5 text-base',
  };

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
};
