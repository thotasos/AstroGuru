'use client';

import {
  PLANET_NAMES,
  PLANET_COLORS,
  SIGN_NAMES,
  NAKSHATRA_NAMES,
} from '@/lib/constants';
import { formatDegreesShort } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { PlanetInChart } from './SouthIndianChart';

interface PlanetWithNakshatra extends PlanetInChart {
  nakshatra?: number;
  nakshatraPada?: number;
  d9Sign?: number;
  speed?: number;
}

interface PlanetTableProps {
  planets: PlanetWithNakshatra[];
  className?: string;
}

function StatusBadge({ planet }: { planet: PlanetWithNakshatra }) {
  if (planet.isExalted) {
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        Exalted
      </span>
    );
  }
  if (planet.isOwnSign) {
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gold-500/10 text-gold-400 border border-gold-500/20">
        Own Sign
      </span>
    );
  }
  if (planet.isDebilitated) {
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
        Debilitated
      </span>
    );
  }
  return null;
}

export function PlanetTable({ planets, className }: PlanetTableProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm min-w-[600px]">
        <thead>
          <tr className="border-b border-cosmic-border">
            {['Planet', 'Sign', 'Degree', 'Nakshatra', 'Pada', 'D9', 'Speed', 'Status'].map((h) => (
              <th
                key={h}
                className="text-left py-2 px-3 text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {planets.map((p, i) => {
            const color = PLANET_COLORS[p.planet] ?? '#FAFAF9';
            const rowBg = p.isExalted
              ? 'bg-emerald-500/5'
              : p.isOwnSign
              ? 'bg-gold-500/5'
              : p.isDebilitated
              ? 'bg-red-500/5'
              : i % 2 === 0
              ? 'bg-transparent'
              : 'bg-cosmic-elevated/30';

            return (
              <tr
                key={p.planet}
                className={cn(
                  rowBg,
                  'border-b border-cosmic-border/50 hover:bg-cosmic-elevated transition-colors duration-100',
                )}
              >
                {/* Planet */}
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span
                      className={cn(
                        'font-medium',
                        p.isRetrograde ? 'italic' : '',
                      )}
                      style={{ color }}
                    >
                      {PLANET_NAMES[p.planet] ?? 'Unknown'}
                    </span>
                    {p.isRetrograde && (
                      <span className="text-[10px] text-red-400 font-medium">(R)</span>
                    )}
                  </div>
                </td>

                {/* Sign */}
                <td className="py-2.5 px-3 text-stone-300 whitespace-nowrap">
                  {SIGN_NAMES[p.sign] ?? '—'}
                </td>

                {/* Degree */}
                <td className="py-2.5 px-3 text-stone-300 font-mono text-xs whitespace-nowrap">
                  {formatDegreesShort(p.degreeInSign)}
                </td>

                {/* Nakshatra */}
                <td className="py-2.5 px-3 text-stone-400 text-xs whitespace-nowrap">
                  {p.nakshatra !== undefined ? NAKSHATRA_NAMES[p.nakshatra] ?? '—' : '—'}
                </td>

                {/* Pada */}
                <td className="py-2.5 px-3 text-stone-400 text-center whitespace-nowrap">
                  {p.nakshatraPada ?? '—'}
                </td>

                {/* D9 Sign */}
                <td className="py-2.5 px-3 text-stone-400 text-xs whitespace-nowrap">
                  {p.d9Sign !== undefined ? SIGN_NAMES[p.d9Sign]?.slice(0, 3) ?? '—' : '—'}
                </td>

                {/* Speed */}
                <td className="py-2.5 px-3 font-mono text-xs whitespace-nowrap">
                  <span className={p.isRetrograde ? 'text-red-400' : 'text-stone-400'}>
                    {p.speed !== undefined ? `${p.speed.toFixed(3)}°/d` : '—'}
                  </span>
                </td>

                {/* Status */}
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <StatusBadge planet={p} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
