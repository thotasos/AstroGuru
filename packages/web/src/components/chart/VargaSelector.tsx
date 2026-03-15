'use client';

import { VARGAS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

interface VargaSelectorProps {
  selected: string;
  onSelect: (varga: string) => void;
  className?: string;
}

const PINNED = ['D1', 'D9'];

export function VargaSelector({ selected, onSelect, className }: VargaSelectorProps) {
  const pinned = VARGAS.filter((v) => PINNED.includes(v.id));
  const rest = VARGAS.filter((v) => !PINNED.includes(v.id));

  return (
    <div className={cn('space-y-2', className)}>
      {/* Pinned favorites */}
      <div className="flex items-center gap-1.5 mb-1">
        <Star className="w-3 h-3 text-gold-500" />
        <span className="text-xs text-stone-500 uppercase tracking-wide font-medium">Favorites</span>
      </div>
      <div className="flex gap-2 mb-3 flex-wrap">
        {pinned.map((v) => (
          <VargaChip
            key={v.id}
            varga={v}
            selected={selected === v.id}
            onSelect={onSelect}
            pinned
          />
        ))}
      </div>

      {/* All vargas */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs text-stone-500 uppercase tracking-wide font-medium">All Divisional Charts</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {rest.map((v) => (
          <VargaChip
            key={v.id}
            varga={v}
            selected={selected === v.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

interface VargaChipProps {
  varga: (typeof VARGAS)[number];
  selected: boolean;
  onSelect: (id: string) => void;
  pinned?: boolean;
}

function VargaChip({ varga, selected, onSelect, pinned = false }: VargaChipProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(varga.id)}
      title={varga.description}
      className={cn(
        'px-3 py-1.5 rounded-lg text-xs font-medium',
        'transition-all duration-150 cursor-pointer border',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500',
        selected
          ? 'bg-gold-500/15 border-gold-500/40 text-gold-400'
          : 'bg-cosmic-elevated border-cosmic-border text-stone-400 hover:border-stone-500 hover:text-stone-200',
        pinned && !selected && 'border-gold-500/20 text-stone-300',
      )}
    >
      {varga.id}
    </button>
  );
}
