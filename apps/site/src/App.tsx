import React from 'react';
import { Header } from './components/Header.js';
import { HeroMockup } from './components/HeroMockup.js';
import { FeaturesSection } from './components/FeaturesSection.js';
import { DownloadSection } from './components/DownloadSection.js';
import { InstallationGuide } from './components/InstallationGuide.js';
import { RoadmapSection } from './components/RoadmapSection.js';
import { Footer } from './components/Footer.js';
import { Button, Badge } from '@git-manager/ui';
import { PRODUCT_METADATA } from '@git-manager/shared';
import { Download, Github } from 'lucide-react';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      <Header />

      {/* Hero Section */}
      <section className="py-20 px-6 text-center select-none relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.25),rgba(255,255,255,0))]" />

        <div className="max-w-4xl mx-auto relative z-10 space-y-6">
          <Badge variant="primary" className="mx-auto">
            Open Source & Privacy First
          </Badge>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-100 tracking-tight leading-tight">
            Organize all your local Git projects in one place
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Fast multithreaded repository discovery, group organization, drag-and-drop ordering, and one-click editor & terminal launcher for Windows, macOS, and Linux.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <a href="#download" className="inline-flex">
              <Button variant="primary" size="lg" icon={<Download className="w-5 h-5" />}>
                Download Git Manager
              </Button>
            </a>
            <a href={PRODUCT_METADATA.repositoryUrl} target="_blank" rel="noreferrer" className="inline-flex">
              <Button variant="outline" size="lg" icon={<Github className="w-5 h-5" />}>
                View on GitHub
              </Button>
            </a>
          </div>
        </div>

        {/* Hero Interactive UI Preview Mockup */}
        <div className="mt-16 px-4">
          <HeroMockup />
        </div>
      </section>

      <FeaturesSection />
      <DownloadSection />
      <InstallationGuide />
      <RoadmapSection />
      <Footer />
    </div>
  );
};
