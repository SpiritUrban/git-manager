import React, { useMemo, useState } from 'react';
import type { LanguageStat, WeekBucket } from '@git-manager/shared';
import {
  NEUTRAL_SERIES,
  colorFor,
  formatCount,
  formatPercent,
  sequentialStep,
  SEQUENTIAL,
} from './viz.js';

// ---------------------------------------------------------------------------
// Language composition
// ---------------------------------------------------------------------------

interface LanguageBarProps {
  languages: LanguageStat[];
  colors: Map<string, string>;
}

/**
 * One stacked bar plus a legend — the parts-of-a-whole case. Languages past the
 * palette's slot count collapse into a neutral "Other" segment rather than
 * reusing a hue.
 */
export const LanguageBar: React.FC<LanguageBarProps> = ({ languages, colors }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  const segments = useMemo(() => {
    const named = languages.filter((l) => colors.has(l.language) && l.share > 0);
    const rest = languages.filter((l) => !colors.has(l.language));
    const restShare = rest.reduce((sum, l) => sum + l.share, 0);
    const restLines = rest.reduce((sum, l) => sum + l.lines, 0);

    return restShare > 0
      ? [
          ...named,
          {
            language: `Other (${rest.length})`,
            share: restShare,
            lines: restLines,
            files: rest.reduce((sum, l) => sum + l.files, 0),
            bytes: rest.reduce((sum, l) => sum + l.bytes, 0),
          } as LanguageStat,
        ]
      : named;
  }, [languages, colors]);

  if (segments.length === 0) {
    return <div className="text-xs text-slate-500">No text files measured.</div>;
  }

  return (
    <div>
      <div className="flex gap-[2px] h-3 rounded-full overflow-hidden bg-slate-950">
        {segments.map((segment) => (
          <div
            key={segment.language}
            className="h-full transition-opacity first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${Math.max(segment.share * 100, 0.6)}%`,
              backgroundColor: colorFor(colors, segment.language),
              opacity: hovered && hovered !== segment.language ? 0.35 : 1,
            }}
            title={`${segment.language} — ${formatPercent(segment.share)}`}
            onMouseEnter={() => setHovered(segment.language)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </div>

      <ul className="mt-4 space-y-1.5">
        {segments.map((segment) => (
          <li
            key={segment.language}
            className="flex items-center gap-2 text-[11px]"
            onMouseEnter={() => setHovered(segment.language)}
            onMouseLeave={() => setHovered(null)}
          >
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: colorFor(colors, segment.language) }}
            />
            <span className="text-slate-200 font-medium truncate flex-1">{segment.language}</span>
            <span className="text-slate-500 tabular-nums">{formatCount(segment.lines)}</span>
            <span className="text-slate-300 tabular-nums w-12 text-right font-semibold">
              {formatPercent(segment.share)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Weekly commit activity
// ---------------------------------------------------------------------------

interface ActivityChartProps {
  weeks: WeekBucket[];
}

const CHART_W = 720;
const CHART_H = 120;

/** Commits per week for the last year. Single series, so no legend box. */
export const ActivityChart: React.FC<ActivityChartProps> = ({ weeks }) => {
  const [hovered, setHovered] = useState<number | null>(null);

  const max = Math.max(1, ...weeks.map((w) => w.commits));
  const slot = CHART_W / Math.max(weeks.length, 1);
  const barW = Math.max(2, slot - 2);
  const peakIndex = weeks.findIndex((w) => w.commits === max);

  if (weeks.every((w) => w.commits === 0)) {
    return (
      <div className="h-28 flex items-center justify-center text-xs text-slate-500">
        No commits in the last 52 weeks.
      </div>
    );
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H + 18}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Commits per week over the last year, peaking at ${max}`}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Recessive baseline */}
        <line
          x1={0}
          y1={CHART_H}
          x2={CHART_W}
          y2={CHART_H}
          stroke="#1e293b"
          strokeWidth={1}
        />

        {weeks.map((week, index) => {
          const height = week.commits === 0 ? 0 : Math.max(3, (week.commits / max) * (CHART_H - 8));
          const x = index * slot + (slot - barW) / 2;
          const active = hovered === index;

          return (
            <g key={week.week_start}>
              {/* Hit target spans the full column height, not just the bar. */}
              <rect
                x={index * slot}
                y={0}
                width={slot}
                height={CHART_H}
                fill="transparent"
                onMouseEnter={() => setHovered(index)}
              />
              {height > 0 && (
                <rect
                  x={x}
                  y={CHART_H - height}
                  width={barW}
                  height={height}
                  rx={Math.min(2, barW / 2)}
                  fill={active ? '#86b6ef' : '#3987e5'}
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}

        {/* Selective direct label: the peak only. */}
        {peakIndex >= 0 && (
          <text
            x={Math.min(CHART_W - 24, peakIndex * slot + slot / 2)}
            y={CHART_H - (CHART_H - 8) - 4}
            fontSize={10}
            textAnchor="middle"
            className="fill-slate-400"
          >
            {max}
          </text>
        )}

        <text x={0} y={CHART_H + 14} fontSize={10} className="fill-slate-500">
          52 weeks ago
        </text>
        <text x={CHART_W} y={CHART_H + 14} fontSize={10} textAnchor="end" className="fill-slate-500">
          this week
        </text>
      </svg>

      {hovered !== null && weeks[hovered] && (
        <div
          className="pointer-events-none absolute -top-2 px-2.5 py-1.5 rounded-lg bg-slate-950/95 border border-slate-700 shadow-xl text-[11px] whitespace-nowrap"
          style={{ left: `${Math.min((hovered / weeks.length) * 100, 82)}%` }}
        >
          <span className="text-slate-400">Week of {weeks[hovered].week_start}: </span>
          <span className="font-bold text-slate-100 tabular-nums">
            {weeks[hovered].commits} commit{weeks[hovered].commits === 1 ? '' : 's'}
          </span>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Weekday / hour punchcard
// ---------------------------------------------------------------------------

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface PunchcardProps {
  grid: number[][];
}

/** 7x24 heatmap of commit times, in each author's own timezone. */
export const Punchcard: React.FC<PunchcardProps> = ({ grid }) => {
  const [hovered, setHovered] = useState<{ day: number; hour: number } | null>(null);
  const max = Math.max(1, ...grid.flat());

  return (
    <div>
      <div className="flex gap-2">
        <div className="flex flex-col gap-[3px] pt-[14px]">
          {DAYS.map((day) => (
            <div key={day} className="h-3.5 text-[9px] text-slate-500 leading-[14px] w-7">
              {day}
            </div>
          ))}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex gap-[3px] mb-1">
            {Array.from({ length: 24 }, (_, hour) => (
              <div key={hour} className="flex-1 text-[9px] text-slate-500 text-center">
                {hour % 6 === 0 ? hour : ''}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-[3px]">
            {grid.map((row, day) => (
              <div key={day} className="flex gap-[3px]">
                {row.map((count, hour) => (
                  <div
                    key={hour}
                    className="flex-1 h-3.5 rounded-sm transition-transform hover:scale-110"
                    style={{ backgroundColor: sequentialStep(count / max) }}
                    onMouseEnter={() => setHovered({ day, hour })}
                    onMouseLeave={() => setHovered(null)}
                    title={`${DAYS[day]} ${String(hour).padStart(2, '0')}:00 — ${count} commit${
                      count === 1 ? '' : 's'
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 text-[10px] text-slate-500">
        <span>
          {hovered
            ? `${DAYS[hovered.day]} ${String(hovered.hour).padStart(2, '0')}:00 — ${
                grid[hovered.day][hovered.hour]
              } commits`
            : 'Commit times in each author’s own timezone'}
        </span>
        <span className="flex items-center gap-1">
          less
          {SEQUENTIAL.map((step) => (
            <span key={step} className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: step }} />
          ))}
          more
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Share bars (contributors)
// ---------------------------------------------------------------------------

interface ShareBarProps {
  label: string;
  sublabel?: string;
  value: string;
  share: number;
  accent?: string;
}

export const ShareBar: React.FC<ShareBarProps> = ({
  label,
  sublabel,
  value,
  share,
  accent = NEUTRAL_SERIES,
}) => (
  <div className="space-y-1">
    <div className="flex items-baseline justify-between gap-3 text-[11px]">
      <span className="text-slate-200 font-semibold truncate">{label}</span>
      <span className="text-slate-400 tabular-nums shrink-0">{value}</span>
    </div>
    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.max(share * 100, 1.5)}%`, backgroundColor: accent }}
      />
    </div>
    {sublabel && <div className="text-[10px] text-slate-500 truncate">{sublabel}</div>}
  </div>
);
