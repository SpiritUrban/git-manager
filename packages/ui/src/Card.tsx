import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  active?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  active = false,
  className = '',
  ...props
}) => {
  const base = 'rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 shadow-sm transition-all duration-150';
  const interactiveStyles = interactive
    ? 'hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md cursor-pointer'
    : '';
  const activeStyles = active
    ? 'ring-2 ring-indigo-500 border-indigo-500 dark:border-indigo-500'
    : '';

  return (
    <div
      className={`${base} ${interactiveStyles} ${activeStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
