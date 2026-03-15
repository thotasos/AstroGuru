'use client';

import { use } from 'react';
import { AlertCircle, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useShadbala } from '@/lib/hooks';
import { PLANET_NAMES, PLANET_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface StrengthsPageProps {
  params: Promise<{ id: string }>;
}

const BALAS = [
  { key: 'sthanabala', label: 'Sthanabala', desc: 'Positional' },
  { key: 'digbala', label: 'Digbala', desc: 'Directional' },
  { key: 'kalabala', label: 'Kalabala', desc: 'Temporal' },
  { key: 'chestabala', label: 'Chestabala', desc: 'Motional' },
  { key: 'naisargikabala', label: 'Naisargika', desc: 'Natural' },
  { key: 'drigbala', label: 'Drigbala', desc: 'Aspectual' },
] as const;

// Approximate required minimums for Rupas
const REQUIRED_RUPAS: Record<number, number> = {
  0: 6.5,  // Sun
  1: 6.0,  // Moon
  2: 5.0,  // Mars
  3: 7.0,  // Mercury
  4: 6.5,  // Jupiter
  5: 5.5,  // Venus
  6: 5.0,  // Saturn
};

function ShadbalaBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="h-1.5 bg-cosmic-elevated rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function StrengthsPage({ params }: StrengthsPageProps) {
  const { id } = use(params);
  const { shadbala, isLoading, error } = useShadbala(id);

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-24 bg-cosmic-surface border border-cosmic-border rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-stone-200 mb-2">Shadbala unavailable</h2>
        <p className="text-stone-500 text-sm">
          {error instanceof Error ? error.message : 'Strength calculation failed.'}
        </p>
      </div>
    );
  }

  if (!shadbala.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BarChart3 className="w-8 h-8 text-stone-700 mb-3" />
        <p className="text-stone-500">No shadbala data yet.</p>
      </div>
    );
  }

  // Find max total for proportional bars
  const maxTotal = Math.max(...shadbala.map((s) => s.total));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold text-stone-50 mb-1">Shadbala — Six-fold Strength</h2>
        <p className="text-sm text-stone-400">
          Virupas of positional, directional, temporal, motional, natural, and aspectual strength.
        </p>
      </div>

      {/* Overview bar chart */}
      <Card padding="lg">
        <h3 className="text-sm font-semibold text-stone-200 mb-4">Total Shadbala (Rupas)</h3>
        <div className="space-y-3">
          {shadbala
            .filter((s) => s.planet <= 6) // Skip Rahu/Ketu — no shadbala
            .sort((a, b) => b.totalRupas - a.totalRupas)
            .map((s) => {
              const color = PLANET_COLORS[s.planet] ?? '#78716C';
              const required = REQUIRED_RUPAS[s.planet] ?? 5;
              const isStrong = s.totalRupas >= required;

              return (
                <div key={s.planet} className="flex items-center gap-3">
                  <span
                    className="text-xs font-semibold w-16 text-right shrink-0"
                    style={{ color }}
                  >
                    {PLANET_NAMES[s.planet]}
                  </span>
                  <div className="flex-1 h-5 bg-cosmic-elevated rounded-md overflow-hidden relative">
                    <div
                      className="h-full rounded-md transition-all duration-700 flex items-center justify-end pr-2"
                      style={{
                        width: `${(s.totalRupas / 10) * 100}%`,
                        backgroundColor: `${color}30`,
                        borderRight: `2px solid ${color}60`,
                      }}
                    >
                      <span className="text-[10px] font-mono" style={{ color }}>
                        {s.totalRupas.toFixed(2)}
                      </span>
                    </div>
                    {/* Required minimum marker */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-stone-500/40"
                      style={{ left: `${(required / 10) * 100}%` }}
                      title={`Required: ${required} Rupas`}
                    />
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium w-12 shrink-0',
                    isStrong ? 'text-emerald-400' : 'text-red-400',
                  )}>
                    {isStrong ? 'Strong' : 'Weak'}
                  </span>
                </div>
              );
            })}
        </div>
      </Card>

      {/* Detailed breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {shadbala
          .filter((s) => s.planet <= 6)
          .map((s) => {
            const color = PLANET_COLORS[s.planet] ?? '#78716C';
            const maxBalaVal = Math.max(...BALAS.map((b) => s[b.key]));

            return (
              <Card key={s.planet} className="hover:border-stone-600 transition-colors duration-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-sm font-semibold" style={{ color }}>
                    {PLANET_NAMES[s.planet]}
                  </span>
                  <span className="ml-auto text-xs text-stone-500">
                    {s.totalRupas.toFixed(2)} Rp
                  </span>
                </div>

                <div className="space-y-2">
                  {BALAS.map((bala) => (
                    <div key={bala.key}>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-stone-500">{bala.label}</span>
                        <span className="text-stone-400 font-mono">
                          {s[bala.key].toFixed(1)}
                        </span>
                      </div>
                      <ShadbalaBar
                        value={s[bala.key]}
                        max={maxBalaVal || 1}
                        color={color}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-cosmic-border grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-stone-500 block">Ishta Phala</span>
                    <span className="text-emerald-400 font-mono">{s.ishtaPhala.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Kashta Phala</span>
                    <span className="text-red-400 font-mono">{s.kashtaPhala.toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
