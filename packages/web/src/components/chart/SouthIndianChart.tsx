'use client';

import { SI_GRID, SIGN_ABBR, PLANET_ABBR, PLANET_COLORS } from '@/lib/constants';
import { formatDegreesShort } from '@/lib/utils';

// ============================================================
// Types
// ============================================================

export interface PlanetInChart {
  planet: number;       // Planet enum value
  sign: number;         // Sign 0-11
  degreeInSign: number; // 0-30
  isRetrograde: boolean;
  isExalted?: boolean;
  isOwnSign?: boolean;
  isDebilitated?: boolean;
}

export interface ChartDisplayData {
  ascendantSign: number; // Sign 0-11 (derived from ascendant longitude / 30)
  planets: PlanetInChart[];
  name?: string;
  dateOfBirth?: string;
  ayanamsa?: number;
  ayanamsaType?: string;
}

interface SouthIndianChartProps {
  chart: ChartDisplayData;
  size?: number;
  showDegrees?: boolean;
  className?: string;
}

// ============================================================
// Constants
// ============================================================

const CELL_COUNT = 4;
const CENTER_CELLS = new Set(['1,1', '1,2', '2,1', '2,2']);
const BORDER_COLOR = '#44403C';
const SURFACE_COLOR = '#1C1917';
const ELEVATED_COLOR = '#1F1C1A';
const TEXT_MUTED = '#78716C';
const TEXT_PRIMARY = '#FAFAF9';
const GOLD = '#CA8A04';
const RED = '#EF4444';

// ============================================================
// Helpers
// ============================================================

function getPlanetsInSign(planets: PlanetInChart[], sign: number): PlanetInChart[] {
  return planets.filter((p) => p.sign === sign);
}

function planetText(p: PlanetInChart, showDeg: boolean): string {
  const abbr = PLANET_ABBR[p.planet] ?? '?';
  const deg = showDeg ? ` ${formatDegreesShort(p.degreeInSign)}` : '';
  const retro = p.isRetrograde ? '(R)' : '';
  return `${abbr}${deg}${retro}`;
}

function planetFill(p: PlanetInChart): string {
  if (p.isExalted) return '#22C55E';
  if (p.isOwnSign) return GOLD;
  if (p.isDebilitated) return RED;
  return PLANET_COLORS[p.planet] ?? TEXT_PRIMARY;
}

// ============================================================
// SVG Chart Component
// ============================================================

export function SouthIndianChart({
  chart,
  size = 480,
  showDegrees = true,
  className,
}: SouthIndianChartProps) {
  const cellSize = size / CELL_COUNT;
  const padding = 8;
  const fontSize = Math.max(8, Math.round(cellSize * 0.11));
  const signFontSize = Math.max(7, Math.round(cellSize * 0.095));
  const lagnaFontSize = Math.max(7, Math.round(cellSize * 0.1));

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={`south-indian-chart select-none ${className ?? ''}`}
      aria-label="South Indian natal chart"
    >
      {/* Background */}
      <rect width={size} height={size} fill={SURFACE_COLOR} rx="4" />

      {/* Grid cells */}
      {SI_GRID.map((row, rowIdx) =>
        row.map((signNum, colIdx) => {
          const x = colIdx * cellSize;
          const y = rowIdx * cellSize;
          const cellKey = `${rowIdx},${colIdx}`;
          const isCenter = CENTER_CELLS.has(cellKey);

          if (isCenter) return null;

          const isLagna = signNum === chart.ascendantSign;
          const planetsHere = getPlanetsInSign(chart.planets, signNum);
          const signAbbr = SIGN_ABBR[signNum] ?? '';

          return (
            <g key={cellKey}>
              {/* Cell background */}
              <rect
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                fill={isLagna ? 'rgba(202, 138, 4, 0.04)' : SURFACE_COLOR}
                stroke={BORDER_COLOR}
                strokeWidth="1"
                className="chart-cell"
              />

              {/* Lagna diagonal line (top-right corner) */}
              {isLagna && (
                <line
                  x1={x + cellSize - 18}
                  y1={y}
                  x2={x + cellSize}
                  y2={y + 18}
                  stroke={GOLD}
                  strokeWidth="1.5"
                  strokeOpacity="0.6"
                />
              )}

              {/* Sign abbreviation — top-left */}
              <text
                x={x + padding}
                y={y + padding + signFontSize}
                fill={TEXT_MUTED}
                fontSize={signFontSize}
                fontFamily="DM Sans, system-ui, sans-serif"
                fontWeight="400"
              >
                {signAbbr}
              </text>

              {/* Lagna marker — top-right */}
              {isLagna && (
                <text
                  x={x + cellSize - padding}
                  y={y + padding + lagnaFontSize}
                  fill={GOLD}
                  fontSize={lagnaFontSize}
                  fontFamily="DM Sans, system-ui, sans-serif"
                  fontWeight="600"
                  textAnchor="end"
                >
                  Lg
                </text>
              )}

              {/* Planets */}
              {planetsHere.map((p, pIdx) => {
                const lineHeight = fontSize + 3;
                const startY = y + padding + signFontSize + 4 + lineHeight + pIdx * lineHeight;
                const label = planetText(p, showDegrees);

                return (
                  <g key={p.planet}>
                    {/* Planet name */}
                    <text
                      x={x + padding}
                      y={startY}
                      fill={planetFill(p)}
                      fontSize={fontSize}
                      fontFamily="DM Sans, system-ui, sans-serif"
                      fontWeight={p.isOwnSign || p.isExalted ? '600' : '400'}
                      fontStyle={p.isRetrograde ? 'italic' : 'normal'}
                    >
                      {PLANET_ABBR[p.planet] ?? '?'}
                    </text>
                    {/* Degree */}
                    {showDegrees && (
                      <text
                        x={x + padding}
                        y={startY + fontSize - 1}
                        fill={TEXT_MUTED}
                        fontSize={fontSize - 1}
                        fontFamily="DM Sans, system-ui, sans-serif"
                      >
                        {formatDegreesShort(p.degreeInSign)}{p.isRetrograde ? ' R' : ''}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        }),
      )}

      {/* Center 2×2 metadata block */}
      <rect
        x={cellSize}
        y={cellSize}
        width={cellSize * 2}
        height={cellSize * 2}
        fill={ELEVATED_COLOR}
        stroke={BORDER_COLOR}
        strokeWidth="1"
      />

      {/* Center diamond decoration */}
      <polygon
        points={`
          ${cellSize * 2},${cellSize + 12}
          ${cellSize * 3 - 12},${cellSize * 2}
          ${cellSize * 2},${cellSize * 3 - 12}
          ${cellSize + 12},${cellSize * 2}
        `}
        fill="none"
        stroke={GOLD}
        strokeWidth="0.75"
        strokeOpacity="0.15"
      />

      {/* Center content */}
      {(() => {
        const cx = cellSize * 2;
        const cy = cellSize * 2;
        const lineH = 14;

        const lines: Array<{ text: string; color: string; size: number; weight: string }> = [];

        if (chart.name) {
          lines.push({ text: chart.name, color: TEXT_PRIMARY, size: Math.round(cellSize * 0.12), weight: '600' });
        }
        if (chart.dateOfBirth) {
          const dob = new Date(chart.dateOfBirth);
          const dobStr = dob.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
          lines.push({ text: dobStr, color: TEXT_MUTED, size: Math.round(cellSize * 0.1), weight: '400' });
        }
        if (chart.ayanamsa !== undefined && chart.ayanamsaType) {
          lines.push({
            text: `${chart.ayanamsaType}: ${chart.ayanamsa.toFixed(4)}°`,
            color: TEXT_MUTED,
            size: Math.round(cellSize * 0.09),
            weight: '400',
          });
        }

        const totalHeight = lines.length * lineH;
        const startY = cy - totalHeight / 2 + lineH / 2;

        return lines.map((line, i) => (
          <text
            key={i}
            x={cx}
            y={startY + i * lineH}
            fill={line.color}
            fontSize={line.size}
            fontFamily="DM Sans, system-ui, sans-serif"
            fontWeight={line.weight}
            textAnchor="middle"
          >
            {line.text}
          </text>
        ));
      })()}

      {/* Outer border */}
      <rect
        x={0}
        y={0}
        width={size}
        height={size}
        fill="none"
        stroke={BORDER_COLOR}
        strokeWidth="1"
        rx="4"
      />
    </svg>
  );
}

export default SouthIndianChart;
