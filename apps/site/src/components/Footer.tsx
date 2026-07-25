import React from 'react';
import { Logo } from '@git-manager/ui';
import { PRODUCT_METADATA } from '@git-manager/shared';
import { Github, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-800 bg-slate-950 py-12 select-none">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400">
        <div className="flex flex-col items-center md:items-start gap-2">
          <Logo size="md" />
          <p className="text-slate-500">
            Open-source desktop Git repository navigator. Released under the MIT License.
          </p>
        </div>

        <div className="flex items-center gap-6 font-semibold">
          <a
            href={PRODUCT_METADATA.repositoryUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Github className="w-4 h-4" /> GitHub Repository
          </a>
          <a
            href={PRODUCT_METADATA.releasesUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition-colors"
          >
            Releases
          </a>
          <a
            href={`${PRODUCT_METADATA.repositoryUrl}/issues`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition-colors"
          >
            Issue Tracker
          </a>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>No telemetry. All project data stays strictly on your device.</span>
        </div>
      </div>
    </footer>
  );
};
