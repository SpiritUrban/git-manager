import React, { useState } from 'react';
import { Monitor, Apple, Terminal as LinuxIcon } from 'lucide-react';

export const InstallationGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'windows' | 'macos' | 'linux'>('windows');

  return (
    <section id="installation" className="py-20 border-t border-slate-800/80 bg-slate-950/60 select-none">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight mb-3">
            Installation & First Launch
          </h2>
          <p className="text-sm text-slate-400">
            Platform-specific instructions for running unsigned preview builds safely.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 mb-8">
          <button
            onClick={() => setActiveTab('windows')}
            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'windows'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-4 h-4" /> Windows
          </button>
          <button
            onClick={() => setActiveTab('macos')}
            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'macos'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Apple className="w-4 h-4" /> macOS
          </button>
          <button
            onClick={() => setActiveTab('linux')}
            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'linux'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinuxIcon className="w-4 h-4" /> Linux
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-4">
          {activeTab === 'windows' && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-100">Windows Installation</h4>
              <ol className="list-decimal list-inside space-y-2 leading-relaxed text-slate-400">
                <li>Download the official <code className="text-indigo-300 font-mono">Git.Manager_*.exe</code> NSIS installer or <code className="text-indigo-300 font-mono">*.msi</code> package.</li>
                <li>Run the installer. If Windows SmartScreen displays "Windows protected your PC":</li>
                <li className="pl-4 font-semibold text-amber-300">Click <strong>More info</strong> → Click <strong>Run anyway</strong>.</li>
                <li>Complete the setup wizard. Git Manager will be available in your Start Menu.</li>
              </ol>
            </div>
          )}

          {activeTab === 'macos' && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-100">macOS Installation</h4>
              <ol className="list-decimal list-inside space-y-2 leading-relaxed text-slate-400">
                <li>Download the appropriate <code className="text-indigo-300 font-mono">.dmg</code> file for your Mac architecture (Apple Silicon vs Intel).</li>
                <li>Open the DMG image and drag <strong>Git Manager.app</strong> to your <strong>Applications</strong> folder.</li>
                <li>If macOS Gatekeeper blocks execution with "App cannot be opened because it is from an unidentified developer":</li>
                <li className="pl-4 font-semibold text-amber-300">Right-click <strong>Git Manager.app</strong> → Select <strong>Open</strong> → Click <strong>Open</strong> in the confirmation dialog.</li>
                <li className="pl-4 text-slate-400">Alternatively, go to <strong>System Settings → Privacy & Security</strong> and click <strong>Open Anyway</strong>.</li>
              </ol>
            </div>
          )}

          {activeTab === 'linux' && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-100">Linux Installation</h4>
              <ol className="list-decimal list-inside space-y-2 leading-relaxed text-slate-400">
                <li>For <strong>AppImage</strong>: Download <code className="text-indigo-300 font-mono">Git.Manager_*.AppImage</code>.</li>
                <li className="pl-4 font-mono bg-slate-950 p-2 rounded text-emerald-400">chmod +x Git.Manager_*.AppImage && ./Git.Manager_*.AppImage</li>
                <li>For <strong>Debian / Ubuntu</strong>: Download <code className="text-indigo-300 font-mono">Git.Manager_*.deb</code>.</li>
                <li className="pl-4 font-mono bg-slate-950 p-2 rounded text-emerald-400">sudo dpkg -i Git.Manager_*.deb</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
