'use client';

import React, { use } from 'react';
import { AlertCircle, RefreshCw, Sparkles, Calendar, ChevronRight, ChevronDown, House, Star, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { usePredictions } from '@/lib/hooks';
import { PLANET_NAMES, PLANET_COLORS } from '@/lib/constants';

interface PredictionsPageProps {
  params: Promise<{ id: string }>;
}

const PLANET_NAMES_MAP: Record<number, string> = PLANET_NAMES;
const PLANET_COLORS_MAP: Record<number, string> = PLANET_COLORS;

const HOUSE_NAMES: Record<number, string> = {
  1: '1st House (Self)',
  2: '2nd House (Wealth)',
  3: '3rd House (Siblings)',
  4: '4th House (Home)',
  5: '5th House (Children)',
  6: '6th House (Enemies)',
  7: '7th House (Marriage)',
  8: '8th House (Death)',
  9: '9th House (Fortune)',
  10: '10th House (Career)',
  11: '11th House (Gains)',
  12: '12th House (Loss)',
};

const SIGN_NAMES: Record<number, string> = {
  0: 'Aries',
  1: 'Taurus',
  2: 'Gemini',
  3: 'Cancer',
  4: 'Leo',
  5: 'Virgo',
  6: 'Libra',
  7: 'Scorpio',
  8: 'Sagittarius',
  9: 'Capricorn',
  10: 'Aquarius',
  11: 'Pisces',
};

const LEVEL_LABELS: Record<number, string> = {
  1: 'Mahadasha',
  2: 'Antardasha',
  3: 'Pratyantardasha',
  4: 'Sookshma',
  5: 'Prana',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateRange(start: string, end: string): string {
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function PredictionCard({
  period,
  isExpanded,
  onToggle,
}: {
  period: NonNullable<ReturnType<typeof usePredictions>['predictions']>['periods'][0];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const planetName = PLANET_NAMES_MAP[period.activePlanet] ?? 'Unknown';
  const planetColor = PLANET_COLORS_MAP[period.activePlanet] ?? '#78716C';
  const houseName = HOUSE_NAMES[period.houseAffected] ?? 'Unknown';
  const signName = SIGN_NAMES[period.signPosition] ?? 'Unknown';
  const levelLabel = LEVEL_LABELS[period.level] ?? 'Period';

  const isPast = new Date(period.endDate) < new Date();
  const isCurrent = !isPast && new Date(period.startDate) <= new Date();

  const strengthColors: Record<string, string> = {
    strong: 'text-emerald-400',
    weak: 'text-red-400',
    moderate: 'text-amber-400',
  };
  const strengthColor = strengthColors[period.planetStrength] ?? 'text-stone-400';

  return (
    <div className="border border-cosmic-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-cosmic-surface hover:bg-cosmic-elevated transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold"
            style={{ backgroundColor: `${planetColor}20`, color: planetColor }}
          >
            {planetName.charAt(0)}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-100" style={{ color: planetColor }}>
                {planetName}
              </span>
              <Badge
                variant={isCurrent ? 'active' : isPast ? 'default' : 'warning'}
                size="sm"
              >
                {levelLabel}
              </Badge>
              {period.subPlanet !== undefined && (
                <span className="text-xs text-stone-500">
                  in {PLANET_NAMES_MAP[period.subPlanet]}
                </span>
              )}
            </div>
            <div className="text-xs text-stone-400">
              {formatDateRange(period.startDate, period.endDate)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${strengthColor}`}>
            {period.planetStrength}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-stone-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-stone-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 bg-cosmic-elevated border-t border-cosmic-border animate-fade-in">
          {/* Key info */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-cosmic-surface border border-cosmic-border">
              <div className="flex items-center gap-1.5 mb-1">
                <House className="w-3 h-3 text-stone-500" />
                <span className="text-[10px] text-stone-500 uppercase">House</span>
              </div>
              <span className="text-sm font-medium text-stone-200">{houseName}</span>
            </div>
            <div className="p-3 rounded-lg bg-cosmic-surface border border-cosmic-border">
              <div className="flex items-center gap-1.5 mb-1">
                <Star className="w-3 h-3 text-stone-500" />
                <span className="text-[10px] text-stone-500 uppercase">Sign</span>
              </div>
              <span className="text-sm font-medium text-stone-200">{signName}</span>
            </div>
          </div>

          {/* Key influences */}
          {period.keyInfluences.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
                Key Influences
              </h4>
              <ul className="space-y-1">
                {period.keyInfluences.map((influence, idx) => (
                  <li key={idx} className="text-sm text-stone-300 flex items-start gap-2">
                    <span className="text-gold-400">•</span>
                    {influence}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Active yogas */}
          {period.activeYogas.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
                Active Yogas
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {period.activeYogas.map((yoga, idx) => (
                  <Badge key={idx} variant="default" size="sm">
                    {yoga}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div>
            <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">
              Prediction
            </h4>
            <p className="text-sm text-stone-300 leading-relaxed whitespace-pre-line">
              {period.summary}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineBar({
  periods,
  currentPeriodId,
}: {
  periods: NonNullable<ReturnType<typeof usePredictions>['mahadashaPeriods']>;
  currentPeriodId?: string;
}) {
  if (periods.length === 0) return null;

  const now = new Date().getTime();
  const start = new Date(periods[0].startDate).getTime();
  const end = new Date(periods[periods.length - 1].endDate).getTime();
  const total = end - start;

  return (
    <div className="relative h-8 bg-cosmic-surface rounded-lg overflow-hidden flex">
      {periods.map((period) => {
        const periodStart = new Date(period.startDate).getTime();
        const periodEnd = new Date(period.endDate).getTime();
        const left = ((periodStart - start) / total) * 100;
        const width = Math.max(0.5, ((periodEnd - periodStart) / total) * 100);
        const planetColor = PLANET_COLORS_MAP[period.activePlanet] ?? '#78716C';
        const isCurrent = period.id === currentPeriodId;

        return (
          <div
            key={period.id}
            className="absolute h-full border-r border-cosmic-bg transition-all hover:opacity-80"
            style={{
              left: `${left}%`,
              width: `${width}%`,
              backgroundColor: `${planetColor}40`,
              borderLeft: isCurrent ? '2px solid currentColor' : 'none',
            }}
            title={`${PLANET_NAMES_MAP[period.activePlanet]} - ${formatDateRange(period.startDate, period.endDate)}`}
          />
        );
      })}
      {/* Current time indicator */}
      {now > start && now < end && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
          style={{ left: `${((now - start) / total) * 100}%` }}
        />
      )}
    </div>
  );
}

export default function PredictionsPage({ params }: PredictionsPageProps) {
  const { id } = use(params);
  const { predictions, currentPeriod, isLoading, error } = usePredictions(id);

  const [expandedPeriods, setExpandedPeriods] = React.useState<Set<string>>(new Set());
  const [selectedLevel, setSelectedLevel] = React.useState<1 | 2 | 3 | 4 | 5>(1);

  const togglePeriod = (id: string) => {
    setExpandedPeriods((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-cosmic-surface border border-cosmic-border rounded-xl" />
        <div className="h-10 bg-cosmic-surface border border-cosmic-border rounded-xl" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-cosmic-surface border border-cosmic-border rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-stone-200 mb-2">Failed to load predictions</h2>
        <p className="text-stone-500 text-sm mb-6">
          {error instanceof Error ? error.message : 'Prediction calculation unavailable.'}
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

  const filteredPeriods = predictions?.periods.filter((p) => p.level === selectedLevel) ?? [];
  const currentPeriodId = currentPeriod?.id;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold text-stone-50 mb-1">Predictions</h2>
        <p className="text-sm text-stone-400">
          Plain English astrological predictions based on Vimshottari Dasha periods.
        </p>
      </div>

      {/* Timeline overview */}
      {predictions?.periods && predictions.periods.length > 0 && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-gold-400" />
            <span className="text-sm font-semibold text-stone-200">120-Year Timeline</span>
          </div>
          <TimelineBar
            periods={predictions.periods.filter((p) => p.level === 1)}
            currentPeriodId={currentPeriodId}
          />
          <div className="flex justify-between mt-2 text-xs text-stone-500">
            <span>{predictions.startDate}</span>
            <span>{predictions.endDate}</span>
          </div>
        </Card>
      )}

      {/* Level selector */}
      <div className="flex gap-2">
        {([1, 2, 3] as const).map((level) => (
          <Button
            key={level}
            variant={selectedLevel === level ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSelectedLevel(level)}
          >
            {LEVEL_LABELS[level]}
          </Button>
        ))}
      </div>

      {/* Current period highlight */}
      {currentPeriod && selectedLevel === 1 && (
        <Card padding="lg" className="border-gold-500/20 bg-gold-500/3">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-gold-400" />
            <h3 className="text-sm font-semibold text-gold-400">Current Period</h3>
            <Badge variant="warning" size="sm">Active Now</Badge>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-semibold"
              style={{
                backgroundColor: `${PLANET_COLORS_MAP[currentPeriod.activePlanet]}20`,
                color: PLANET_COLORS_MAP[currentPeriod.activePlanet],
              }}
            >
              {PLANET_NAMES_MAP[currentPeriod.activePlanet].charAt(0)}
            </div>
            <div>
              <span className="text-lg font-semibold" style={{ color: PLANET_COLORS_MAP[currentPeriod.activePlanet] }}>
                {PLANET_NAMES_MAP[currentPeriod.activePlanet]}
              </span>
              <span className="text-stone-400 text-sm ml-2">Mahadasha</span>
              <div className="text-xs text-stone-500">
                {formatDateRange(currentPeriod.startDate, currentPeriod.endDate)}
              </div>
            </div>
          </div>
          <p className="text-sm text-stone-300 leading-relaxed">
            {currentPeriod.summary.slice(0, 300)}...
          </p>
        </Card>
      )}

      {/* Period list */}
      <div className="space-y-3">
        {filteredPeriods.length === 0 ? (
          <Card padding="lg" className="text-center">
            <p className="text-stone-400">No prediction periods found for the selected level.</p>
          </Card>
        ) : (
          filteredPeriods.map((period) => (
            <PredictionCard
              key={period.id}
              period={period}
              isExpanded={expandedPeriods.has(period.id)}
              onToggle={() => togglePeriod(period.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
