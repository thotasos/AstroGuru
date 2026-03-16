import { getJulianDay, getPlanetPosition, getAscendant, getSiderealLongitude } from '../ephemeris/swissEph.js';
import { getNakshatra } from './dashas.js';
import { Planet, type ChartData } from '../types/index.js';

/**
 * Calculate transit positions for a specific date, time, and location.
 */
export interface TransitPosition {
  moonLongitude: number;
  moonNakshatra: number;
  moonSign: number;
  moonDegree: number;
  lagna: number;
  lagnaSign: number;
}

export function calculateTransit(
  date: Date,
  latitude: number,
  longitude: number,
  utcOffsetHrs: number = 0,
): TransitPosition {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();

  const jd = getJulianDay(year, month, day, hour, minute, second, utcOffsetHrs);

  const moonTropical = getPlanetPosition(jd, Planet.Moon);
  const moonSidereal = getSiderealLongitude(moonTropical.longitude, jd);

  const lagnaResult = getAscendant(jd, latitude, longitude);
  const lagnaSidereal = getSiderealLongitude(lagnaResult.ascendant, jd);

  const moonNakshatraInfo = getNakshatra(moonSidereal);
  const moonSign = Math.floor(moonSidereal / 30);
  const moonDegree = moonSidereal % 30;

  const lagnaSign = Math.floor(lagnaSidereal / 30);

  return {
    moonLongitude: moonSidereal,
    moonNakshatra: moonNakshatraInfo.nakshatra,
    moonSign,
    moonDegree,
    lagna: lagnaSidereal,
    lagnaSign,
  };
}

/**
 * Calculate hourly score (0-100) based on transit and natal chart.
 */
export function calculateHourlyScore(
  transit: TransitPosition,
  dashaPlanet: Planet | null,
  _chart: ChartData,
): number {
  let score = 50; // Base score

  // TODO: Implement full scoring logic:
  // - Prana Dasha lord is functional benefic? (+20)
  // - Transit Lagna in Kendra from natal Lagna? (+20)
  // - Moon in friendly Nakshatra from birth star? (+20)
  // - Moon in own/exalted sign? (+20)
  // - No malefic aspects? (+20)

  return Math.min(100, Math.max(0, score));
}
