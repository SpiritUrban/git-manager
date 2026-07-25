import React from 'react';
import { FolderGit2 } from 'lucide-react';
import { PRODUCT_METADATA } from '@git-manager/shared';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const textSizes = {
    sm: 'text-base font-semibold',
    md: 'text-lg font-bold',
    lg: 'text-2xl font-extrabold',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-700 p-2 text-white shadow-md shadow-indigo-500/20">
        <FolderGit2 className={iconSizes[size]} />
      </div>
      {showText && (
        <span className={`tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-white dark:via-slate-100 dark:to-slate-300 bg-clip-text text-transparent ${textSizes[size]}`}>
          {PRODUCT_METADATA.name}
        </span>
      )}
    </div>
  );
};
