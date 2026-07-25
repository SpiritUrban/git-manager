import React from 'react';
import { Logo, Button } from '@git-manager/ui';
import { PRODUCT_METADATA } from '@git-manager/shared';
import { Github, Download } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2">
          <Logo size="md" />
        </a>

        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">
            Features
          </a>
          <a href="#download" className="hover:text-white transition-colors">
            Download
          </a>
          <a href="#installation" className="hover:text-white transition-colors">
            Installation
          </a>
          <a href="#roadmap" className="hover:text-white transition-colors">
            Roadmap
          </a>
          <a
            href={PRODUCT_METADATA.releasesUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition-colors"
          >
            Releases
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <a href={PRODUCT_METADATA.repositoryUrl} target="_blank" rel="noreferrer" className="inline-flex">
            <Button variant="ghost" size="sm" icon={<Github className="w-4 h-4" />}>
              GitHub
            </Button>
          </a>
          <a href="#download" className="inline-flex">
            <Button variant="primary" size="sm" icon={<Download className="w-4 h-4" />}>
              Get Git Manager
            </Button>
          </a>
        </div>
      </div>
    </header>
  );
};
