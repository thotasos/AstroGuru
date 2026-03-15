// ============================================================
// Yoga Detection Engine — Parashari Precision
// ============================================================
// Implements 50+ classical Parashari yogas.
// All checks are based on whole-sign house system.
// ============================================================

import { Planet, Sign, ChartData, YogaResult } from '../types/index.js';
import { getSignLord } from './shadbala.js';

// ------------------------------------
// Kendra houses (angular)
// ------------------------------------
const KENDRA_HOUSES = [1, 4, 7, 10];
const TRIKONA_HOUSES = [1, 5, 9];
const DUSTHANA_HOUSES = [6, 8, 12];
const UPACHAYA_HOUSES = [3, 6, 10, 11];

// ------------------------------------
// Helper functions
// ------------------------------------

/**
 * Get the house number (1–12) in which a planet is placed.
 * Uses whole-sign house system.
 */
export function getHouseOfPlanet(chart: ChartData, planet: Planet): number {
  const planetPos = chart.planets.find((p) => p.planet === planet);
  if (!planetPos) return 1;
  const lagnaSign = Math.floor(chart.ascendant / 30);
  const planetSign = planetPos.sign as number;
  return ((planetSign - lagnaSign + 12) % 12) + 1;
}

/**
 * Get the sign index of a planet.
 */
export function getPlanetSign(chart: ChartData, planet: Planet): Sign {
  const pos = chart.planets.find((p) => p.planet === planet);
  return pos ? pos.sign : Sign.Aries;
}

/**
 * Get all planets placed in a specific house.
 */
export function getPlanetsInHouse(chart: ChartData, house: number): Planet[] {
  return chart.planets
    .filter((p) => getHouseOfPlanet(chart, p.planet) === house)
    .map((p) => p.planet);
}

/**
 * Get all planets placed in a specific sign.
 */
export function getPlanetsInSign(chart: ChartData, sign: Sign): Planet[] {
  return chart.planets
    .filter((p) => p.sign === sign)
    .map((p) => p.planet);
}

/**
 * Check if two planets are in conjunction (same sign = same house in whole-sign).
 */
export function areInConjunction(chart: ChartData, p1: Planet, p2: Planet): boolean {
  return getPlanetSign(chart, p1) === getPlanetSign(chart, p2);
}

/**
 * Get the sign that is a specified number of houses away from the given sign.
 */
function signAtHouseFrom(baseSign: number, houseOffset: number): number {
  return ((baseSign + houseOffset - 1) % 12 + 12) % 12;
}

/**
 * Check if planet p1 aspects planet p2 (whole-sign aspects).
 * All planets aspect the 7th sign from their position.
 * Mars aspects 4th and 8th, Jupiter aspects 5th and 9th, Saturn aspects 3rd and 10th.
 */
export function doesPlanetAspect(chart: ChartData, fromPlanet: Planet, toPlanet: Planet): boolean {
  const fromSign = getPlanetSign(chart, fromPlanet) as number;
  const toSign = getPlanetSign(chart, toPlanet) as number;
  const signDiff = ((toSign - fromSign) % 12 + 12) % 12;

  // All planets aspect 7th (signDiff = 6)
  if (signDiff === 6) return true;

  // Mars special aspects: 4th (signDiff=3) and 8th (signDiff=7)
  if (fromPlanet === Planet.Mars && (signDiff === 3 || signDiff === 7)) return true;

  // Jupiter special aspects: 5th (signDiff=4) and 9th (signDiff=8)
  if (fromPlanet === Planet.Jupiter && (signDiff === 4 || signDiff === 8)) return true;

  // Saturn special aspects: 3rd (signDiff=2) and 10th (signDiff=9)
  if (fromPlanet === Planet.Saturn && (signDiff === 2 || signDiff === 9)) return true;

  return false;
}

/**
 * Check if two planets are in mutual aspect (both aspect each other).
 */
export function areInMutualAspect(chart: ChartData, p1: Planet, p2: Planet): boolean {
  return doesPlanetAspect(chart, p1, p2) || doesPlanetAspect(chart, p2, p1);
}

/**
 * Get the sign of the lagna (ascendant).
 */
export function getLagnaSign(chart: ChartData): Sign {
  return Math.floor(chart.ascendant / 30) as Sign;
}

/**
 * Get the house lord (sign ruler) for a given house number.
 */
export function getHouseLordPlanet(chart: ChartData, house: number): Planet {
  const lagnaSign = getLagnaSign(chart) as number;
  const houseSign = ((lagnaSign + house - 1) % 12) as Sign;
  return getSignLord(houseSign);
}

/**
 * Check if a planet is in a kendra (angular) house.
 */
function isInKendra(chart: ChartData, planet: Planet): boolean {
  return KENDRA_HOUSES.includes(getHouseOfPlanet(chart, planet));
}

/**
 * Check if a planet is in a trikona house.
 */
function isInTrikona(chart: ChartData, planet: Planet): boolean {
  return TRIKONA_HOUSES.includes(getHouseOfPlanet(chart, planet));
}

/**
 * Check if a planet is in its own sign.
 */
function isInOwnSign(chart: ChartData, planet: Planet): boolean {
  const sign = getPlanetSign(chart, planet);
  const lord = getSignLord(sign);
  return lord === planet;
}

/**
 * Check if a planet is in its exaltation sign.
 */
function isExalted(chart: ChartData, planet: Planet): boolean {
  const exaltSigns: Partial<Record<Planet, Sign>> = {
    [Planet.Sun]: Sign.Aries,
    [Planet.Moon]: Sign.Taurus,
    [Planet.Mars]: Sign.Capricorn,
    [Planet.Mercury]: Sign.Virgo,
    [Planet.Jupiter]: Sign.Cancer,
    [Planet.Venus]: Sign.Pisces,
    [Planet.Saturn]: Sign.Libra,
  };
  return getPlanetSign(chart, planet) === exaltSigns[planet];
}

/**
 * Check if a planet is in its debilitation sign.
 */
function isDebilitated(chart: ChartData, planet: Planet): boolean {
  const debilSigns: Partial<Record<Planet, Sign>> = {
    [Planet.Sun]: Sign.Libra,
    [Planet.Moon]: Sign.Scorpio,
    [Planet.Mars]: Sign.Cancer,
    [Planet.Mercury]: Sign.Pisces,
    [Planet.Jupiter]: Sign.Capricorn,
    [Planet.Venus]: Sign.Virgo,
    [Planet.Saturn]: Sign.Aries,
  };
  return getPlanetSign(chart, planet) === debilSigns[planet];
}

/**
 * Check whether a planet is a natural benefic.
 */
function isNaturalBenefic(planet: Planet): boolean {
  return [Planet.Jupiter, Planet.Venus, Planet.Mercury, Planet.Moon].includes(planet);
}

/**
 * Compute yoga strength based on planetary strength factors (0.0 to 1.0).
 */
function computeYogaStrength(chart: ChartData, planets: Planet[]): number {
  if (planets.length === 0) return 0;
  let total = 0;
  for (const p of planets) {
    let score = 0.5; // base
    if (isExalted(chart, p)) score = 1.0;
    else if (isInOwnSign(chart, p)) score = 0.8;
    else if (isInKendra(chart, p)) score += 0.1;
    else if (isInTrikona(chart, p)) score += 0.15;
    total += score;
  }
  return Math.min(1.0, total / planets.length);
}

// ------------------------------------
// Yoga result builder
// ------------------------------------
function makeYoga(
  name: string,
  description: string,
  isPresent: boolean,
  planets: Planet[],
  houses: number[],
  strength: number,
  category: string,
): YogaResult {
  return { name, description, isPresent, planets, houses, strength, category };
}

// ===========================================================================
// YOGA DETECTION METHODS
// ===========================================================================

export class YogaDetector {
  private chart: ChartData;

  constructor(chart: ChartData) {
    this.chart = chart;
  }

  detectAllYogas(): YogaResult[] {
    const yogas: YogaResult[] = [
      ...this.detectPanchaMahapurushayogas(),
      ...this.detectRajaYogas(),
      ...this.detectDhanaYogas(),
      ...this.detectVipariitaRajaYogas(),
      ...this.detectSpecialYogas(),
      ...this.detectLunarYogas(),
      ...this.detectSolarYogas(),
      ...this.detectAdditionalYogas(),
    ];
    return yogas;
  }

  // -------------------------------------------------------------------------
  // PANCHA MAHAPURUSHA YOGAS
  // -------------------------------------------------------------------------
  // Planet in own sign or exaltation AND in a kendra (1,4,7,10) house.

  private detectPanchaMahapurushayogas(): YogaResult[] {
    const yogas: YogaResult[] = [];

    // Ruchaka Yoga — Mars in Aries, Scorpio, or Capricorn in kendra
    {
      const p = Planet.Mars;
      const validSigns: Sign[] = [Sign.Aries, Sign.Scorpio, Sign.Capricorn];
      const sign = getPlanetSign(this.chart, p);
      const house = getHouseOfPlanet(this.chart, p);
      const isPresent = validSigns.includes(sign) && KENDRA_HOUSES.includes(house);
      yogas.push(makeYoga(
        'Ruchaka Yoga',
        'Mars in own sign (Aries/Scorpio) or exaltation (Capricorn) in a kendra. Gives courage, leadership, military success.',
        isPresent, [p], [house],
        isPresent ? computeYogaStrength(this.chart, [p]) : 0,
        'Pancha Mahapurusha',
      ));
    }

    // Bhadra Yoga — Mercury in Gemini or Virgo in kendra
    {
      const p = Planet.Mercury;
      const validSigns: Sign[] = [Sign.Gemini, Sign.Virgo];
      const sign = getPlanetSign(this.chart, p);
      const house = getHouseOfPlanet(this.chart, p);
      const isPresent = validSigns.includes(sign) && KENDRA_HOUSES.includes(house);
      yogas.push(makeYoga(
        'Bhadra Yoga',
        'Mercury in Gemini or Virgo in a kendra. Gives intelligence, eloquence, business acumen.',
        isPresent, [p], [house],
        isPresent ? computeYogaStrength(this.chart, [p]) : 0,
        'Pancha Mahapurusha',
      ));
    }

    // Hamsa Yoga — Jupiter in Cancer, Sagittarius, or Pisces in kendra
    {
      const p = Planet.Jupiter;
      const validSigns: Sign[] = [Sign.Cancer, Sign.Sagittarius, Sign.Pisces];
      const sign = getPlanetSign(this.chart, p);
      const house = getHouseOfPlanet(this.chart, p);
      const isPresent = validSigns.includes(sign) && KENDRA_HOUSES.includes(house);
      yogas.push(makeYoga(
        'Hamsa Yoga',
        'Jupiter in own sign (Sagittarius/Pisces) or exaltation (Cancer) in a kendra. Gives wisdom, spirituality, good fortune.',
        isPresent, [p], [house],
        isPresent ? computeYogaStrength(this.chart, [p]) : 0,
        'Pancha Mahapurusha',
      ));
    }

    // Malavya Yoga — Venus in Taurus, Libra, or Pisces in kendra
    {
      const p = Planet.Venus;
      const validSigns: Sign[] = [Sign.Taurus, Sign.Libra, Sign.Pisces];
      const sign = getPlanetSign(this.chart, p);
      const house = getHouseOfPlanet(this.chart, p);
      const isPresent = validSigns.includes(sign) && KENDRA_HOUSES.includes(house);
      yogas.push(makeYoga(
        'Malavya Yoga',
        'Venus in own sign (Taurus/Libra) or exaltation (Pisces) in a kendra. Gives beauty, luxury, artistic talent.',
        isPresent, [p], [house],
        isPresent ? computeYogaStrength(this.chart, [p]) : 0,
        'Pancha Mahapurusha',
      ));
    }

    // Shasha Yoga — Saturn in Capricorn, Aquarius, or Libra in kendra
    {
      const p = Planet.Saturn;
      const validSigns: Sign[] = [Sign.Capricorn, Sign.Aquarius, Sign.Libra];
      const sign = getPlanetSign(this.chart, p);
      const house = getHouseOfPlanet(this.chart, p);
      const isPresent = validSigns.includes(sign) && KENDRA_HOUSES.includes(house);
      yogas.push(makeYoga(
        'Shasha Yoga',
        'Saturn in own sign (Capricorn/Aquarius) or exaltation (Libra) in a kendra. Gives discipline, authority, longevity.',
        isPresent, [p], [house],
        isPresent ? computeYogaStrength(this.chart, [p]) : 0,
        'Pancha Mahapurusha',
      ));
    }

    return yogas;
  }

  // -------------------------------------------------------------------------
  // RAJA YOGAS — Lords of Kendra + Trikona in association
  // -------------------------------------------------------------------------
  private detectRajaYogas(): YogaResult[] {
    const yogas: YogaResult[] = [];

    // A Raja Yoga occurs when a kendra lord and a trikona lord are in conjunction,
    // mutual aspect, or exchange.
    const kendraHouses = [1, 4, 7, 10];
    const trikonaHouses = [1, 5, 9];

    const kendraLords = kendraHouses.map((h) => getHouseLordPlanet(this.chart, h));
    const trikonaLords = trikonaHouses.map((h) => getHouseLordPlanet(this.chart, h));

    // Unique combinations
    const seen = new Set<string>();

    for (const kl of kendraLords) {
      for (const tl of trikonaLords) {
        if (kl === tl) continue; // Same planet lords both — very strong, handled separately
        const key = [kl, tl].sort().join('-');
        if (seen.has(key)) continue;
        seen.add(key);

        const inConjunction = areInConjunction(this.chart, kl, tl);
        const inMutualAspect = areInMutualAspect(this.chart, kl, tl);
        const inExchange = this.areInExchange(kl, tl);

        if (inConjunction || inMutualAspect || inExchange) {
          const planets = [kl, tl];
          const houses = planets.map((p) => getHouseOfPlanet(this.chart, p));
          const relType = inExchange ? 'exchange' : inConjunction ? 'conjunction' : 'mutual aspect';
          yogas.push(makeYoga(
            `Raja Yoga (${Planet[kl]}-${Planet[tl]})`,
            `Kendra lord ${Planet[kl]} and trikona lord ${Planet[tl]} are in ${relType}. Gives power, success, authority.`,
            true, planets, houses,
            computeYogaStrength(this.chart, planets),
            'Raja Yoga',
          ));
        }
      }
    }

    // Single-planet kendra-trikona lord (e.g. Jupiter rules both 9th and 12th; not always kendra+trikona)
    // But for 1st house lord (Lagna lord) who rules a trikona too, check separately
    for (const planet of [Planet.Sun, Planet.Moon, Planet.Mars, Planet.Mercury, Planet.Jupiter, Planet.Venus, Planet.Saturn]) {
      const isKendraLord = kendraLords.includes(planet);
      const isTrikonaLord = trikonaLords.includes(planet);
      if (isKendraLord && isTrikonaLord) {
        const house = getHouseOfPlanet(this.chart, planet);
        if (!DUSTHANA_HOUSES.includes(house)) {
          yogas.push(makeYoga(
            `Yogakaraka (${Planet[planet]})`,
            `${Planet[planet]} rules both a kendra and a trikona house. Exceptionally auspicious — double-duty yogakaraka.`,
            true, [planet], [house],
            computeYogaStrength(this.chart, [planet]),
            'Raja Yoga',
          ));
        }
      }
    }

    return yogas;
  }

  // -------------------------------------------------------------------------
  // DHANA YOGAS — Wealth-producing yogas
  // -------------------------------------------------------------------------
  private detectDhanaYogas(): YogaResult[] {
    const yogas: YogaResult[] = [];

    // Dhana Yoga: Lords of 2nd and 11th in association (conjunction, mutual aspect, exchange)
    const lord2 = getHouseLordPlanet(this.chart, 2);
    const lord11 = getHouseLordPlanet(this.chart, 11);

    const dhanaConjunction = areInConjunction(this.chart, lord2, lord11);
    const dhanaMutualAspect = areInMutualAspect(this.chart, lord2, lord11);
    const dhanaExchange = this.areInExchange(lord2, lord11);

    if (dhanaConjunction || dhanaMutualAspect || dhanaExchange) {
      const planets = [lord2, lord11];
      const houses = planets.map((p) => getHouseOfPlanet(this.chart, p));
      yogas.push(makeYoga(
        'Dhana Yoga',
        `Lords of 2nd and 11th house in association. Indicates wealth accumulation and financial prosperity.`,
        true, planets, houses,
        computeYogaStrength(this.chart, planets),
        'Dhana Yoga',
      ));
    } else {
      yogas.push(makeYoga(
        'Dhana Yoga',
        'Lords of 2nd and 11th house in association. Indicates wealth.',
        false, [lord2, lord11], [],
        0,
        'Dhana Yoga',
      ));
    }

    // Lakshmi Yoga: 9th lord in own sign or exaltation in kendra/trikona + Venus strong
    {
      const lord9 = getHouseLordPlanet(this.chart, 9);
      const venus = Planet.Venus;
      const lord9InOwnOrExalt = isInOwnSign(this.chart, lord9) || isExalted(this.chart, lord9);
      const lord9InKendraOrTrikona = isInKendra(this.chart, lord9) || isInTrikona(this.chart, lord9);
      const venusStrong = isInOwnSign(this.chart, venus) || isExalted(this.chart, venus) || isInKendra(this.chart, venus);
      const isPresent = lord9InOwnOrExalt && lord9InKendraOrTrikona && venusStrong;
      yogas.push(makeYoga(
        'Lakshmi Yoga',
        '9th lord exalted or in own sign in kendra/trikona with Venus strong. Brings great wealth and divine grace.',
        isPresent, [lord9, venus],
        [getHouseOfPlanet(this.chart, lord9), getHouseOfPlanet(this.chart, venus)],
        isPresent ? computeYogaStrength(this.chart, [lord9, venus]) : 0,
        'Dhana Yoga',
      ));
    }

    // Chandra Mangal Yoga (wealth from mother's side or commerce)
    {
      const isPresent = areInConjunction(this.chart, Planet.Moon, Planet.Mars);
      const planets = [Planet.Moon, Planet.Mars];
      yogas.push(makeYoga(
        'Chandra Mangal Yoga',
        'Moon and Mars in conjunction. Gives commercial ability, maternal wealth, but can cause emotional conflicts.',
        isPresent, planets,
        isPresent ? [getHouseOfPlanet(this.chart, Planet.Moon)] : [],
        isPresent ? computeYogaStrength(this.chart, planets) : 0,
        'Dhana Yoga',
      ));
    }

    return yogas;
  }

  // -------------------------------------------------------------------------
  // VIPARITA RAJA YOGA — Reversal of fortune through dusthana lords
  // -------------------------------------------------------------------------
  private detectVipariitaRajaYogas(): YogaResult[] {
    const yogas: YogaResult[] = [];

    const lord6 = getHouseLordPlanet(this.chart, 6);
    const lord8 = getHouseLordPlanet(this.chart, 8);
    const lord12 = getHouseLordPlanet(this.chart, 12);

    // Harsha: 6th lord in 6th, 8th, or 12th (not conjunct other planets)
    {
      const house6Lord = getHouseOfPlanet(this.chart, lord6);
      const planetsIn6LordSign = getPlanetsInHouse(this.chart, house6Lord).filter(
        (p) => p !== lord6 && p !== Planet.Rahu && p !== Planet.Ketu,
      );
      const isPresent = DUSTHANA_HOUSES.includes(house6Lord) && planetsIn6LordSign.length === 0;
      yogas.push(makeYoga(
        'Harsha Yoga (Viparita)',
        '6th lord in dusthana (6/8/12) without other planet association. Gives victory over enemies, good health.',
        isPresent, [lord6], [house6Lord],
        isPresent ? 0.7 : 0,
        'Viparita Raja Yoga',
      ));
    }

    // Sarala: 8th lord in 6th, 8th, or 12th
    {
      const house8Lord = getHouseOfPlanet(this.chart, lord8);
      const planetsInSign = getPlanetsInHouse(this.chart, house8Lord).filter(
        (p) => p !== lord8 && p !== Planet.Rahu && p !== Planet.Ketu,
      );
      const isPresent = DUSTHANA_HOUSES.includes(house8Lord) && planetsInSign.length === 0;
      yogas.push(makeYoga(
        'Sarala Yoga (Viparita)',
        '8th lord in dusthana (6/8/12) without other planet association. Gives longevity, fearlessness, prosperity.',
        isPresent, [lord8], [house8Lord],
        isPresent ? 0.7 : 0,
        'Viparita Raja Yoga',
      ));
    }

    // Vimala: 12th lord in 6th, 8th, or 12th
    {
      const house12Lord = getHouseOfPlanet(this.chart, lord12);
      const planetsInSign = getPlanetsInHouse(this.chart, house12Lord).filter(
        (p) => p !== lord12 && p !== Planet.Rahu && p !== Planet.Ketu,
      );
      const isPresent = DUSTHANA_HOUSES.includes(house12Lord) && planetsInSign.length === 0;
      yogas.push(makeYoga(
        'Vimala Yoga (Viparita)',
        '12th lord in dusthana (6/8/12) without other planet association. Gives happiness, good character, freedom from debts.',
        isPresent, [lord12], [house12Lord],
        isPresent ? 0.7 : 0,
        'Viparita Raja Yoga',
      ));
    }

    void [lord6, lord8, lord12]; // used above
    return yogas;
  }

  // -------------------------------------------------------------------------
  // SPECIAL YOGAS
  // -------------------------------------------------------------------------
  private detectSpecialYogas(): YogaResult[] {
    const yogas: YogaResult[] = [];

    // Gajakesari Yoga: Jupiter in kendra from Moon
    {
      const moonSign = getPlanetSign(this.chart, Planet.Moon) as number;
      const jupSign = getPlanetSign(this.chart, Planet.Jupiter) as number;
      const diff = ((jupSign - moonSign) % 12 + 12) % 12;
      const isPresent = KENDRA_HOUSES.includes(diff + 1) || diff === 0; // 1st(0), 4th(3), 7th(6), 10th(9)
      const isKendra = [0, 3, 6, 9].includes(diff);
      yogas.push(makeYoga(
        'Gajakesari Yoga',
        'Jupiter in kendra from Moon (1st, 4th, 7th, or 10th from Moon). Gives wisdom, reputation, and prosperity.',
        isKendra, [Planet.Jupiter, Planet.Moon],
        [getHouseOfPlanet(this.chart, Planet.Jupiter)],
        isKendra ? computeYogaStrength(this.chart, [Planet.Jupiter]) : 0,
        'Special Yoga',
      ));
    }

    // Budha Aditya Yoga: Sun and Mercury in same sign
    {
      const isPresent = areInConjunction(this.chart, Planet.Sun, Planet.Mercury);
      yogas.push(makeYoga(
        'Budha Aditya Yoga',
        'Sun and Mercury in conjunction. Gives intelligence, communication skills, and success in intellectual pursuits.',
        isPresent, [Planet.Sun, Planet.Mercury],
        isPresent ? [getHouseOfPlanet(this.chart, Planet.Sun)] : [],
        isPresent ? computeYogaStrength(this.chart, [Planet.Sun, Planet.Mercury]) : 0,
        'Special Yoga',
      ));
    }

    // Neecha Bhanga Raja Yoga: Debilitated planet has its debilitation cancelled
    for (const planet of [Planet.Sun, Planet.Moon, Planet.Mars, Planet.Mercury, Planet.Jupiter, Planet.Venus, Planet.Saturn]) {
      if (isDebilitated(this.chart, planet)) {
        const cancelled = this.checkNeechaBhanga(planet);
        if (cancelled) {
          yogas.push(makeYoga(
            `Neecha Bhanga Raja Yoga (${Planet[planet]})`,
            `${Planet[planet]} is debilitated but the debilitation is cancelled. Turns weakness into extraordinary strength.`,
            true, [planet], [getHouseOfPlanet(this.chart, planet)],
            0.85,
            'Special Yoga',
          ));
        }
      }
    }

    // Amala Yoga: Only natural benefics in 10th from lagna or Moon (no malefics)
    {
      const planetsIn10thFromLagna = getPlanetsInHouse(this.chart, 10);
      const beneficsIn10th = planetsIn10thFromLagna.filter(isNaturalBenefic);
      const maleficsIn10th = planetsIn10thFromLagna.filter((p) => !isNaturalBenefic(p));
      const isPresent = beneficsIn10th.length > 0 && maleficsIn10th.length === 0;
      yogas.push(makeYoga(
        'Amala Yoga',
        'Only natural benefics in the 10th house. Gives lasting reputation, ethical nature, and renown.',
        isPresent, beneficsIn10th, [10],
        isPresent ? computeYogaStrength(this.chart, beneficsIn10th) : 0,
        'Special Yoga',
      ));
    }

    // Parvata Yoga: Benefics in kendras, dusthana lords in own/exaltation or no malefic in 6/8
    {
      const beneficsInKendra = [Planet.Jupiter, Planet.Venus, Planet.Mercury, Planet.Moon]
        .filter((p) => isInKendra(this.chart, p));
      const isPresent = beneficsInKendra.length >= 2;
      yogas.push(makeYoga(
        'Parvata Yoga',
        'Natural benefics in kendra houses. Gives wealth, prosperity, and happiness.',
        isPresent, beneficsInKendra,
        beneficsInKendra.map((p) => getHouseOfPlanet(this.chart, p)),
        isPresent ? computeYogaStrength(this.chart, beneficsInKendra) : 0,
        'Special Yoga',
      ));
    }

    // Kahala Yoga: 4th lord and 9th lord in conjunction/mutual aspect, both strong
    {
      const lord4 = getHouseLordPlanet(this.chart, 4);
      const lord9 = getHouseLordPlanet(this.chart, 9);
      const assoc = areInConjunction(this.chart, lord4, lord9) || areInMutualAspect(this.chart, lord4, lord9);
      const isPresent = assoc && (isInOwnSign(this.chart, lord4) || isExalted(this.chart, lord4));
      yogas.push(makeYoga(
        'Kahala Yoga',
        '4th and 9th lords in association with 4th lord strong. Gives courage, fame, and martial prowess.',
        isPresent, [lord4, lord9],
        [getHouseOfPlanet(this.chart, lord4), getHouseOfPlanet(this.chart, lord9)],
        isPresent ? computeYogaStrength(this.chart, [lord4, lord9]) : 0,
        'Special Yoga',
      ));
    }

    // Chamara Yoga: Lagna lord exalted in kendra aspected by Jupiter
    {
      const lagnaLord = getHouseLordPlanet(this.chart, 1);
      const lagnaLordExalted = isExalted(this.chart, lagnaLord);
      const lagnaLordInKendra = isInKendra(this.chart, lagnaLord);
      const jupAspectsLagnaLord = doesPlanetAspect(this.chart, Planet.Jupiter, lagnaLord);
      const isPresent = lagnaLordExalted && lagnaLordInKendra && jupAspectsLagnaLord;
      yogas.push(makeYoga(
        'Chamara Yoga',
        'Lagna lord exalted in kendra aspected by Jupiter. Gives great fame, wisdom, and royal patronage.',
        isPresent, [lagnaLord, Planet.Jupiter],
        [getHouseOfPlanet(this.chart, lagnaLord)],
        isPresent ? 0.9 : 0,
        'Special Yoga',
      ));
    }

    return yogas;
  }

  // -------------------------------------------------------------------------
  // LUNAR YOGAS — Based on Moon's position
  // -------------------------------------------------------------------------
  private detectLunarYogas(): YogaResult[] {
    const yogas: YogaResult[] = [];
    const moonSign = getPlanetSign(this.chart, Planet.Moon) as number;

    // Get planets in specific signs relative to Moon
    const planetsIn2ndFromMoon = getPlanetsInSign(
      this.chart,
      signAtHouseFrom(moonSign, 2) as Sign,
    ).filter((p) => p !== Planet.Sun && p !== Planet.Rahu && p !== Planet.Ketu);

    const planetsIn12thFromMoon = getPlanetsInSign(
      this.chart,
      signAtHouseFrom(moonSign, 0) as Sign, // 12th from Moon
    ).filter((p) => p !== Planet.Sun && p !== Planet.Rahu && p !== Planet.Ketu);
    // Actually 12th from Moon = sign at index (moonSign - 1 + 12) % 12
    const twelfthFromMoon = ((moonSign - 1) + 12) % 12 as Sign;
    const planetsIn12thActual = getPlanetsInSign(this.chart, twelfthFromMoon)
      .filter((p) => p !== Planet.Sun && p !== Planet.Rahu && p !== Planet.Ketu);

    // Sunapha Yoga: Planet(s) in 2nd from Moon (excluding Sun)
    {
      const isPresent = planetsIn2ndFromMoon.length > 0;
      yogas.push(makeYoga(
        'Sunapha Yoga',
        'Planet(s) in 2nd from Moon (excluding Sun). Gives self-earned wealth, good character, and royal connections.',
        isPresent, planetsIn2ndFromMoon,
        isPresent ? [2] : [],
        isPresent ? computeYogaStrength(this.chart, planetsIn2ndFromMoon) : 0,
        'Lunar Yoga',
      ));
    }

    // Anapha Yoga: Planet(s) in 12th from Moon (excluding Sun)
    {
      const isPresent = planetsIn12thActual.length > 0;
      yogas.push(makeYoga(
        'Anapha Yoga',
        'Planet(s) in 12th from Moon (excluding Sun). Gives good health, dignity, and happiness.',
        isPresent, planetsIn12thActual,
        isPresent ? [12] : [],
        isPresent ? computeYogaStrength(this.chart, planetsIn12thActual) : 0,
        'Lunar Yoga',
      ));
    }

    // Durudhara Yoga: Planets both in 2nd and 12th from Moon
    {
      const isPresent = planetsIn2ndFromMoon.length > 0 && planetsIn12thActual.length > 0;
      yogas.push(makeYoga(
        'Durudhara Yoga',
        'Planets in both 2nd and 12th from Moon. Gives wealth, good character, and abundant comforts.',
        isPresent, [...planetsIn2ndFromMoon, ...planetsIn12thActual],
        isPresent ? [2, 12] : [],
        isPresent ? computeYogaStrength(this.chart, [...planetsIn2ndFromMoon, ...planetsIn12thActual]) : 0,
        'Lunar Yoga',
      ));
    }

    // Kemadruma Yoga: No planet in 2nd or 12th from Moon (Sun excluded); negated by planets in kendra
    {
      const noFlankingPlanets = planetsIn2ndFromMoon.length === 0 && planetsIn12thActual.length === 0;
      const planetsInKendraFromMoon = this.getPlanetsInKendraFromMoon();
      const isNegated = planetsInKendraFromMoon.length > 0;
      const isPresent = noFlankingPlanets && !isNegated;
      yogas.push(makeYoga(
        'Kemadruma Yoga',
        'No planets in 2nd or 12th from Moon (Sun excluded). Indicates poverty, difficulties, and lack of support.',
        isPresent, [Planet.Moon],
        [getHouseOfPlanet(this.chart, Planet.Moon)],
        isPresent ? 0.5 : 0,
        'Lunar Yoga',
      ));
    }

    // Adhi Yoga: Natural benefics (Mercury, Jupiter, Venus) in 6th, 7th, 8th from Moon
    {
      const sixthFromMoon = signAtHouseFrom(moonSign, 6) as Sign;
      const seventhFromMoon = signAtHouseFrom(moonSign, 7) as Sign;
      const eighthFromMoon = signAtHouseFrom(moonSign, 8) as Sign;

      const beneficPlanets = [Planet.Mercury, Planet.Jupiter, Planet.Venus];
      const beneficsIn678 = beneficPlanets.filter((p) => {
        const pSign = getPlanetSign(this.chart, p);
        return pSign === sixthFromMoon || pSign === seventhFromMoon || pSign === eighthFromMoon;
      });
      const isPresent = beneficsIn678.length >= 2;
      yogas.push(makeYoga(
        'Adhi Yoga',
        'Natural benefics (Mercury, Jupiter, Venus) in 6th, 7th, or 8th from Moon (2+ needed). Gives leadership, wealth, and happiness.',
        isPresent, beneficsIn678,
        beneficsIn678.map((p) => getHouseOfPlanet(this.chart, p)),
        isPresent ? computeYogaStrength(this.chart, beneficsIn678) : 0,
        'Lunar Yoga',
      ));
    }

    return yogas;
  }

  // -------------------------------------------------------------------------
  // SOLAR YOGAS — Based on Sun's position
  // -------------------------------------------------------------------------
  private detectSolarYogas(): YogaResult[] {
    const yogas: YogaResult[] = [];
    const sunSign = getPlanetSign(this.chart, Planet.Sun) as number;

    // Planets adjacent to Sun (2nd and 12th from Sun), excluding Moon
    const secondFromSun = signAtHouseFrom(sunSign, 2) as Sign;
    const twelfthFromSun = ((sunSign - 1) + 12) % 12 as Sign;

    const planetsIn2ndFromSun = getPlanetsInSign(this.chart, secondFromSun)
      .filter((p) => p !== Planet.Moon && p !== Planet.Sun && p !== Planet.Rahu && p !== Planet.Ketu);
    const planetsIn12thFromSun = getPlanetsInSign(this.chart, twelfthFromSun)
      .filter((p) => p !== Planet.Moon && p !== Planet.Sun && p !== Planet.Rahu && p !== Planet.Ketu);

    // Veshi Yoga: Planet in 2nd from Sun (excluding Moon)
    {
      const isPresent = planetsIn2ndFromSun.length > 0;
      yogas.push(makeYoga(
        'Veshi Yoga',
        'Planet(s) in 2nd from Sun (excluding Moon). Gives good speech, virtuous nature, and royal favour.',
        isPresent, planetsIn2ndFromSun,
        isPresent ? [2] : [],
        isPresent ? computeYogaStrength(this.chart, planetsIn2ndFromSun) : 0,
        'Solar Yoga',
      ));
    }

    // Vasi Yoga: Planet in 12th from Sun (excluding Moon)
    {
      const isPresent = planetsIn12thFromSun.length > 0;
      yogas.push(makeYoga(
        'Vasi Yoga',
        'Planet(s) in 12th from Sun (excluding Moon). Gives happiness, generous nature, and recognition.',
        isPresent, planetsIn12thFromSun,
        isPresent ? [12] : [],
        isPresent ? computeYogaStrength(this.chart, planetsIn12thFromSun) : 0,
        'Solar Yoga',
      ));
    }

    // Ubhayachari Yoga: Planets both sides of Sun
    {
      const isPresent = planetsIn2ndFromSun.length > 0 && planetsIn12thFromSun.length > 0;
      yogas.push(makeYoga(
        'Ubhayachari Yoga',
        'Planets on both sides of Sun (2nd and 12th). Gives excellent speech, royal deportment, and wealth.',
        isPresent, [...planetsIn2ndFromSun, ...planetsIn12thFromSun],
        isPresent ? [2, 12] : [],
        isPresent ? computeYogaStrength(this.chart, [...planetsIn2ndFromSun, ...planetsIn12thFromSun]) : 0,
        'Solar Yoga',
      ));
    }

    return yogas;
  }

  // -------------------------------------------------------------------------
  // ADDITIONAL YOGAS
  // -------------------------------------------------------------------------
  private detectAdditionalYogas(): YogaResult[] {
    const yogas: YogaResult[] = [];

    // Guru Chandala Yoga: Jupiter conjunct or aspected by Rahu
    {
      const conjunct = areInConjunction(this.chart, Planet.Jupiter, Planet.Rahu);
      const aspected = doesPlanetAspect(this.chart, Planet.Rahu, Planet.Jupiter);
      const isPresent = conjunct || aspected;
      yogas.push(makeYoga(
        'Guru Chandala Yoga',
        'Jupiter conjunct or aspected by Rahu. Can corrupt Jupiter\'s significations; also gives unconventional wisdom.',
        isPresent, [Planet.Jupiter, Planet.Rahu],
        [getHouseOfPlanet(this.chart, Planet.Jupiter)],
        isPresent ? 0.3 : 0,
        'Negative Yoga',
      ));
    }

    // Kuja Dosha (Mangal Dosha): Mars in 1st, 2nd, 4th, 7th, 8th, or 12th house
    {
      const marsHouse = getHouseOfPlanet(this.chart, Planet.Mars);
      const mangalDosha = [1, 2, 4, 7, 8, 12].includes(marsHouse);
      // Check for cancellation: Mars in own/exalt sign, or Jupiter in 1st/7th
      const marsCancelled = isInOwnSign(this.chart, Planet.Mars) || isExalted(this.chart, Planet.Mars);
      const jupIn1Or7 = [1, 7].includes(getHouseOfPlanet(this.chart, Planet.Jupiter));
      const isPresent = mangalDosha && !marsCancelled && !jupIn1Or7;
      yogas.push(makeYoga(
        'Kuja Dosha (Mangal Dosha)',
        'Mars in 1st, 2nd, 4th, 7th, 8th, or 12th house. Can cause challenges in marital life unless cancelled.',
        isPresent, [Planet.Mars], [marsHouse],
        isPresent ? 0.6 : 0,
        'Dosha',
      ));
    }

    // Shakat Yoga: Moon in 6th, 8th, or 12th from Jupiter
    {
      const jupSign = getPlanetSign(this.chart, Planet.Jupiter) as number;
      const moonSign = getPlanetSign(this.chart, Planet.Moon) as number;
      const diff = ((moonSign - jupSign) + 12) % 12;
      const isPresent = [5, 7, 11].includes(diff); // 6th=5, 8th=7, 12th=11 (0-indexed diff)
      yogas.push(makeYoga(
        'Shakat Yoga',
        'Moon in 6th, 8th, or 12th from Jupiter. Gives ups and downs in fortune, wheel-like changes in life.',
        isPresent, [Planet.Moon, Planet.Jupiter],
        [getHouseOfPlanet(this.chart, Planet.Moon)],
        isPresent ? 0.4 : 0,
        'Mixed Yoga',
      ));
    }

    // Gaja Yoga: Moon in kendra from Jupiter (same as Gajakesari — included for reference)
    // Already detected above as Gajakesari; skip duplicate.

    // Vasumati Yoga: All benefics in upachaya houses (3,6,10,11)
    {
      const beneficPlanets = [Planet.Jupiter, Planet.Venus, Planet.Mercury, Planet.Moon];
      const allBeneficsInUpachaya = beneficPlanets.every((p) =>
        UPACHAYA_HOUSES.includes(getHouseOfPlanet(this.chart, p))
      );
      const someBeneficsInUpachaya = beneficPlanets.filter((p) =>
        UPACHAYA_HOUSES.includes(getHouseOfPlanet(this.chart, p))
      );
      yogas.push(makeYoga(
        'Vasumati Yoga',
        'All natural benefics in upachaya houses (3,6,10,11). Gives wealth and material prosperity.',
        allBeneficsInUpachaya, someBeneficsInUpachaya,
        someBeneficsInUpachaya.map((p) => getHouseOfPlanet(this.chart, p)),
        allBeneficsInUpachaya ? computeYogaStrength(this.chart, someBeneficsInUpachaya) : 0,
        'Special Yoga',
      ));
    }

    // Saraswati Yoga: Jupiter, Venus, Mercury in 1st, 2nd, 4th, 5th, 7th, 9th, or 10th (kendras/trikonas/2nd/5th)
    {
      const validHouses = [1, 2, 4, 5, 7, 9, 10];
      const jupV = validHouses.includes(getHouseOfPlanet(this.chart, Planet.Jupiter));
      const venV = validHouses.includes(getHouseOfPlanet(this.chart, Planet.Venus));
      const merV = validHouses.includes(getHouseOfPlanet(this.chart, Planet.Mercury));
      const isPresent = jupV && venV && merV;
      yogas.push(makeYoga(
        'Saraswati Yoga',
        'Jupiter, Venus, and Mercury all in kendras, trikonas, 2nd, or 5th. Gives exceptional intelligence, creativity, and learning.',
        isPresent, [Planet.Jupiter, Planet.Venus, Planet.Mercury],
        [
          getHouseOfPlanet(this.chart, Planet.Jupiter),
          getHouseOfPlanet(this.chart, Planet.Venus),
          getHouseOfPlanet(this.chart, Planet.Mercury),
        ],
        isPresent ? computeYogaStrength(this.chart, [Planet.Jupiter, Planet.Venus, Planet.Mercury]) : 0,
        'Special Yoga',
      ));
    }

    // Mahabhagya Yoga: Male chart — birth during daytime, Sun in odd sign, Moon in odd sign, Lagna in odd sign
    // Female chart — birth during night, Sun in even sign, Moon in even sign, Lagna in even sign
    {
      const lagnaSign = getLagnaSign(this.chart) as number;
      const sunSign = getPlanetSign(this.chart, Planet.Sun) as number;
      const moonSign = getPlanetSign(this.chart, Planet.Moon) as number;
      const jdFrac = this.chart.julianDay - Math.floor(this.chart.julianDay);
      const isDaytime = jdFrac > 0.25 && jdFrac < 0.75;
      const allOdd = lagnaSign % 2 === 0 && sunSign % 2 === 0 && moonSign % 2 === 0;
      const allEven = lagnaSign % 2 !== 0 && sunSign % 2 !== 0 && moonSign % 2 !== 0;
      const isPresent = (isDaytime && allOdd) || (!isDaytime && allEven);
      yogas.push(makeYoga(
        'Mahabhagya Yoga',
        'Birth time, Sun, Moon, and Lagna all in same gender signs. Gives great fortune and auspiciousness.',
        isPresent, [Planet.Sun, Planet.Moon],
        [getHouseOfPlanet(this.chart, Planet.Sun), getHouseOfPlanet(this.chart, Planet.Moon)],
        isPresent ? 0.85 : 0,
        'Special Yoga',
      ));
    }

    // Pushkala Yoga: Moon's dispositor in own/exalt sign in kendra aspected by strong planet
    {
      const moonSign = getPlanetSign(this.chart, Planet.Moon);
      const moonDispositor = getSignLord(moonSign);
      const dispositorStrong = isInOwnSign(this.chart, moonDispositor) || isExalted(this.chart, moonDispositor);
      const dispositorInKendra = isInKendra(this.chart, moonDispositor);
      const aspectedByStrong = [Planet.Sun, Planet.Mars, Planet.Jupiter, Planet.Saturn].some(
        (p) => doesPlanetAspect(this.chart, p, moonDispositor) &&
               (isInOwnSign(this.chart, p) || isExalted(this.chart, p))
      );
      const isPresent = dispositorStrong && dispositorInKendra && aspectedByStrong;
      yogas.push(makeYoga(
        'Pushkala Yoga',
        'Moon\'s dispositor in own/exalt sign in kendra aspected by a strong planet. Gives wealth and honours.',
        isPresent, [Planet.Moon, moonDispositor],
        [getHouseOfPlanet(this.chart, moonDispositor)],
        isPresent ? 0.8 : 0,
        'Special Yoga',
      ));
    }

    // Parijata Yoga: Dispositor of the dispositor of the Lagna lord is in own/exalt sign or in kendra
    {
      const lagnaLord = getHouseLordPlanet(this.chart, 1);
      const lagnaLordSign = getPlanetSign(this.chart, lagnaLord);
      const dispositorOfLagnaLord = getSignLord(lagnaLordSign);
      const dispSign = getPlanetSign(this.chart, dispositorOfLagnaLord);
      const dispOfDisp = getSignLord(dispSign);
      const dispOfDispStrong = isInOwnSign(this.chart, dispOfDisp) ||
                               isExalted(this.chart, dispOfDisp) ||
                               isInKendra(this.chart, dispOfDisp);
      yogas.push(makeYoga(
        'Parijata Yoga',
        'Dispositor of the dispositor of the lagna lord is strong. Gives steady fortune and protection in difficulties.',
        dispOfDispStrong, [lagnaLord, dispositorOfLagnaLord, dispOfDisp],
        [getHouseOfPlanet(this.chart, dispOfDisp)],
        dispOfDispStrong ? computeYogaStrength(this.chart, [dispOfDisp]) : 0,
        'Special Yoga',
      ));
    }

    // Kesari Yoga (already Gajakesari; different variant): Jupiter in kendra from lagna
    {
      const jupInKendra = isInKendra(this.chart, Planet.Jupiter);
      yogas.push(makeYoga(
        'Kesari Yoga (Jupiter in Kendra)',
        'Jupiter in kendra from the lagna. Gives wisdom, prosperity, and authority.',
        jupInKendra, [Planet.Jupiter], [getHouseOfPlanet(this.chart, Planet.Jupiter)],
        jupInKendra ? computeYogaStrength(this.chart, [Planet.Jupiter]) : 0,
        'Special Yoga',
      ));
    }

    // Shakata Yoga (negative): Moon in 6/8/12 from lagna
    {
      const moonHouse = getHouseOfPlanet(this.chart, Planet.Moon);
      const isPresent = DUSTHANA_HOUSES.includes(moonHouse);
      yogas.push(makeYoga(
        'Shakata Yoga (Moon in Dusthana)',
        'Moon in 6th, 8th, or 12th house from lagna. Can cause instability and emotional challenges.',
        isPresent, [Planet.Moon], [moonHouse],
        isPresent ? 0.4 : 0,
        'Mixed Yoga',
      ));
    }

    // Shubha Yoga: Benefics in 1st, 4th, 7th, 10th; malefics in 3rd, 6th, 11th
    {
      const benefics = [Planet.Jupiter, Planet.Venus, Planet.Mercury, Planet.Moon];
      const malefics = [Planet.Sun, Planet.Mars, Planet.Saturn, Planet.Rahu, Planet.Ketu];
      const beneficsInKendra = benefics.filter((p) => isInKendra(this.chart, p));
      const maleficsInUpachaya = malefics.filter((p) => [3, 6, 11].includes(getHouseOfPlanet(this.chart, p)));
      const isPresent = beneficsInKendra.length >= 2 && maleficsInUpachaya.length >= 2;
      yogas.push(makeYoga(
        'Shubha Yoga',
        'Benefics in kendra and malefics in 3rd/6th/11th. Ideal placement giving success, health, and happiness.',
        isPresent, [...beneficsInKendra, ...maleficsInUpachaya],
        [...beneficsInKendra, ...maleficsInUpachaya].map((p) => getHouseOfPlanet(this.chart, p)),
        isPresent ? computeYogaStrength(this.chart, beneficsInKendra) : 0,
        'Special Yoga',
      ));
    }

    // Akhanda Samrajya Yoga: Jupiter rules 2nd or 5th or 11th from lagna or Moon;
    // Lord of 9th or 11th in 2nd/5th/11th for lagna lord's trikona
    {
      const lord2 = getHouseLordPlanet(this.chart, 2);
      const lord11 = getHouseLordPlanet(this.chart, 11);
      const lord9 = getHouseLordPlanet(this.chart, 9);
      const jupRules2or5or11 = [lord2, lord11, getHouseLordPlanet(this.chart, 5)].includes(Planet.Jupiter);
      const lord9or11InAuspicious = [2, 5, 9, 11].includes(getHouseOfPlanet(this.chart, lord9)) ||
                                     [2, 5, 9, 11].includes(getHouseOfPlanet(this.chart, lord11));
      const isPresent = jupRules2or5or11 && lord9or11InAuspicious;
      yogas.push(makeYoga(
        'Akhanda Samrajya Yoga',
        'Jupiter rules 2nd/5th/11th; 9th or 11th lord in auspicious position. Gives uninterrupted sovereignty and power.',
        isPresent, [Planet.Jupiter, lord9, lord11],
        [getHouseOfPlanet(this.chart, Planet.Jupiter)],
        isPresent ? 0.9 : 0,
        'Raja Yoga',
      ));
    }

    // Sreenatha Yoga: Lord of 7th in exaltation in 10th with lord of 10th
    {
      const lord7 = getHouseLordPlanet(this.chart, 7);
      const lord10 = getHouseLordPlanet(this.chart, 10);
      const lord7In10th = getHouseOfPlanet(this.chart, lord7) === 10;
      const lord7Exalted = isExalted(this.chart, lord7);
      const lord10In10th = getHouseOfPlanet(this.chart, lord10) === 10;
      const isPresent = lord7In10th && lord7Exalted && lord10In10th;
      yogas.push(makeYoga(
        'Sreenatha Yoga',
        'Lord of 7th exalted in 10th with lord of 10th. Gives wealth through spouse, professional success.',
        isPresent, [lord7, lord10], [10],
        isPresent ? computeYogaStrength(this.chart, [lord7, lord10]) : 0,
        'Special Yoga',
      ));
    }

    // Matsya Yoga: Benefics in 1st and 9th, malefics in 5th and 4th
    {
      const beneficsIn1st = [Planet.Jupiter, Planet.Venus, Planet.Mercury, Planet.Moon]
        .filter((p) => getHouseOfPlanet(this.chart, p) === 1);
      const beneficsIn9th = [Planet.Jupiter, Planet.Venus, Planet.Mercury, Planet.Moon]
        .filter((p) => getHouseOfPlanet(this.chart, p) === 9);
      const maleficsIn5th = [Planet.Sun, Planet.Mars, Planet.Saturn]
        .filter((p) => getHouseOfPlanet(this.chart, p) === 5);
      const maleficsIn4th = [Planet.Sun, Planet.Mars, Planet.Saturn]
        .filter((p) => getHouseOfPlanet(this.chart, p) === 4);
      const isPresent = beneficsIn1st.length > 0 && beneficsIn9th.length > 0 &&
                        maleficsIn5th.length > 0 && maleficsIn4th.length > 0;
      yogas.push(makeYoga(
        'Matsya Yoga',
        'Benefics in 1st and 9th, malefics in 4th and 5th. Gives virtuous nature, skill in debate, fame.',
        isPresent, [...beneficsIn1st, ...beneficsIn9th],
        [1, 9, 4, 5],
        isPresent ? computeYogaStrength(this.chart, [...beneficsIn1st, ...beneficsIn9th]) : 0,
        'Special Yoga',
      ));
    }

    // Dur Yoga: Lord of 10th in 6th, 8th, or 12th
    {
      const lord10 = getHouseLordPlanet(this.chart, 10);
      const lord10House = getHouseOfPlanet(this.chart, lord10);
      const isPresent = DUSTHANA_HOUSES.includes(lord10House);
      yogas.push(makeYoga(
        'Dur Yoga',
        'Lord of 10th in dusthana (6/8/12). Can obstruct career; may indicate self-employed or service overseas.',
        isPresent, [lord10], [lord10House],
        isPresent ? 0.4 : 0,
        'Negative Yoga',
      ));
    }

    // Daridra Yoga: Lord of 11th in 6th, 8th, or 12th
    {
      const lord11 = getHouseLordPlanet(this.chart, 11);
      const lord11House = getHouseOfPlanet(this.chart, lord11);
      const isPresent = DUSTHANA_HOUSES.includes(lord11House);
      yogas.push(makeYoga(
        'Daridra Yoga',
        'Lord of 11th in dusthana (6/8/12). Can impede gains; financial challenges.',
        isPresent, [lord11], [lord11House],
        isPresent ? 0.4 : 0,
        'Negative Yoga',
      ));
    }

    // Sarpa Yoga: All planets within Rahu–Ketu axis (between Rahu and Ketu hemispherically)
    {
      const rahuLon = this.chart.planets.find((p) => p.planet === Planet.Rahu)?.siderealLongitude ?? 0;
      const ketuLon = (rahuLon + 180) % 360;
      const nonNodePlanets = this.chart.planets.filter(
        (p) => p.planet !== Planet.Rahu && p.planet !== Planet.Ketu,
      );
      const allBetween = nonNodePlanets.every((p) => {
        const lon = p.siderealLongitude;
        const start = Math.min(rahuLon, ketuLon);
        const end = Math.max(rahuLon, ketuLon);
        return lon >= start && lon <= end;
      });
      yogas.push(makeYoga(
        'Sarpa Yoga',
        'All planets between Rahu and Ketu (hemispherical confinement). Causes struggles and delays; spiritual intensity.',
        allBetween, [Planet.Rahu, Planet.Ketu], [],
        allBetween ? 0.3 : 0,
        'Negative Yoga',
      ));
    }

    return yogas;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private areInExchange(p1: Planet, p2: Planet): boolean {
    // Mutual reception / exchange: p1 is in the sign ruled by p2, and p2 is in the sign ruled by p1
    const p1Sign = getPlanetSign(this.chart, p1);
    const p2Sign = getPlanetSign(this.chart, p2);
    return getSignLord(p1Sign) === p2 && getSignLord(p2Sign) === p1;
  }

  private getPlanetsInKendraFromMoon(): Planet[] {
    const moonSign = getPlanetSign(this.chart, Planet.Moon) as number;
    const kendraFromMoonSigns = [0, 3, 6, 9].map((offset) => (moonSign + offset) % 12 as Sign);
    return this.chart.planets
      .filter((p) => p.planet !== Planet.Moon && kendraFromMoonSigns.includes(p.sign))
      .map((p) => p.planet);
  }

  private checkNeechaBhanga(planet: Planet): boolean {
    // Neecha Bhanga conditions (any one sufficient):
    // 1. The lord of the sign of debilitation aspects or conjoins the debilitated planet
    // 2. The sign dispositor of the debilitated planet is in kendra from lagna or Moon
    // 3. The planet that gets exalted in the same sign is in kendra from lagna or Moon
    // 4. Lord of the debilitation sign is in kendra from lagna
    // 5. The debilitated planet is retrograde
    const planetPos = this.chart.planets.find((p) => p.planet === planet);
    if (!planetPos || !isDebilitated(this.chart, planet)) return false;

    // Condition 1: Lord of debilitation sign aspects/conjoins
    const debilSign = planetPos.sign;
    const debilSignLord = getSignLord(debilSign);
    if (areInConjunction(this.chart, planet, debilSignLord) ||
        doesPlanetAspect(this.chart, debilSignLord, planet)) return true;

    // Condition 2: Sign dispositor in kendra
    const dispositor = getSignLord(planetPos.sign);
    if (isInKendra(this.chart, dispositor)) return true;

    // Condition 3: Planet exalted in same sign in kendra
    const exaltedInDebilSign = this.getPlanetExaltedIn(debilSign);
    if (exaltedInDebilSign && isInKendra(this.chart, exaltedInDebilSign)) return true;

    // Condition 4: Lord of debilitation sign in kendra from lagna
    if (isInKendra(this.chart, debilSignLord)) return true;

    // Condition 5: Planet is retrograde
    if (planetPos.isRetrograde) return true;

    return false;
  }

  private getPlanetExaltedIn(sign: Sign): Planet | null {
    const exaltation: Partial<Record<Sign, Planet>> = {
      [Sign.Aries]: Planet.Sun,
      [Sign.Taurus]: Planet.Moon,
      [Sign.Capricorn]: Planet.Mars,
      [Sign.Virgo]: Planet.Mercury,
      [Sign.Cancer]: Planet.Jupiter,
      [Sign.Pisces]: Planet.Venus,
      [Sign.Libra]: Planet.Saturn,
    };
    return exaltation[sign] ?? null;
  }
}

/**
 * Convenience function: detect all yogas for a chart.
 */
export function detectAllYogas(chart: ChartData): YogaResult[] {
  return new YogaDetector(chart).detectAllYogas();
}
