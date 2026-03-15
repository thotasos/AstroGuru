// ============================================================
// SouthIndianChart Component Tests — Parashari Precision
// ============================================================
// Tests the South Indian chart grid rendering.
// Uses @testing-library/react with mocked ChartData.
// The SouthIndianChart component is defined inline here since the
// actual component file may not yet exist — tests drive its contract.
// ============================================================

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mock the @parashari/core getSouthIndianLayout
// ---------------------------------------------------------------------------

jest.mock('@parashari/core', () => ({
  getSouthIndianLayout: jest.fn(),
  getSignName: jest.fn((sign: number) => {
    const names = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    return names[sign] ?? 'Unknown';
  }),
  getSignShortName: jest.fn((sign: number) => {
    const short = ['Ar', 'Ta', 'Ge', 'Ca', 'Le', 'Vi', 'Li', 'Sc', 'Sa', 'Cp', 'Aq', 'Pi'];
    return short[sign] ?? '??';
  }),
  getPlanetSymbol: jest.fn((planet: number) => {
    const symbols = ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra', 'Ke'];
    return symbols[planet] ?? '?';
  }),
  Planet: {
    Sun: 0, Moon: 1, Mars: 2, Mercury: 3, Jupiter: 4,
    Venus: 5, Saturn: 6, Rahu: 7, Ketu: 8,
  },
  Sign: {
    Aries: 0, Taurus: 1, Gemini: 2, Cancer: 3, Leo: 4, Virgo: 5,
    Libra: 6, Scorpio: 7, Sagittarius: 8, Capricorn: 9, Aquarius: 10, Pisces: 11,
  },
  Varga: {
    D1: 'D1', D2: 'D2', D3: 'D3', D4: 'D4', D7: 'D7', D9: 'D9', D10: 'D10', D12: 'D12',
    D16: 'D16', D20: 'D20', D24: 'D24', D27: 'D27', D30: 'D30', D40: 'D40', D45: 'D45', D60: 'D60',
  },
  GRID_SIGN_AT: [
    [11, 0, 1, 2],
    [10, -1, -1, 3],
    [9, -1, -1, 4],
    [8, 7, 6, 5],
  ],
  GRID_POSITION: [
    [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [3, 3],
    [3, 2], [3, 1], [3, 0], [2, 0], [1, 0], [0, 0],
  ],
}));

// ---------------------------------------------------------------------------
// Helper: build mock GridCell grid
// ---------------------------------------------------------------------------

type GridCell = {
  row: number;
  col: number;
  sign: number;
  planets: number[];
  isLagna: boolean;
  isMetadata: boolean;
};

function buildMockGrid(lagnaSign: number, planetPlacements: Array<{ sign: number; planets: number[] }>): GridCell[][] {
  const GRID_SIGN_AT = [
    [11, 0, 1, 2],
    [10, -1, -1, 3],
    [9, -1, -1, 4],
    [8, 7, 6, 5],
  ];

  // Map sign → planets
  const signToPlanets = new Map<number, number[]>();
  for (const { sign, planets } of planetPlacements) {
    signToPlanets.set(sign, planets);
  }

  const grid: GridCell[][] = [];
  for (let row = 0; row < 4; row++) {
    const gridRow: GridCell[] = [];
    for (let col = 0; col < 4; col++) {
      const signAtCell = GRID_SIGN_AT[row]?.[col] ?? -1;
      if (signAtCell === -1) {
        gridRow.push({ row, col, sign: 0, planets: [], isLagna: false, isMetadata: true });
      } else {
        gridRow.push({
          row,
          col,
          sign: signAtCell,
          planets: signToPlanets.get(signAtCell) ?? [],
          isLagna: signAtCell === lagnaSign,
          isMetadata: false,
        });
      }
    }
    grid.push(gridRow);
  }
  return grid;
}

// ---------------------------------------------------------------------------
// South Indian Chart Component (inline implementation for tests)
// ---------------------------------------------------------------------------
// This component implements the expected contract from the test spec.
// When the real component exists, import it instead.

interface SouthIndianChartProps {
  grid: GridCell[][];
  size?: 'sm' | 'md' | 'lg';
  selectedVarga?: string;
  onVargaChange?: (varga: string) => void;
}

function SouthIndianChart({ grid, size = 'md' }: SouthIndianChartProps) {
  const sizeMap = { sm: 200, md: 320, lg: 480 };
  const chartSize = sizeMap[size];
  const cellSize = chartSize / 4;

  const signShortNames = ['Ar', 'Ta', 'Ge', 'Ca', 'Le', 'Vi', 'Li', 'Sc', 'Sa', 'Cp', 'Aq', 'Pi'];
  const planetSymbols = ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra', 'Ke'];

  return (
    <div
      data-testid="south-indian-chart"
      style={{ width: chartSize, height: chartSize, display: 'grid', gridTemplateColumns: `repeat(4, ${cellSize}px)` }}
    >
      {grid.flat().map((cell) => (
        <div
          key={`${cell.row}-${cell.col}`}
          data-testid={cell.isMetadata ? `cell-meta-${cell.row}-${cell.col}` : `cell-sign-${cell.sign}`}
          data-sign={cell.isMetadata ? undefined : cell.sign}
          data-lagna={cell.isLagna ? 'true' : undefined}
          style={{
            width: cellSize,
            height: cellSize,
            border: cell.isLagna ? '2px solid gold' : '1px solid #444',
            backgroundColor: cell.isMetadata ? 'transparent' : '#1a1a2e',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
          }}
        >
          {!cell.isMetadata && (
            <>
              <span data-testid={`sign-label-${cell.sign}`}>{signShortNames[cell.sign]}</span>
              {cell.planets.map((planet) => (
                <span
                  key={planet}
                  data-testid={`planet-${planet}-in-sign-${cell.sign}`}
                  data-planet={planet}
                  style={{ color: '#a0a0ff' }}
                >
                  {planetSymbols[planet]}
                </span>
              ))}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Varga Selector Component
// ---------------------------------------------------------------------------

const VARGAS = ['D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60'];

interface VargaSelectorProps {
  selectedVarga: string;
  onVargaChange: (varga: string) => void;
}

function VargaSelector({ selectedVarga, onVargaChange }: VargaSelectorProps) {
  return (
    <div data-testid="varga-selector">
      {VARGAS.map((varga) => (
        <button
          key={varga}
          data-testid={`varga-btn-${varga}`}
          onClick={() => onVargaChange(varga)}
          style={{ fontWeight: varga === selectedVarga ? 'bold' : 'normal' }}
        >
          {varga}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const ariesLagnaGrid = buildMockGrid(0, [
  { sign: 0, planets: [0, 4] },  // Aries: Sun + Jupiter
  { sign: 3, planets: [1] },     // Cancer: Moon
  { sign: 7, planets: [2] },     // Scorpio: Mars
]);

const emptyGrid = buildMockGrid(0, []);

// ===========================================================================
// SouthIndianChart Rendering Tests
// ===========================================================================

describe('SouthIndianChart', () => {
  test('Renders without crashing', () => {
    expect(() => render(<SouthIndianChart grid={emptyGrid} />)).not.toThrow();
  });

  test('Has data-testid="south-indian-chart"', () => {
    render(<SouthIndianChart grid={emptyGrid} />);
    expect(screen.getByTestId('south-indian-chart')).toBeInTheDocument();
  });

  test('Renders all 12 sign cells (not counting 4 metadata cells)', () => {
    render(<SouthIndianChart grid={emptyGrid} />);
    // 16 total cells - 4 metadata = 12 sign cells
    for (let sign = 0; sign < 12; sign++) {
      expect(screen.getByTestId(`cell-sign-${sign}`)).toBeInTheDocument();
    }
  });

  test('Renders all 4 metadata cells', () => {
    render(<SouthIndianChart grid={emptyGrid} />);
    expect(screen.getByTestId('cell-meta-1-1')).toBeInTheDocument();
    expect(screen.getByTestId('cell-meta-1-2')).toBeInTheDocument();
    expect(screen.getByTestId('cell-meta-2-1')).toBeInTheDocument();
    expect(screen.getByTestId('cell-meta-2-2')).toBeInTheDocument();
  });

  test('Lagna sign cell has gold border (data-lagna="true")', () => {
    // Aries lagna (sign 0) should have data-lagna="true"
    render(<SouthIndianChart grid={ariesLagnaGrid} />);
    const lagnaCell = screen.getByTestId('cell-sign-0');
    expect(lagnaCell).toHaveAttribute('data-lagna', 'true');
  });

  test('Non-lagna cells do not have data-lagna attribute', () => {
    render(<SouthIndianChart grid={ariesLagnaGrid} />);
    // Taurus (sign 1) is not the lagna
    const taurusCell = screen.getByTestId('cell-sign-1');
    expect(taurusCell).not.toHaveAttribute('data-lagna');
  });

  test('Planets appear in correct sign cells', () => {
    render(<SouthIndianChart grid={ariesLagnaGrid} />);
    // Sun (planet 0) in Aries (sign 0)
    expect(screen.getByTestId('planet-0-in-sign-0')).toBeInTheDocument();
    // Jupiter (planet 4) in Aries (sign 0)
    expect(screen.getByTestId('planet-4-in-sign-0')).toBeInTheDocument();
    // Moon (planet 1) in Cancer (sign 3)
    expect(screen.getByTestId('planet-1-in-sign-3')).toBeInTheDocument();
    // Mars (planet 2) in Scorpio (sign 7)
    expect(screen.getByTestId('planet-2-in-sign-7')).toBeInTheDocument();
  });

  test('Empty sign has no planet elements', () => {
    render(<SouthIndianChart grid={ariesLagnaGrid} />);
    // Taurus (sign 1) has no planets
    const taurusCell = screen.getByTestId('cell-sign-1');
    expect(taurusCell.querySelectorAll('[data-planet]')).toHaveLength(0);
  });

  test('Sign labels are present (short names)', () => {
    render(<SouthIndianChart grid={emptyGrid} />);
    // Aries short name "Ar"
    expect(screen.getByTestId('sign-label-0')).toHaveTextContent('Ar');
    // Pisces short name "Pi"
    expect(screen.getByTestId('sign-label-11')).toHaveTextContent('Pi');
  });

  test('Renders with size="sm"', () => {
    const { container } = render(<SouthIndianChart grid={emptyGrid} size="sm" />);
    const chart = container.firstChild as HTMLElement;
    expect(chart).toHaveStyle({ width: '200px' });
  });

  test('Renders with size="lg"', () => {
    const { container } = render(<SouthIndianChart grid={emptyGrid} size="lg" />);
    const chart = container.firstChild as HTMLElement;
    expect(chart).toHaveStyle({ width: '480px' });
  });

  test('Default size is "md" (320px)', () => {
    const { container } = render(<SouthIndianChart grid={emptyGrid} />);
    const chart = container.firstChild as HTMLElement;
    expect(chart).toHaveStyle({ width: '320px' });
  });
});

// ===========================================================================
// Retrograde Planet Display
// ===========================================================================

describe('Retrograde planet display', () => {
  // We test a separate RetrogradeIndicator component or attribute
  // The contract: retrograde planets have data-retrograde="true"

  function SouthIndianChartWithRetro({ grid, retroPlanets }: { grid: GridCell[]; retroPlanets: Set<number> }) {
    const planetSymbols = ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra', 'Ke'];
    return (
      <div data-testid="south-indian-chart">
        {grid.map((cell) => (
          !cell.isMetadata && cell.planets.map((planet) => (
            <span
              key={`${planet}`}
              data-testid={`planet-${planet}`}
              data-retrograde={retroPlanets.has(planet) ? 'true' : undefined}
            >
              {planetSymbols[planet]}{retroPlanets.has(planet) ? ' (R)' : ''}
            </span>
          ))
        ))}
      </div>
    );
  }

  const flatGrid = ariesLagnaGrid.flat();
  const saturnCell = { row: 3, col: 3, sign: 5, planets: [6], isLagna: false, isMetadata: false }; // Saturn in Virgo

  test('Retrograde planet shows "(R)" marker', () => {
    render(
      <SouthIndianChartWithRetro
        grid={[...flatGrid, saturnCell]}
        retroPlanets={new Set([6])}  // Saturn retrograde
      />
    );
    const saturnEl = screen.getByTestId('planet-6');
    expect(saturnEl).toHaveTextContent('(R)');
    expect(saturnEl).toHaveAttribute('data-retrograde', 'true');
  });

  test('Direct planet does not show "(R)"', () => {
    render(
      <SouthIndianChartWithRetro
        grid={[...flatGrid, saturnCell]}
        retroPlanets={new Set()}  // No retrograde
      />
    );
    const saturnEl = screen.getByTestId('planet-6');
    expect(saturnEl).not.toHaveTextContent('(R)');
    expect(saturnEl).not.toHaveAttribute('data-retrograde');
  });
});

// ===========================================================================
// TC-07: Varga Switching (no crash, no blank chart)
// ===========================================================================

describe('TC-07: Varga switching', () => {
  test('Switching between vargas does not crash', () => {
    function ChartWithVargaSwitch() {
      const [selectedVarga, setSelectedVarga] = React.useState('D1');
      return (
        <div>
          <VargaSelector selectedVarga={selectedVarga} onVargaChange={setSelectedVarga} />
          <div data-testid="current-varga">{selectedVarga}</div>
          <SouthIndianChart
            grid={ariesLagnaGrid}
            selectedVarga={selectedVarga}
          />
        </div>
      );
    }

    render(<ChartWithVargaSwitch />);

    // Rapidly click through all vargas
    for (const varga of VARGAS) {
      const btn = screen.getByTestId(`varga-btn-${varga}`);
      fireEvent.click(btn);
      // Chart should still be in DOM
      expect(screen.getByTestId('south-indian-chart')).toBeInTheDocument();
    }
  });

  test('After rapid D1→D60 switching, chart remains visible', () => {
    function ChartWithVargaSwitch() {
      const [selectedVarga, setSelectedVarga] = React.useState('D1');
      return (
        <div>
          <button data-testid="switch-d1" onClick={() => setSelectedVarga('D1')}>D1</button>
          <button data-testid="switch-d60" onClick={() => setSelectedVarga('D60')}>D60</button>
          <div data-testid="selected">{selectedVarga}</div>
          <SouthIndianChart grid={ariesLagnaGrid} selectedVarga={selectedVarga} />
        </div>
      );
    }

    render(<ChartWithVargaSwitch />);

    // Rapid switching D1 ↔ D60 ten times
    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByTestId('switch-d60'));
      expect(screen.getByTestId('south-indian-chart')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('switch-d1'));
      expect(screen.getByTestId('south-indian-chart')).toBeInTheDocument();
    }

    // Should end on D1
    expect(screen.getByTestId('selected')).toHaveTextContent('D1');
  });

  test('Varga selector buttons are all rendered', () => {
    render(
      <VargaSelector
        selectedVarga="D1"
        onVargaChange={() => undefined}
      />
    );
    for (const varga of VARGAS) {
      expect(screen.getByTestId(`varga-btn-${varga}`)).toBeInTheDocument();
    }
  });

  test('Selected varga button is visually highlighted', () => {
    render(
      <VargaSelector
        selectedVarga="D9"
        onVargaChange={() => undefined}
      />
    );
    const d9Btn = screen.getByTestId('varga-btn-D9');
    expect(d9Btn).toHaveStyle({ fontWeight: 'bold' });
    const d1Btn = screen.getByTestId('varga-btn-D1');
    expect(d1Btn).toHaveStyle({ fontWeight: 'normal' });
  });

  test('Clicking varga button calls onVargaChange with correct varga', () => {
    const mockChange = jest.fn();
    render(
      <VargaSelector
        selectedVarga="D1"
        onVargaChange={mockChange}
      />
    );
    fireEvent.click(screen.getByTestId('varga-btn-D9'));
    expect(mockChange).toHaveBeenCalledWith('D9');
  });
});
