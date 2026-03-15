// ============================================================
// Shadbala — Six-fold Planetary Strength — Parashari Precision
// ============================================================
// All strength values are in Virupas (1 Rupa = 60 Virupas).
// Reference: BPHS Ch.27-28 and Saravali.
// ============================================================

import { Planet, Sign, ChartData, ShadbalaResult, House } from '../types/index.js';
import { normalizeDegrees } from '../ephemeris/swissEph.js';

// ------------------------------------
// Exaltation / Debilitation degrees
// ------------------------------------
// Longitude of maximum exaltation (deep exaltation point)

interface ExaltDebil {
  exaltSign: Sign;
  exaltDeg: number;   // degree within sign of deep exaltation
  debilSign: Sign;
  debilDeg: number;   // degree within sign of deep debilitation
}

export const EXALT_DEBIL: Record<Planet, ExaltDebil> = {
  [Planet.Sun]: {
    exaltSign: Sign.Aries, exaltDeg: 10,
    debilSign: Sign.Libra, debilDeg: 10,
  },
  [Planet.Moon]: {
    exaltSign: Sign.Taurus, exaltDeg: 3,
    debilSign: Sign.Scorpio, debilDeg: 3,
  },
  [Planet.Mars]: {
    exaltSign: Sign.Capricorn, exaltDeg: 28,
    debilSign: Sign.Cancer, debilDeg: 28,
  },
  [Planet.Mercury]: {
    exaltSign: Sign.Virgo, exaltDeg: 15,
    debilSign: Sign.Pisces, debilDeg: 15,
  },
  [Planet.Jupiter]: {
    exaltSign: Sign.Cancer, exaltDeg: 5,
    debilSign: Sign.Capricorn, debilDeg: 5,
  },
  [Planet.Venus]: {
    exaltSign: Sign.Pisces, exaltDeg: 27,
    debilSign: Sign.Virgo, debilDeg: 27,
  },
  [Planet.Saturn]: {
    exaltSign: Sign.Libra, exaltDeg: 20,
    debilSign: Sign.Aries, debilDeg: 20,
  },
  [Planet.Rahu]: {
    exaltSign: Sign.Taurus, exaltDeg: 20,
    debilSign: Sign.Scorpio, debilDeg: 20,
  },
  [Planet.Ketu]: {
    exaltSign: Sign.Scorpio, exaltDeg: 20,
    debilSign: Sign.Taurus, debilDeg: 20,
  },
};

// ------------------------------------
// Natural (Naisargika) Strength values in Virupas
// ------------------------------------
export const NAISARGIKA_BALA: Record<Planet, number> = {
  [Planet.Sun]:     60.0,
  [Planet.Moon]:    51.43,
  [Planet.Venus]:   42.86,
  [Planet.Jupiter]: 34.29,
  [Planet.Mercury]: 25.71,
  [Planet.Mars]:    17.14,
  [Planet.Saturn]:   8.57,
  [Planet.Rahu]:     0.0,  // Nodes traditionally excluded
  [Planet.Ketu]:     0.0,
};

// ------------------------------------
// Own/Moolatrikona signs
// ------------------------------------
// planet → [moolatrikona sign, own sign(s)]
interface SignRulership {
  moolatrikona: Sign;
  ownSigns: Sign[];
}

export const SIGN_RULERSHIP: Record<Planet, SignRulership> = {
  [Planet.Sun]:     { moolatrikona: Sign.Leo,          ownSigns: [Sign.Leo] },
  [Planet.Moon]:    { moolatrikona: Sign.Taurus,       ownSigns: [Sign.Cancer] },
  [Planet.Mars]:    { moolatrikona: Sign.Aries,        ownSigns: [Sign.Aries, Sign.Scorpio] },
  [Planet.Mercury]: { moolatrikona: Sign.Virgo,        ownSigns: [Sign.Gemini, Sign.Virgo] },
  [Planet.Jupiter]: { moolatrikona: Sign.Sagittarius,  ownSigns: [Sign.Sagittarius, Sign.Pisces] },
  [Planet.Venus]:   { moolatrikona: Sign.Libra,        ownSigns: [Sign.Taurus, Sign.Libra] },
  [Planet.Saturn]:  { moolatrikona: Sign.Aquarius,     ownSigns: [Sign.Capricorn, Sign.Aquarius] },
  [Planet.Rahu]:    { moolatrikona: Sign.Gemini,       ownSigns: [Sign.Aquarius] },
  [Planet.Ketu]:    { moolatrikona: Sign.Sagittarius,  ownSigns: [Sign.Scorpio] },
};

// ------------------------------------
// Digbala (Directional Strength) — best house for each planet
// Planet gets 60 Virupas in the best house, 0 in the opposite (7th from it).
// ------------------------------------
export const DIGBALA_BEST_HOUSE: Partial<Record<Planet, number>> = {
  [Planet.Sun]:     10,  // 10th house
  [Planet.Mars]:    10,  // 10th house
  [Planet.Moon]:    4,   // 4th house
  [Planet.Venus]:   4,   // 4th house
  [Planet.Mercury]: 1,   // 1st house (Lagna)
  [Planet.Jupiter]: 1,   // 1st house (Lagna)
  [Planet.Saturn]:  7,   // 7th house
};

// ------------------------------------
// House type (Kendra, Panapara, Apoklima)
// ------------------------------------
function getHouseType(house: number): 'kendra' | 'panapara' | 'apoklima' {
  const kendradi = [1, 4, 7, 10];
  const panapara = [2, 5, 8, 11];
  if (kendradi.includes(house)) return 'kendra';
  if (panapara.includes(house)) return 'panapara';
  return 'apoklima';
}

// ------------------------------------
// Helper: get house number of a planet (whole-sign)
// ------------------------------------
function getPlanetHouseNumber(chart: ChartData, planet: Planet): number {
  const planetPos = chart.planets.find((p) => p.planet === planet);
  if (!planetPos) return 1;
  const lagnaSign = Math.floor(chart.ascendant / 30);
  const planetSign = planetPos.sign as number;
  return ((planetSign - lagnaSign + 12) % 12) + 1;
}

// ------------------------------------
// Uccha Bala — Exaltation Strength (0–60 Virupas)
// ------------------------------------
function calculateUcchaBala(planet: Planet, siderealLongitude: number): number {
  const ed = EXALT_DEBIL[planet];
  const exaltLon = ed.exaltSign * 30 + ed.exaltDeg;
  const debilLon = ed.debilSign * 30 + ed.debilDeg;

  // Angular distance from exaltation
  let diff = Math.abs(normalizeDegrees(siderealLongitude) - exaltLon);
  if (diff > 180) diff = 360 - diff;

  // At exaltation: diff=0 → 60 Virupas; at debilitation: diff=180 → 0 Virupas
  // Verify debilitation makes diff=180:
  let diffToDebil = Math.abs(normalizeDegrees(siderealLongitude) - debilLon);
  if (diffToDebil > 180) diffToDebil = 360 - diffToDebil;

  // Linear interpolation: uccha = (180 - diff) / 180 * 60
  return ((180 - diff) / 180) * 60;
}

// ------------------------------------
// Sapta Vargaja Bala — Strength from 7 divisional charts
// ------------------------------------
// Uses D1, D2, D3, D7, D9, D12, D30.
// Points: Moolatrikona=45, Own=30, Great Friend=22.5, Friend=15, Neutral=7.5, Enemy=3.75, Great Enemy=1.875
// For simplicity we use D1 sign placement:
// Exaltation=20, Moolatrikona=15, Own=10, Friend's sign=5, Neutral=3, Enemy=2, Debilitation=1

function getSaptaVargajaBala(planet: Planet, sign: Sign): number {
  const ed = EXALT_DEBIL[planet];
  if (sign === ed.exaltSign) return 20;

  const rulership = SIGN_RULERSHIP[planet];
  if (sign === rulership.moolatrikona) return 15;
  if (rulership.ownSigns.includes(sign)) return 10;

  // Friend/enemy classification (simplified Parashari)
  const naturalFriends = getNaturalFriends(planet);
  const naturalEnemies = getNaturalEnemies(planet);
  const signLord = getSignLord(sign);

  if (sign === ed.debilSign) return 0;
  if (naturalFriends.includes(signLord)) return 5;
  if (naturalEnemies.includes(signLord)) return 2;
  return 3; // Neutral
}

// ------------------------------------
// Ojhayugma Bala (Odd/Even sign placement)
// ------------------------------------
// Masculine planets (Sun, Mars, Jupiter) gain 15 Virupas in odd signs.
// Feminine planets (Moon, Venus) gain 15 Virupas in even signs.
// Mercury gains in both (neutral).
function getOjhayugmaBala(planet: Planet, sign: Sign): number {
  const masculinePlanets = [Planet.Sun, Planet.Mars, Planet.Jupiter, Planet.Saturn];
  const femininePlanets = [Planet.Moon, Planet.Venus];
  const signIndex = sign as number;
  const isOddSign = signIndex % 2 === 0; // Aries(0)=odd

  if (masculinePlanets.includes(planet) && isOddSign) return 15;
  if (femininePlanets.includes(planet) && !isOddSign) return 15;
  if (planet === Planet.Mercury) return 15; // Mercury gains in both
  return 0;
}

// ------------------------------------
// Kendradi Bala (Angular house strength)
// ------------------------------------
function getKendradiBala(house: number): number {
  const type = getHouseType(house);
  if (type === 'kendra') return 60;
  if (type === 'panapara') return 30;
  return 15; // apoklima
}

// ------------------------------------
// Drekkana Bala
// ------------------------------------
// Male planets gain 15 Virupas in the 1st drekkana,
// Hermaphrodite (Mercury) in the 2nd,
// Female (Moon, Venus) in the 3rd.
function getDrekkanaBala(planet: Planet, siderealLongitude: number): number {
  const degInSign = normalizeDegrees(siderealLongitude) % 30;
  const drekkana = Math.floor(degInSign / 10) + 1; // 1, 2, or 3

  const malePlanets = [Planet.Sun, Planet.Mars, Planet.Jupiter, Planet.Saturn, Planet.Rahu];
  const neutralPlanets = [Planet.Mercury, Planet.Ketu];
  const femalePlanets = [Planet.Moon, Planet.Venus];

  if (malePlanets.includes(planet) && drekkana === 1) return 15;
  if (neutralPlanets.includes(planet) && drekkana === 2) return 15;
  if (femalePlanets.includes(planet) && drekkana === 3) return 15;
  return 0;
}

// ------------------------------------
// Sthanabala (Total Positional Strength)
// ------------------------------------
function calculateSthanabala(planet: Planet, chart: ChartData): number {
  const planetPos = chart.planets.find((p) => p.planet === planet);
  if (!planetPos) return 0;

  const uccha = calculateUcchaBala(planet, planetPos.siderealLongitude);
  const saptaVargaja = getSaptaVargajaBala(planet, planetPos.sign);
  const ojhayugma = getOjhayugmaBala(planet, planetPos.sign);
  const house = getPlanetHouseNumber(chart, planet);
  const kendradi = getKendradiBala(house);
  const drekkana = getDrekkanaBala(planet, planetPos.siderealLongitude);

  return uccha + saptaVargaja + ojhayugma + kendradi + drekkana;
}

// ------------------------------------
// Digbala (Directional Strength)
// ------------------------------------
function calculateDigbala(planet: Planet, chart: ChartData): number {
  const bestHouse = DIGBALA_BEST_HOUSE[planet];
  if (bestHouse === undefined) return 0;

  const house = getPlanetHouseNumber(chart, planet);

  // Angular distance from best house to worst house (opposite of best)
  const worstHouse = ((bestHouse + 5) % 12) + 1;  // 7th from best (add 6)
  const actualWorst = bestHouse <= 6 ? bestHouse + 6 : bestHouse - 6;

  // Distance from best house: house positions are 1-12, treat as 30° intervals
  const bestDeg = (bestHouse - 1) * 30;
  const actualDeg = (house - 1) * 30;
  const worstDeg = (actualWorst - 1) * 30;
  void worstHouse;

  let diff = Math.abs(actualDeg - bestDeg);
  if (diff > 180) diff = 360 - diff;

  return ((180 - diff) / 180) * 60;
}

// ------------------------------------
// Kalabala (Temporal Strength)
// ------------------------------------
// Simplified: Day/night strength, weekday lord, hora lord
// Full Kalabala is very complex; we implement the main components.

function calculateKalabala(planet: Planet, chart: ChartData): number {
  let kalabala = 0;

  // Nathonnatha bala (diurnal/nocturnal strength)
  // Day benefics: Sun, Jupiter, Venus gain more during day
  // Night benefics: Moon, Mars, Saturn gain more at night
  // Mercury is always medium
  // We estimate based on Julian day time
  const jd = chart.julianDay;
  const fractionalDay = jd - Math.floor(jd);
  // Noon = 0.5, midnight = 0.0 or 1.0 in fractional day
  const isDaytime = fractionalDay > 0.25 && fractionalDay < 0.75;

  const dayPlanets = [Planet.Sun, Planet.Jupiter, Planet.Venus];
  const nightPlanets = [Planet.Moon, Planet.Mars, Planet.Saturn];

  if (dayPlanets.includes(planet)) {
    kalabala += isDaytime ? 60 : 0;
  } else if (nightPlanets.includes(planet)) {
    kalabala += !isDaytime ? 60 : 0;
  } else {
    kalabala += 30; // Mercury is always 30
  }

  // Paksha bala (lunar phase strength)
  // Benefics (Moon, Mercury, Jupiter, Venus) gain in Shukla paksha (bright half)
  // Malefics (Sun, Mars, Saturn) gain in Krishna paksha (dark half)
  const moonPos = chart.planets.find((p) => p.planet === Planet.Moon);
  const sunPos = chart.planets.find((p) => p.planet === Planet.Sun);
  if (moonPos && sunPos) {
    const elongation = normalizeDegrees(moonPos.siderealLongitude - sunPos.siderealLongitude);
    const isShukla = elongation < 180; // 0-180 = waxing = bright half

    const beneficPlanets = [Planet.Moon, Planet.Mercury, Planet.Jupiter, Planet.Venus];
    const maleficPlanets = [Planet.Sun, Planet.Mars, Planet.Saturn];

    if (beneficPlanets.includes(planet) && isShukla) kalabala += 60;
    else if (maleficPlanets.includes(planet) && !isShukla) kalabala += 60;
    else kalabala += 0;
  }

  // Hora bala (hour lord strength)
  // The hora lord of the current hour gains 60 Virupas.
  // Hora sequence: Sun, Venus, Mercury, Moon, Saturn, Jupiter, Mars (planetary hour)
  const horaLord = getHoraLord(jd);
  if (horaLord === planet) kalabala += 60;

  // Abda (year), Masa (month), Vara (weekday) balas — simplified
  // Weekday lord gains 45 Virupas
  const weekdayLord = getWeekdayLord(jd);
  if (weekdayLord === planet) kalabala += 45;

  return Math.min(kalabala, 240); // Cap at reasonable maximum
}

// ------------------------------------
// Chestabala (Motional Strength)
// ------------------------------------
// Based on planetary speed relative to mean motion.
// Retrograde planets in own or exaltation signs get more strength.
// Vakra (retrograde) = 60, Vikala = 30, Direct at mean speed = 30, Fast = 15

function calculateChestabala(planet: Planet, chart: ChartData): number {
  const planetPos = chart.planets.find((p) => p.planet === planet);
  if (!planetPos) return 0;

  // Nodes are always 30 Virupas (mean motion)
  if (planet === Planet.Rahu || planet === Planet.Ketu) return 30;

  const speed = planetPos.speed;
  const meanSpeeds: Partial<Record<Planet, number>> = {
    [Planet.Sun]: 0.9856,
    [Planet.Moon]: 13.1764,
    [Planet.Mars]: 0.5240,
    [Planet.Mercury]: 1.3833,
    [Planet.Jupiter]: 0.0831,
    [Planet.Venus]: 1.2028,
    [Planet.Saturn]: 0.0335,
  };

  const meanSpeed = meanSpeeds[planet] ?? 1;

  if (planetPos.isRetrograde) {
    // Retrograde — vakra: high strength
    // Strength proportional to how much faster than mean retrograde motion
    return 60;
  }

  const ratio = speed / meanSpeed;
  if (ratio >= 2.0) return 60;      // Very fast (Atichara)
  if (ratio >= 1.5) return 45;      // Fast
  if (ratio >= 0.75) return 30;     // Mean (Sama)
  if (ratio >= 0.25) return 15;     // Slow
  return 7.5;                        // Very slow (Sthana)
}

// ------------------------------------
// Drigbala (Aspectual Strength)
// ------------------------------------
// Based on aspects received from benefics and malefics.
// Full aspect = 60, 3/4 = 45, 1/2 = 30, 1/4 = 15
// Benefics give positive, malefics give negative.

function calculateDrigbala(planet: Planet, chart: ChartData): number {
  const planetPos = chart.planets.find((p) => p.planet === planet);
  if (!planetPos) return 0;

  const targetSign = planetPos.sign as number;
  let totalStrength = 0;

  for (const otherPlanet of chart.planets) {
    if (otherPlanet.planet === planet) continue;
    if (otherPlanet.planet === Planet.Rahu || otherPlanet.planet === Planet.Ketu) continue;

    const aspectStrength = getAspectStrength(otherPlanet.planet, otherPlanet.sign as number, targetSign);
    if (aspectStrength === 0) continue;

    const isBenefic = isNaturalBenefic(otherPlanet.planet);
    totalStrength += isBenefic ? aspectStrength : -aspectStrength;
  }

  return totalStrength;
}

// ------------------------------------
// Aspect calculations
// ------------------------------------
function getAspectStrength(aspectingPlanet: Planet, fromSign: number, toSign: number): number {
  const signDiff = ((toSign - fromSign) + 12) % 12;

  // All planets aspect 7th house (signDiff=6) with full aspect
  const fullAspectPositions = [6]; // 7th house

  // Special aspects:
  // Mars: 4th (signDiff=3) and 8th (signDiff=7) with full aspect
  // Jupiter: 5th (signDiff=4) and 9th (signDiff=8) with full aspect
  // Saturn: 3rd (signDiff=2) and 10th (signDiff=9) with full aspect
  // Rahu/Ketu: 5th (signDiff=4) and 9th (signDiff=8)

  if (aspectingPlanet === Planet.Mars) {
    if ([3, 6, 7].includes(signDiff)) return 60;
  } else if (aspectingPlanet === Planet.Jupiter) {
    if ([4, 6, 8].includes(signDiff)) return 60;
  } else if (aspectingPlanet === Planet.Saturn) {
    if ([2, 6, 9].includes(signDiff)) return 60;
  } else {
    if (fullAspectPositions.includes(signDiff)) return 60;
  }

  return 0;
}

function isNaturalBenefic(planet: Planet): boolean {
  return [Planet.Jupiter, Planet.Venus, Planet.Mercury, Planet.Moon].includes(planet);
}

// ------------------------------------
// Main Shadbala calculation
// ------------------------------------

/**
 * Calculate the complete Shadbala for all 7 major planets in a chart.
 *
 * @param chart  Computed chart data
 * @returns Array of ShadbalaResult (one per planet, Rahu and Ketu included with reduced strength)
 */
export function calculateShadbala(chart: ChartData): ShadbalaResult[] {
  const results: ShadbalaResult[] = [];

  const planets = [
    Planet.Sun, Planet.Moon, Planet.Mars, Planet.Mercury,
    Planet.Jupiter, Planet.Venus, Planet.Saturn,
  ];

  for (const planet of planets) {
    const sthanabala = calculateSthanabala(planet, chart);
    const digbala = calculateDigbala(planet, chart);
    const kalabala = calculateKalabala(planet, chart);
    const chestabala = calculateChestabala(planet, chart);
    const naisargikabala = NAISARGIKA_BALA[planet] ?? 0;
    const drigbala = calculateDrigbala(planet, chart);

    const total = sthanabala + digbala + kalabala + chestabala + naisargikabala + Math.max(0, drigbala);
    const totalRupas = total / 60;

    // Ishta phala = sqrt(uccha_bala × chestabala)
    const ucchaBala = calculateUcchaBala(planet, chart.planets.find((p) => p.planet === planet)?.siderealLongitude ?? 0);
    const ishtaPhala = Math.sqrt(ucchaBala * chestabala);
    const kashtaPhala = Math.sqrt(
      (60 - ucchaBala) * (60 - Math.min(chestabala, 60)),
    );

    results.push({
      planet,
      sthanabala,
      digbala,
      kalabala,
      chestabala,
      naisargikabala,
      drigbala,
      total,
      totalRupas,
      ishtaPhala,
      kashtaPhala,
    });
  }

  return results;
}

// ------------------------------------
// Natural friendship / enmity
// ------------------------------------
function getNaturalFriends(planet: Planet): Planet[] {
  const friendMap: Record<Planet, Planet[]> = {
    [Planet.Sun]:     [Planet.Moon, Planet.Mars, Planet.Jupiter],
    [Planet.Moon]:    [Planet.Sun, Planet.Mercury],
    [Planet.Mars]:    [Planet.Sun, Planet.Moon, Planet.Jupiter],
    [Planet.Mercury]: [Planet.Sun, Planet.Venus],
    [Planet.Jupiter]: [Planet.Sun, Planet.Moon, Planet.Mars],
    [Planet.Venus]:   [Planet.Mercury, Planet.Saturn],
    [Planet.Saturn]:  [Planet.Mercury, Planet.Venus],
    [Planet.Rahu]:    [Planet.Venus, Planet.Saturn],
    [Planet.Ketu]:    [Planet.Venus, Planet.Saturn],
  };
  return friendMap[planet] ?? [];
}

function getNaturalEnemies(planet: Planet): Planet[] {
  const enemyMap: Record<Planet, Planet[]> = {
    [Planet.Sun]:     [Planet.Venus, Planet.Saturn],
    [Planet.Moon]:    [Planet.Rahu, Planet.Ketu],
    [Planet.Mars]:    [Planet.Mercury],
    [Planet.Mercury]: [Planet.Moon],
    [Planet.Jupiter]: [Planet.Mercury, Planet.Venus],
    [Planet.Venus]:   [Planet.Sun, Planet.Moon],
    [Planet.Saturn]:  [Planet.Sun, Planet.Moon, Planet.Mars],
    [Planet.Rahu]:    [Planet.Sun, Planet.Moon],
    [Planet.Ketu]:    [Planet.Sun, Planet.Moon],
  };
  return enemyMap[planet] ?? [];
}

// ------------------------------------
// Sign lordship (Parashari)
// ------------------------------------
export function getSignLord(sign: Sign): Planet {
  const lords: Record<number, Planet> = {
    0: Planet.Mars,     // Aries
    1: Planet.Venus,    // Taurus
    2: Planet.Mercury,  // Gemini
    3: Planet.Moon,     // Cancer
    4: Planet.Sun,      // Leo
    5: Planet.Mercury,  // Virgo
    6: Planet.Venus,    // Libra
    7: Planet.Mars,     // Scorpio
    8: Planet.Jupiter,  // Sagittarius
    9: Planet.Saturn,   // Capricorn
    10: Planet.Saturn,  // Aquarius
    11: Planet.Jupiter, // Pisces
  };
  return lords[sign as number] ?? Planet.Sun;
}

// ------------------------------------
// Hora lord calculation (planetary hour)
// ------------------------------------
// Day lords: Sun, Mon, Tue=Mars, Wed=Mercury, Thu=Jupiter, Fri=Venus, Sat=Saturn
// Hora sequence from sunrise: Sun, Venus, Mercury, Moon, Saturn, Jupiter, Mars (then repeats)

function getWeekdayLord(julianDay: number): Planet {
  // JD 0 = Monday (day 0), JD 1 = Tuesday, etc.
  // Julian Day epoch (JD 0) = Jan 1, 4713 BC, which was a Monday
  const weekday = Math.floor(julianDay + 1.5) % 7;
  const weekdayLords: Planet[] = [
    Planet.Sun,     // 0 = Sunday
    Planet.Moon,    // 1 = Monday
    Planet.Mars,    // 2 = Tuesday
    Planet.Mercury, // 3 = Wednesday
    Planet.Jupiter, // 4 = Thursday
    Planet.Venus,   // 5 = Friday
    Planet.Saturn,  // 6 = Saturday
  ];
  return weekdayLords[weekday] ?? Planet.Sun;
}

function getHoraLord(julianDay: number): Planet {
  // Hora sequence starting from day ruler
  const horaSequence: Planet[] = [
    Planet.Sun, Planet.Venus, Planet.Mercury, Planet.Moon,
    Planet.Saturn, Planet.Jupiter, Planet.Mars,
  ];

  const weekday = Math.floor(julianDay + 1.5) % 7;
  const dayLordHoraIndex = [0, 3, 6, 2, 5, 1, 4][weekday] ?? 0; // day lord's position in hora sequence

  // Hour number from sunrise (approximate: 12 horas per day, 1 hora = 1 hour)
  const fracDay = (julianDay + 0.5) % 1; // 0 = midnight, 0.25 = 6am approx sunrise
  const horaNumber = Math.floor((fracDay * 24)) % 24;

  const horaIndex = (dayLordHoraIndex + horaNumber) % 7;
  return horaSequence[horaIndex] ?? Planet.Sun;
}

// Re-export for external use
export { getNaturalFriends, getNaturalEnemies, getHouseType };
export { getPlanetHouseNumber };
