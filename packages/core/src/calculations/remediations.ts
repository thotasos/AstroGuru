// packages/core/src/calculations/remediations.ts

import { Planet, Sign, ChartData, DashaPeriod, House } from '../types/index.js';
import { TransitPosition } from './transit.js';

// ------------------------------------
// Types
// ------------------------------------

export type StressLevel = 'mild' | 'moderate' | 'severe';
export type StressTrigger = 'dasha' | 'transit' | 'dignity' | 'shadbala' | 'house';
export type RemedyType = 'gemstone' | 'moola_mantra' | 'color';

export interface PlanetStress {
  planet: Planet;
  stressLevel: StressLevel;
  reasons: string[];
  triggers: StressTrigger[];
}

export interface Remedy {
  id: string;
  type: RemedyType;
  planet: Planet;
  name: string;
  description: string;
  benefit: string;
  stressLevel: StressLevel;
  priority: number;
}

export interface RemediationReport {
  immediate: {
    periodDescription: string;
    stressedPlanets: PlanetStress[];
    remedies: Remedy[];
  };
  lifetime: {
    stressedPlanets: PlanetStress[];
    remedies: Remedy[];
  };
}

// ------------------------------------
// Placeholder exports
// ------------------------------------

export function calculateRemediations(
  _chart: ChartData,
  _dashas: DashaPeriod[],
  _transit: TransitPosition,
  _options?: { includeLifetime?: boolean; maxResults?: number }
): RemediationReport {
  throw new Error('Not yet implemented');
}

export function getPlanetStress(
  _planet: Planet,
  _chart: ChartData,
  _dashas: DashaPeriod[],
  _transit: TransitPosition,
  _currentDate: Date
): PlanetStress | null {
  throw new Error('Not yet implemented');
}

export function getRemediesForPlanet(_planet: Planet, _stress: PlanetStress): Remedy[] {
  throw new Error('Not yet implemented');
}
