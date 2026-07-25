import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {icon && (
            <span className="absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={`w-full rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3 py-2 transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 ${
              icon ? 'pl-9' : ''
            } ${
              error
                ? 'border-rose-500 dark:border-rose-500 focus:ring-rose-500/50'
                : 'border-slate-300 dark:border-slate-700'
            } ${className}`}
            {...props}
          />
        </div>
        {error && <span className="text-xs text-rose-500 font-medium">{error}</span>}
        {helperText && !error && (
          <span className="text-xs text-slate-500 dark:text-slate-400">{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
