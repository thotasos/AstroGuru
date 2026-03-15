'use client';

import { use } from 'react';
import { AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { DashaTimeline } from '@/components/chart/DashaTimeline';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useDashas } from '@/lib/hooks';
import { PLANET_NAMES, PLANET_COLORS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

interface DashasPageProps {
  params: Promise<{ id: string }>;
}

function CurrentDashaCard({
  current,
}: {
  current: NonNullable<ReturnType<typeof useDashas>['dashas']>['current'];
}) {
  const levels = [
    { label: 'Mahadasha', level: current.mahadasha },
    { label: 'Antardasha', level: current.antardasha },
    { label: 'Pratyantardasha', level: current.pratyantardasha },
    { label: 'Sookshma', level: current.sookshma },
    { label: 'Prana', level: current.prana },
  ];

  return (
    <Card padding="lg" className="border-gold-500/20 bg-gold-500/3">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-gold-400" />
        <h3 className="text-sm font-semibold text-gold-400">Current Dasha Period</h3>
        <Badge variant="warning" size="sm">Active Now</Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {levels.map(({ label, level }) => {
          const color = PLANET_COLORS[level.planet] ?? '#78716C';
          return (
            <div
              key={label}
              className="flex flex-col gap-1 p-3 rounded-lg bg-cosmic-elevated border border-cosmic-border"
            >
              <span className="text-[10px] text-stone-500 uppercase tracking-wide font-medium">
                {label}
              </span>
              <span className="text-sm font-semibold" style={{ color }}>
                {PLANET_NAMES[level.planet] ?? '?'}
              </span>
              <span className="text-[10px] text-stone-600 leading-tight">
                until {formatDate(level.endDate)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function DashasPage({ params }: DashasPageProps) {
  const { id } = use(params);
  const { dashas, currentMahadasha, isLoading, error } = useDashas(id);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-cosmic-surface border border-cosmic-border rounded-xl" />
        <div className="h-10 bg-cosmic-surface border border-cosmic-border rounded-xl" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-cosmic-surface border border-cosmic-border rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-stone-200 mb-2">Failed to load dashas</h2>
        <p className="text-stone-500 text-sm mb-6">
          {error instanceof Error ? error.message : 'Dasha calculation unavailable.'}
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold text-stone-50 mb-1">Vimshottari Dasha</h2>
        <p className="text-sm text-stone-400">
          120-year planetary period system based on Moon's nakshatra at birth.
        </p>
      </div>

      {/* Current period */}
      {dashas?.current && <CurrentDashaCard current={dashas.current} />}

      {/* Full timeline */}
      {dashas?.mahadashas && (
        <Card padding="lg">
          <h3 className="text-sm font-semibold text-stone-200 mb-4">Mahadasha Timeline</h3>
          <DashaTimeline
            mahadashas={dashas.mahadashas}
            currentMahadashaPlanet={currentMahadasha?.planet}
          />
        </Card>
      )}
    </div>
  );
}
