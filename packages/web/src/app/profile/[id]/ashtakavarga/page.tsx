'use client';

import { use, useState } from 'react';
import { AlertCircle, Star } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useAshtakavarga } from '@/lib/hooks';
import { PLANET_NAMES, PLANET_COLORS, SIGN_ABBR } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface AshtakavargaPageProps {
  params: Promise<{ id: string }>;
}

const SIGN_NAMES_SHORT = ['Ar', 'Ta', 'Ge', 'Ca', 'Le', 'Vi', 'Li', 'Sc', 'Sa', 'Cp', 'Aq', 'Pi'];

function BinduCell({ value }: { value: number }) {
  const strength =
    value >= 6 ? 'text-emerald-400 bg-emerald-500/10' :
    value >= 4 ? 'text-gold-400 bg-gold-500/5' :
    value >= 2 ? 'text-stone-300' :
    'text-stone-600';

  return (
    <div className={cn(
      'w-8 h-8 flex items-center justify-center text-xs font-mono font-semibold rounded',
      strength,
    )}>
      {value}
    </div>
  );
}

function PlanetBavGrid({
  planet,
  bindus,
}: {
  planet: number;
  bindus: number[];
}) {
  const color = PLANET_COLORS[planet] ?? '#78716C';
  const total = bindus.reduce((a, b) => a + b, 0);

  return (
    <Card padding="sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-semibold" style={{ color }}>
          {PLANET_NAMES[planet]} BAV
        </span>
        <span className="ml-auto text-xs text-stone-500">{total} total bindus</span>
      </div>
      <div className="grid grid-cols-12 gap-1">
        {SIGN_NAMES_SHORT.map((sign, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] text-stone-600">{sign}</span>
            <BinduCell value={bindus[i] ?? 0} />
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function AshtakavargaPage({ params }: AshtakavargaPageProps) {
  const { id } = use(params);
  const { ashtakavarga, isLoading, error } = useAshtakavarga(id);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 bg-cosmic-surface border border-cosmic-border rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-cosmic-surface border border-cosmic-border rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-stone-200 mb-2">Ashtakavarga unavailable</h2>
        <p className="text-stone-500 text-sm">
          {error instanceof Error ? error.message : 'Calculation failed.'}
        </p>
      </div>
    );
  }

  if (!ashtakavarga) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Star className="w-8 h-8 text-stone-700 mb-3" />
        <p className="text-stone-500">No ashtakavarga data yet.</p>
      </div>
    );
  }

  const sav = ashtakavarga.sav;
  const savTotal = sav.reduce((a, b) => a + b, 0);

  // Convert planetBav keys (as strings from JSON) to numbers
  const planetEntries = Object.entries(ashtakavarga.planetBav).map(
    ([k, v]) => [parseInt(k, 10), v] as [number, number[]],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold text-stone-50 mb-1">Ashtakavarga</h2>
        <p className="text-sm text-stone-400">
          Eight-fold benefic point system — 8 contributors per sign, per planet.
        </p>
      </div>

      {/* Sarvashtakavarga (SAV) */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-stone-200">Sarvashtakavarga (SAV)</h3>
          <span className="text-xs text-stone-500">Total: {savTotal} bindus</span>
        </div>
        <div className="grid grid-cols-12 gap-1 mb-2">
          {SIGN_NAMES_SHORT.map((sign, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[9px] text-stone-600">{sign}</span>
              <div className={cn(
                'w-8 h-10 flex items-end justify-center pb-1 relative rounded',
                sav[i]! >= 30 ? 'bg-emerald-500/10' :
                sav[i]! >= 25 ? 'bg-gold-500/5' :
                'bg-cosmic-elevated',
              )}>
                <div
                  className="w-4 rounded-sm transition-all duration-700"
                  style={{
                    height: `${((sav[i] ?? 0) / 40) * 28}px`,
                    backgroundColor:
                      (sav[i] ?? 0) >= 30 ? '#22C55E66' :
                      (sav[i] ?? 0) >= 25 ? '#CA8A0466' :
                      '#44403C',
                  }}
                />
                <span className={cn(
                  'absolute top-1 text-[9px] font-mono',
                  (sav[i] ?? 0) >= 30 ? 'text-emerald-400' :
                  (sav[i] ?? 0) >= 25 ? 'text-gold-400' :
                  'text-stone-500',
                )}>
                  {sav[i] ?? 0}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 text-[10px] text-stone-500 mt-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-emerald-500/40" />
            ≥ 30: Very strong
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-gold-500/40" />
            ≥ 25: Strong
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-stone-600" />
            &lt; 25: Weak
          </div>
        </div>
      </Card>

      {/* Per-planet BAV */}
      <div>
        <h3 className="text-sm font-semibold text-stone-200 mb-3">Per-Planet BAV</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {planetEntries
            .filter(([p]) => p <= 8)
            .sort(([a], [b]) => a - b)
            .map(([planet, bindus]) => (
              <PlanetBavGrid key={planet} planet={planet} bindus={bindus} />
            ))}
        </div>
      </div>
    </div>
  );
}
