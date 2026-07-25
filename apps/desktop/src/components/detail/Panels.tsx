import React from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { HealthCheck, HealthReport, HealthStatus, Hotspot, StackItem } from '@git-manager/shared';
import { STATUS, formatCount } from './viz.js';

// ---------------------------------------------------------------------------
// Section shell
// ---------------------------------------------------------------------------

interface SectionProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({ title, subtitle, action, children, className = '' }) => (
  <section
    className={`rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg ${className}`}
  >
    <header className="flex items-start justify-between gap-4 mb-4">
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-slate-100 tracking-tight">{title}</h2>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </header>
    {children}
  </section>
);

// ---------------------------------------------------------------------------
// Stat tile
// ---------------------------------------------------------------------------

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const StatTile: React.FC<StatTileProps> = ({ label, value, hint, icon }) => (
  <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 px-4 py-3">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
      {icon}
      {label}
    </div>
    <div className="mt-1.5 text-2xl font-black text-slate-50 leading-none">{value}</div>
    {hint && <div className="mt-1.5 text-[11px] text-slate-500 truncate">{hint}</div>}
  </div>
);

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

const STATUS_ICON: Record<HealthStatus, React.ReactNode> = {
  good: <CheckCircle2 className="w-3.5 h-3.5" style={{ color: STATUS.good }} />,
  warning: <AlertTriangle className="w-3.5 h-3.5" style={{ color: STATUS.warning }} />,
  critical: <AlertOctagon className="w-3.5 h-3.5" style={{ color: STATUS.critical }} />,
  info: <Info className="w-3.5 h-3.5" style={{ color: STATUS.info }} />,
};

function gradeColor(score: number): string {
  if (score >= 75) return STATUS.good;
  if (score >= 60) return STATUS.warning;
  if (score >= 45) return STATUS.serious;
  return STATUS.critical;
}

export const HealthPanel: React.FC<{ health: HealthReport }> = ({ health }) => {
  const color = gradeColor(health.score);
  const circumference = 2 * Math.PI * 42;

  return (
    <div className="flex flex-col sm:flex-row gap-6">
      <div className="relative w-[116px] h-[116px] shrink-0 mx-auto sm:mx-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - health.score / 100)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-slate-50 leading-none">{health.score}</span>
          <span className="text-[10px] font-bold tracking-widest mt-1" style={{ color }}>
            GRADE {health.grade}
          </span>
        </div>
      </div>

      <ul className="flex-1 min-w-0 space-y-1.5">
        {health.checks.map((check: HealthCheck) => (
          <li key={check.id} className="flex items-center gap-2.5 text-[11px]">
            <span className="shrink-0">{STATUS_ICON[check.status] ?? STATUS_ICON.info}</span>
            <span className="text-slate-200 font-semibold w-36 shrink-0 truncate">{check.label}</span>
            <span className="text-slate-500 truncate flex-1">{check.detail}</span>
            <span className="text-slate-400 tabular-nums shrink-0 font-mono text-[10px]">
              {check.earned}/{check.weight}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Hotspots
// ---------------------------------------------------------------------------

export const HotspotTable: React.FC<{ hotspots: Hotspot[] }> = ({ hotspots }) => {
  if (hotspots.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        No hotspots — this needs both git history and source files that still exist.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="text-slate-500 text-left">
            <th className="font-semibold pb-2 pr-3">File</th>
            <th className="font-semibold pb-2 px-2 text-right">Lines</th>
            <th className="font-semibold pb-2 px-2 text-right">Commits</th>
            <th className="font-semibold pb-2 px-2 text-right">Authors</th>
            <th className="font-semibold pb-2 pl-2 w-28" title="Churn x size, relative to this repository">
              Risk
            </th>
          </tr>
        </thead>
        <tbody>
          {hotspots.map((hotspot) => (
            <tr key={hotspot.path} className="border-t border-slate-800/70">
              <td className="py-1.5 pr-3 font-mono text-slate-200 max-w-0">
                <span className="block truncate" title={hotspot.path}>
                  {hotspot.path}
                </span>
              </td>
              <td className="py-1.5 px-2 text-right tabular-nums text-slate-400">
                {formatCount(hotspot.lines)}
              </td>
              <td className="py-1.5 px-2 text-right tabular-nums text-slate-400">
                {hotspot.commits}
              </td>
              <td className="py-1.5 px-2 text-right tabular-nums text-slate-400">
                {hotspot.authors}
              </td>
              <td className="py-1.5 pl-2">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(hotspot.risk * 100, 2)}%`,
                        backgroundColor: hotspot.risk > 0.6 ? STATUS.critical : STATUS.serious,
                      }}
                    />
                  </div>
                  {/* A relative index, not a percentage — 100 is this repo's worst file. */}
                  <span className="tabular-nums text-slate-500 w-7 text-right">
                    {Math.round(hotspot.risk * 100)}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Tech stack
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  language: 'Languages',
  framework: 'Frameworks',
  backend: 'Backend',
  runtime: 'Runtime',
  state: 'State',
  data: 'Data',
  styling: 'Styling',
  build: 'Build',
  testing: 'Testing',
  ci: 'CI',
  infra: 'Infrastructure',
  ai: 'AI',
  graphics: 'Graphics',
  quality: 'Code quality',
  tooling: 'Tooling',
};

export const StackPanel: React.FC<{ stack: StackItem[] }> = ({ stack }) => {
  if (stack.length === 0) {
    return <p className="text-xs text-slate-500">No recognisable stack markers found.</p>;
  }

  const grouped = stack.reduce<Record<string, StackItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-3.5">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
            {CATEGORY_LABELS[category] ?? category}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {items.map((item) => (
              <span
                key={item.name}
                title={item.evidence}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-700/80 bg-slate-800/60 px-2 py-1 text-[11px] text-slate-200"
              >
                {item.name}
                {item.version && (
                  <span className="text-slate-500 font-mono text-[10px]">{item.version}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
