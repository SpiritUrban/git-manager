import React, { useState, useEffect } from 'react';
import { Download, Monitor, Apple, Terminal as LinuxIcon, ExternalLink, ShieldAlert } from 'lucide-react';
import { Button, Badge } from '@git-manager/ui';
import { PRODUCT_METADATA } from '@git-manager/shared';

interface ManifestAsset {
  platform: 'windows' | 'macos' | 'linux';
  architecture: 'x64' | 'arm64';
  fileType: string;
  fileName: string;
  fileSize?: string;
  downloadUrl: string;
}

interface ManifestData {
  version: string;
  publishedAt: string;
  releasePageUrl: string;
  assets: ManifestAsset[];
}

export const DownloadSection: React.FC = () => {
  const [detectedOs, setDetectedOs] = useState<'windows' | 'macos' | 'linux'>('windows');
  const [manifest, setManifest] = useState<ManifestData | null>(null);

  useEffect(() => {
    // Detect Browser OS
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('mac')) {
      setDetectedOs('macos');
    } else if (ua.includes('linux')) {
      setDetectedOs('linux');
    } else {
      setDetectedOs('windows');
    }

    // Attempt to load download manifest
    fetch(`${import.meta.env.BASE_URL}download-manifest.json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setManifest(data))
      .catch(() => setManifest(null));
  }, []);

  const downloadTargets = [
    {
      platform: 'windows' as const,
      arch: 'x64',
      name: 'Windows x64 Setup',
      type: 'Installer (.exe)',
      icon: <Monitor className="w-5 h-5 text-blue-400" />,
      fallbackUrl: `${PRODUCT_METADATA.releasesUrl}/latest/download/Git-Manager_0.1.0_windows_x64-setup.exe`,
    },
    {
      platform: 'windows' as const,
      arch: 'x64',
      name: 'Windows x64 MSI',
      type: 'Package (.msi)',
      icon: <Monitor className="w-5 h-5 text-blue-400" />,
      fallbackUrl: `${PRODUCT_METADATA.releasesUrl}/latest/download/Git-Manager_0.1.0_windows_x64.msi`,
    },
    {
      platform: 'macos' as const,
      arch: 'arm64',
      name: 'macOS Apple Silicon',
      type: 'Disk Image (.dmg)',
      icon: <Apple className="w-5 h-5 text-slate-200" />,
      fallbackUrl: `${PRODUCT_METADATA.releasesUrl}/latest/download/Git-Manager_0.1.0_macos_arm64.dmg`,
    },
    {
      platform: 'macos' as const,
      arch: 'x64',
      name: 'macOS Intel',
      type: 'Disk Image (.dmg)',
      icon: <Apple className="w-5 h-5 text-slate-400" />,
      fallbackUrl: `${PRODUCT_METADATA.releasesUrl}/latest/download/Git-Manager_0.1.0_macos_x64.dmg`,
    },
    {
      platform: 'linux' as const,
      arch: 'x64',
      name: 'Linux AppImage',
      type: 'Executable (.AppImage)',
      icon: <LinuxIcon className="w-5 h-5 text-amber-400" />,
      fallbackUrl: `${PRODUCT_METADATA.releasesUrl}/latest/download/Git-Manager_0.1.0_linux_x64.AppImage`,
    },
    {
      platform: 'linux' as const,
      arch: 'x64',
      name: 'Linux Debian Package',
      type: 'Package (.deb)',
      icon: <LinuxIcon className="w-5 h-5 text-amber-400" />,
      fallbackUrl: `${PRODUCT_METADATA.releasesUrl}/latest/download/Git-Manager_0.1.0_linux_x64.deb`,
    },
  ];

  return (
    <section id="download" className="py-20 border-t border-slate-800/80 bg-slate-900/40 select-none">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge variant="primary" className="mb-3">
            Cross-Platform Support
          </Badge>
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight mb-3">
            Download Git Manager for your OS
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Select your platform below to download official release binaries.
          </p>
        </div>

        {/* Downloads Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {downloadTargets.map((item, idx) => {
            const isRecommended = item.platform === detectedOs;
            const matchedAsset = manifest?.assets.find(
              (a) => a.platform === item.platform && a.architecture === item.arch
            );
            const downloadUrl = matchedAsset?.downloadUrl || item.fallbackUrl;

            return (
              <div
                key={idx}
                className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                  isRecommended
                    ? 'bg-gradient-to-b from-indigo-950/40 to-slate-900 border-indigo-500/50 shadow-xl shadow-indigo-500/10'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-slate-800 border border-slate-700/80">
                      {item.icon}
                    </div>
                    {isRecommended && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        ★ Recommended for your OS
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-100 mb-1">{item.name}</h3>
                  <div className="text-xs text-slate-400 font-mono mb-4">{item.type}</div>
                </div>

                <div className="pt-4 border-t border-slate-800/80">
                  <a href={downloadUrl} target="_blank" rel="noreferrer" className="w-full inline-flex">
                    <Button
                      variant={isRecommended ? 'primary' : 'outline'}
                      fullWidth
                      icon={<Download className="w-4 h-4" />}
                    >
                      Download {manifest ? `v${manifest.version}` : 'v0.1.0'}
                    </Button>
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Unsigned Build Warning */}
        <div className="mt-12 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 max-w-4xl mx-auto flex flex-col sm:flex-row items-start gap-4">
          <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-1" />
          <div className="text-xs text-amber-200 leading-relaxed">
            <h4 className="font-bold text-sm text-amber-300 mb-1">Unsigned preview builds</h4>
            <p>
              Git Manager is currently distributed without Windows code signing and without Apple notarization. Windows SmartScreen and macOS Gatekeeper may display a security warning upon first execution.
            </p>
            <p className="mt-1">
              Download Git Manager only from this official repository and verify release checksums. Platform signing may be added in a future release.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
