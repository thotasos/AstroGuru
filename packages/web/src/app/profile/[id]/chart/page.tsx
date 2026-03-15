'use client';

import { use, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { SouthIndianChart, type ChartDisplayData } from '@/components/chart/SouthIndianChart';
import { VargaSelector } from '@/components/chart/VargaSelector';
import { PlanetTable } from '@/components/chart/PlanetTable';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useProfile, useChart } from '@/lib/hooks';

// ============================================================
// Chart data adapters
// ============================================================

function adaptChartData(raw: unknown, profile: { name: string; dateOfBirth: string } | undefined): ChartDisplayData {
  const data = raw as Record<string, unknown> | null;

  if (!data) {
    return {
      ascendantSign: 0,
      planets: [],
      name: profile?.name,
      dateOfBirth: profile?.dateOfBirth,
    };
  }

  const ascendant = (data['ascendant'] as number | undefined) ?? 0;
  const ascendantSign = Math.floor(ascendant / 30);
  const ayanamsa = (data['ayanamsa'] as number | undefined);
  const ayanamsaType = (data['ayanamsaType'] as string | undefined);

  const rawPlanets = (data['planets'] as unknown[]) ?? [];

  const planets = rawPlanets.map((p) => {
    const planet = p as Record<string, unknown>;
    return {
      planet: planet['planet'] as number,
      sign: planet['sign'] as number,
      degreeInSign: planet['degreeInSign'] as number,
      isRetrograde: (planet['isRetrograde'] as boolean | undefined) ?? false,
      nakshatra: planet['nakshatra'] as number | undefined,
      nakshatraPada: planet['nakshatraPada'] as number | undefined,
      speed: planet['speed'] as number | undefined,
    };
  });

  return {
    ascendantSign,
    planets,
    name: profile?.name,
    dateOfBirth: profile?.dateOfBirth,
    ayanamsa,
    ayanamsaType,
  };
}

// ============================================================
// Loading skeleton
// ============================================================

function ChartSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-pulse">
      <div className="shrink-0">
        <div className="w-[480px] h-[480px] bg-cosmic-surface border border-cosmic-border rounded-xl" />
      </div>
      <div className="flex-1 space-y-4">
        <div className="h-5 bg-cosmic-elevated rounded w-1/3" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="h-10 bg-cosmic-elevated rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Page
// ============================================================

interface ChartPageProps {
  params: Promise<{ id: string }>;
}

export default function ChartPage({ params }: ChartPageProps) {
  const { id } = use(params);
  const [selectedVarga, setSelectedVarga] = useState('D1');
  const { profile } = useProfile(id);
  const { chart, isLoading, error } = useChart(id, selectedVarga);

  if (isLoading) return <ChartSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-stone-200 mb-2">Chart calculation failed</h2>
        <p className="text-stone-500 text-sm mb-6 max-w-sm">
          {error instanceof Error ? error.message : 'Unable to load chart data. Ensure the API server is running.'}
        </p>
        <Button
          variant="secondary"
          onClick={() => window.location.reload()}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Retry
        </Button>
      </div>
    );
  }

  const chartData = adaptChartData(chart, profile);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Varga selector */}
      <Card>
        <VargaSelector selected={selectedVarga} onSelect={setSelectedVarga} />
      </Card>

      {/* Chart + Planet Table */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* SVG Chart */}
        <div className="shrink-0 flex flex-col items-center">
          <div className="relative">
            <SouthIndianChart
              chart={chartData}
              size={480}
              showDegrees={true}
              className="rounded-xl overflow-hidden"
            />
            {selectedVarga !== 'D1' && (
              <div className="absolute top-2 right-2">
                <span className="px-2 py-1 rounded-lg text-xs font-bold bg-gold-500 text-stone-950">
                  {selectedVarga}
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-2">
            South Indian Style · {chartData.ayanamsaType ?? 'Lahiri'} Ayanamsa
          </p>
        </div>

        {/* Planet Table */}
        <div className="flex-1 min-w-0">
          <Card padding="none">
            <div className="px-4 py-3 border-b border-cosmic-border">
              <h3 className="text-sm font-semibold text-stone-200">
                Planetary Positions
                {selectedVarga !== 'D1' && (
                  <span className="ml-2 text-xs text-gold-400">({selectedVarga})</span>
                )}
              </h3>
            </div>
            <PlanetTable planets={chartData.planets} />
          </Card>
        </div>
      </div>

      {/* Chart info footer */}
      {chartData.ayanamsa !== undefined && (
        <Card className="text-xs text-stone-500 flex items-center gap-6 flex-wrap">
          <span>
            Ayanamsa: <span className="text-stone-300">{chartData.ayanamsaType}</span>{' '}
            {chartData.ayanamsa.toFixed(6)}°
          </span>
          <span>
            Ascendant sign:{' '}
            <span className="text-stone-300">
              {['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][chartData.ascendantSign]}
            </span>
          </span>
        </Card>
      )}
    </div>
  );
}
