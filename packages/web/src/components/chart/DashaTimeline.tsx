'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { PLANET_NAMES, PLANET_COLORS, DASHA_YEARS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { MahadashaGroup } from '@/lib/api';

// ============================================================
// Types
// ============================================================

interface DashaTimelineProps {
  mahadashas: MahadashaGroup[];
  currentMahadashaPlanet?: number;
  className?: string;
}

// ============================================================
// Helpers
// ============================================================

const TOTAL_DASHA_YEARS = Object.values(DASHA_YEARS).reduce((a, b) => a + b, 0); // 120

function durationYears(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / (365.25 * 24 * 3600 * 1000);
}

function isCurrent(start: string, end: string): boolean {
  const now = Date.now();
  return new Date(start).getTime() <= now && new Date(end).getTime() > now;
}

function todayPosition(mahadashas: MahadashaGroup[]): number {
  if (!mahadashas.length) return 0;
  const first = new Date(mahadashas[0]!.startDate).getTime();
  const last = new Date(mahadashas[mahadashas.length - 1]!.endDate).getTime();
  const now = Date.now();
  if (now < first || now > last) return -1;
  return ((now - first) / (last - first)) * 100;
}

// ============================================================
// Antardasha row
// ============================================================

function AntardashaList({ antardashas }: { antardashas: MahadashaGroup['antardashas'] }) {
  return (
    <div className="mt-2 ml-4 space-y-1 border-l-2 border-cosmic-border pl-4 pb-1">
      {antardashas.map((ad, i) => {
        const current = isCurrent(ad.startDate, ad.endDate);
        const color = PLANET_COLORS[ad.planet] ?? '#FAFAF9';

        return (
          <div
            key={i}
            className={cn(
              'flex items-center gap-3 py-1.5 px-2 rounded-lg text-xs transition-colors duration-100',
              current ? 'bg-gold-500/10 border border-gold-500/20' : 'hover:bg-cosmic-elevated',
            )}
          >
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="font-medium" style={{ color: current ? '#CA8A04' : color }}>
              {PLANET_NAMES[ad.planet] ?? '?'}
            </span>
            <span className="text-stone-500 flex-1 text-right">
              {formatDate(ad.startDate)} – {formatDate(ad.endDate)}
            </span>
            {current && (
              <span className="text-gold-400 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gold-500/10 border border-gold-500/20">
                NOW
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Main component
// ============================================================

export function DashaTimeline({
  mahadashas,
  currentMahadashaPlanet,
  className,
}: DashaTimelineProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (!mahadashas.length) {
    return (
      <div className="text-center py-10 text-stone-500 text-sm">
        No dasha data available.
      </div>
    );
  }

  const todayPct = todayPosition(mahadashas);

  // Total span
  const firstDate = new Date(mahadashas[0]!.startDate).getTime();
  const lastDate = new Date(mahadashas[mahadashas.length - 1]!.endDate).getTime();
  const totalMs = lastDate - firstDate;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Visual bar timeline */}
      <div className="relative overflow-x-auto pb-2">
        <div className="flex h-10 min-w-[600px] rounded-lg overflow-hidden border border-cosmic-border relative">
          {mahadashas.map((md, i) => {
            const durationMs = new Date(md.endDate).getTime() - new Date(md.startDate).getTime();
            const widthPct = (durationMs / totalMs) * 100;
            const current = isCurrent(md.startDate, md.endDate);
            const color = PLANET_COLORS[md.planet] ?? '#78716C';

            return (
              <button
                key={i}
                type="button"
                onClick={() => setExpanded(expanded === i ? null : i)}
                title={`${PLANET_NAMES[md.planet]} Mahadasha\n${formatDate(md.startDate)} – ${formatDate(md.endDate)}`}
                className={cn(
                  'h-full flex items-center justify-center text-[10px] font-semibold cursor-pointer',
                  'transition-all duration-150 border-r border-black/30 last:border-0',
                  'hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50',
                )}
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: current
                    ? `${color}40`
                    : `${color}1A`,
                  color: current ? color : `${color}99`,
                  boxShadow: current ? `inset 0 0 0 1.5px ${color}60` : 'none',
                  minWidth: '20px',
                }}
              >
                {widthPct > 4 ? (PLANET_NAMES[md.planet]?.slice(0, 3) ?? '?') : ''}
              </button>
            );
          })}

          {/* Today marker */}
          {todayPct >= 0 && todayPct <= 100 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-gold-400 z-10 pointer-events-none"
              style={{ left: `${todayPct}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gold-400" />
              <div className="absolute top-10 left-1/2 -translate-x-1/2 text-[9px] text-gold-400 font-semibold whitespace-nowrap">
                Today
              </div>
            </div>
          )}
        </div>
      </div>

      {/* List view */}
      <div className="space-y-1">
        {mahadashas.map((md, i) => {
          const current = isCurrent(md.startDate, md.endDate);
          const isExpanded = expanded === i;
          const color = PLANET_COLORS[md.planet] ?? '#78716C';
          const years = durationYears(md.startDate, md.endDate);

          return (
            <div key={i} className="rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : i)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left',
                  'transition-all duration-150 cursor-pointer',
                  current
                    ? 'bg-gold-500/10 border border-gold-500/20 rounded-xl'
                    : 'hover:bg-cosmic-elevated border border-transparent rounded-xl',
                )}
              >
                {/* Planet color dot */}
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />

                {/* Planet name */}
                <span
                  className="font-semibold text-sm min-w-[80px]"
                  style={{ color: current ? '#CA8A04' : color }}
                >
                  {PLANET_NAMES[md.planet] ?? '?'} Mahadasha
                </span>

                {/* Dates */}
                <span className="text-xs text-stone-500 flex-1">
                  {formatDate(md.startDate)} – {formatDate(md.endDate)}
                </span>

                {/* Duration */}
                <span className="text-xs text-stone-500 min-w-[40px] text-right">
                  {years.toFixed(1)}y
                </span>

                {/* Current badge */}
                {current && (
                  <span className="text-gold-400 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gold-500/10 border border-gold-500/20 shrink-0">
                    ACTIVE
                  </span>
                )}

                {/* Expand chevron */}
                {md.antardashas.length > 0 && (
                  <span className="text-stone-500 shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </span>
                )}
              </button>

              {/* Antardasha expansion */}
              {isExpanded && md.antardashas.length > 0 && (
                <AntardashaList antardashas={md.antardashas} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
