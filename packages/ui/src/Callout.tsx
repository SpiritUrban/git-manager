import React from 'react';
import { AlertTriangle, Info, AlertOctagon, CheckCircle2 } from 'lucide-react';

export interface CalloutProps {
  title?: string;
  children: React.ReactNode;
  variant?: 'warning' | 'info' | 'danger' | 'success';
  className?: string;
}

export const Callout: React.FC<CalloutProps> = ({
  title,
  children,
  variant = 'warning',
  className = '',
}) => {
  const configs = {
    warning: {
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />,
    },
    info: {
      bg: 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200',
      icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />,
    },
    danger: {
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200',
      icon: <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />,
    },
    success: {
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />,
    },
  };

  const current = configs[variant];

  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${current.bg} ${className}`}>
      {current.icon}
      <div className="text-sm leading-relaxed">
        {title && <h5 className="font-semibold mb-1 tracking-tight">{title}</h5>}
        {children}
      </div>
    </div>
  );
};
