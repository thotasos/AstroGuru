'use client';

import { use, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { SouthIndianChart, type ChartDisplayData } from '@/components/chart/SouthIndianChart';
import { Card } from '@/components/ui/Card';
import { useChart } from '@/lib/hooks';
import { VARGAS } from '@/lib/constants';
import { cn } from '@/lib/utils';

// ============================================================
// Adapter (same as chart page)
// ============================================================

function adaptChart(raw: unknown): ChartDisplayData {
  const data = raw as Record<string, unknown> | null;
  if (!data) return { ascendantSign: 0, planets: [] };

  const ascendant = (data['ascendant'] as number | undefined) ?? 0;
  const rawPlanets = (data['planets'] as unknown[]) ?? [];

  return {
    ascendantSign: Math.floor(ascendant / 30),
    planets: rawPlanets.map((p) => {
      const pl = p as Record<string, unknown>;
      return {
        planet: pl['planet'] as number,
        sign: pl['sign'] as number,
        degreeInSign: pl['degreeInSign'] as number,
        isRetrograde: (pl['isRetrograde'] as boolean | undefined) ?? false,
      };
    }),
    ayanamsa: data['ayanamsa'] as number | undefined,
    ayanamsaType: data['ayanamsaType'] as string | undefined,
  };
}

// ============================================================
// Mini chart wrapper
// ============================================================

function MiniVargaChart({ profileId, varga }: { profileId: string; varga: string }) {
  const { chart, isLoading, error } = useChart(profileId, varga);

  if (isLoading) {
    return (
      <div className="w-full aspect-square bg-cosmic-elevated rounded-lg animate-pulse" />
    );
  }

  if (error) {
    return (
      <div className="w-full aspect-square flex items-center justify-center bg-cosmic-elevated rounded-lg">
        <AlertCircle className="w-5 h-5 text-red-400/50" />
      </div>
    );
  }

  return (
    <SouthIndianChart
      chart={adaptChart(chart)}
      size={200}
      showDegrees={false}
      className="rounded-lg w-full h-auto"
    />
  );
}

// ============================================================
// Page
// ============================================================

interface VargasPageProps {
  params: Promise<{ id: string }>;
}

export default function VargasPage({ params }: VargasPageProps) {
  const { id } = use(params);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold text-stone-50 mb-1">Divisional Charts</h2>
        <p className="text-sm text-stone-400">
          All 16 Shodashavargas — click any chart to expand.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {VARGAS.map((v) => (
          <Card
            key={v.id}
            padding="sm"
            hoverable
            onClick={() => setSelected(selected === v.id ? null : v.id)}
            className={cn(
              'cursor-pointer transition-all duration-200',
              selected === v.id
                ? 'border-gold-500/40 bg-gold-500/5'
                : 'hover:border-stone-600',
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={cn(
                'text-xs font-bold',
                selected === v.id ? 'text-gold-400' : 'text-stone-300',
              )}>
                {v.id}
              </span>
            </div>
            <MiniVargaChart profileId={id} varga={v.id} />
            <p className="text-[10px] text-stone-500 mt-1.5 leading-tight truncate">
              {v.description}
            </p>
          </Card>
        ))}
      </div>

      {/* Expanded view */}
      {selected && (
        <Card padding="lg" className="border-gold-500/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-gold-400">
                {VARGAS.find((v) => v.id === selected)?.label}
              </h3>
              <p className="text-sm text-stone-400">
                {VARGAS.find((v) => v.id === selected)?.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
            >
              Close ×
            </button>
          </div>
          <div className="flex justify-center">
            <ExpandedVargaChart profileId={id} varga={selected} />
          </div>
        </Card>
      )}
    </div>
  );
}

function ExpandedVargaChart({ profileId, varga }: { profileId: string; varga: string }) {
  const { chart, isLoading, error } = useChart(profileId, varga);

  if (isLoading) {
    return <div className="w-[480px] h-[480px] bg-cosmic-elevated rounded-xl animate-pulse" />;
  }
  if (error) {
    return (
      <div className="w-[480px] h-[480px] flex items-center justify-center bg-cosmic-elevated rounded-xl">
        <AlertCircle className="w-8 h-8 text-red-400/50" />
      </div>
    );
  }

  return (
    <SouthIndianChart
      chart={adaptChart(chart)}
      size={480}
      showDegrees={true}
      className="rounded-xl"
    />
  );
}
