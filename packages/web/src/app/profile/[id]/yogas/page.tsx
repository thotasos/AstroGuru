'use client';

import { use, useState } from 'react';
import { AlertCircle, Filter, Zap } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useYogas } from '@/lib/hooks';
import { PLANET_NAMES } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface YogasPageProps {
  params: Promise<{ id: string }>;
}

const CATEGORIES = ['All', 'Mahapurusha', 'Raja', 'Dhana', 'Nabhasa', 'Lunar', 'Other'];

function StrengthBar({ strength }: { strength: number }) {
  const pct = Math.round(strength * 100);
  const color =
    pct >= 75 ? '#22C55E' :
    pct >= 50 ? '#CA8A04' :
    pct >= 25 ? '#F59E0B' :
    '#78716C';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-cosmic-elevated rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-stone-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

function YogaCard({ yoga }: { yoga: ReturnType<typeof useYogas>['yogas'][number] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className={cn(
        'transition-all duration-200 cursor-pointer',
        yoga.isPresent
          ? 'border-cosmic-border hover:border-stone-600'
          : 'opacity-50 border-cosmic-border/50 hover:opacity-70',
      )}
      onClick={() => setExpanded((e) => !e)}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-2 h-2 rounded-full mt-1.5 shrink-0',
          yoga.isPresent ? 'bg-gold-400' : 'bg-stone-600',
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={cn(
                'text-sm font-semibold',
                yoga.isPresent ? 'text-stone-50' : 'text-stone-500',
              )}>
                {yoga.name}
              </h4>
              <Badge
                variant={yoga.isPresent ? 'active' : 'inactive'}
                size="sm"
              >
                {yoga.isPresent ? 'Present' : 'Absent'}
              </Badge>
              <Badge variant="default" size="sm">{yoga.category}</Badge>
            </div>
          </div>

          {yoga.isPresent && (
            <div className="mt-2">
              <StrengthBar strength={yoga.strength} />
            </div>
          )}

          {expanded && (
            <div className="mt-3 space-y-2 animate-slide-up">
              <p className="text-xs text-stone-400 leading-relaxed">{yoga.description}</p>

              {yoga.planets.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-stone-500">Planets:</span>
                  {yoga.planets.map((p) => (
                    <span key={p} className="text-xs text-stone-300 bg-cosmic-elevated px-1.5 py-0.5 rounded">
                      {PLANET_NAMES[p] ?? '?'}
                    </span>
                  ))}
                </div>
              )}

              {yoga.houses.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-stone-500">Houses:</span>
                  {yoga.houses.map((h) => (
                    <span key={h} className="text-xs text-stone-300 bg-cosmic-elevated px-1.5 py-0.5 rounded">
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <span className="text-xs text-stone-600 shrink-0 mt-0.5">
          {expanded ? '▲' : '▼'}
        </span>
      </div>
    </Card>
  );
}

export default function YogasPage({ params }: YogasPageProps) {
  const { id } = use(params);
  const { yogas, activeYogas, inactiveYogas, isLoading, error } = useYogas(id);
  const [category, setCategory] = useState('All');
  const [showInactive, setShowInactive] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-cosmic-surface border border-cosmic-border rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-stone-200 mb-2">Failed to load yogas</h2>
        <p className="text-stone-500 text-sm">
          {error instanceof Error ? error.message : 'Yoga calculation unavailable.'}
        </p>
      </div>
    );
  }

  const filtered = (showInactive ? yogas : activeYogas).filter(
    (y) => category === 'All' || y.category === category,
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-50 mb-1">
            Yogas
            <span className="ml-2 text-sm font-normal text-gold-400">
              {activeYogas.length} active
            </span>
          </h2>
          <p className="text-sm text-stone-400">
            Planetary combinations based on Parashari principles.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowInactive((s) => !s)}
          leftIcon={<Filter className="w-3.5 h-3.5" />}
        >
          {showInactive ? 'Active only' : 'Show all'}
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 cursor-pointer',
              category === cat
                ? 'bg-gold-500/15 border-gold-500/40 text-gold-400'
                : 'border-cosmic-border text-stone-400 hover:border-stone-500 hover:text-stone-200',
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Yoga list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Zap className="w-8 h-8 text-stone-700 mb-3" />
          <p className="text-stone-500 text-sm">No {showInactive ? '' : 'active '}yogas in this category.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((yoga) => (
            <YogaCard key={yoga.name} yoga={yoga} />
          ))}
        </div>
      )}
    </div>
  );
}
