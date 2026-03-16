import { getJulianDay, getPlanetPosition, getAscendant, getSiderealLongitude } from '../ephemeris/swissEph.js';
import { getNakshatra, NAKSHATRA_LORD } from './dashas.js';
import { Planet, Sign, type ChartData, type PlanetPosition, type DashaPeriod } from '../types/index.js';

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

/**
 * Own signs and exalted signs for each planet (Sign enum: 0=Aries, 1=Taurus, etc.)
 */
const PLANET_OWN_SIGNS: Record<Planet, Sign[]> = {
  [Planet.Sun]: [Sign.Leo],
  [Planet.Moon]: [Sign.Cancer],
  [Planet.Mars]: [Sign.Aries, Sign.Scorpio],
  [Planet.Mercury]: [Sign.Virgo, Sign.Gemini],
  [Planet.Jupiter]: [Sign.Sagittarius, Sign.Pisces],
  [Planet.Venus]: [Sign.Taurus, Sign.Libra],
  [Planet.Saturn]: [Sign.Capricorn, Sign.Aquarius],
  [Planet.Rahu]: [Sign.Aquarius],
  [Planet.Ketu]: [Sign.Scorpio],
};

export const PLANET_EXALTED_SIGNS: Record<Planet, Sign> = {
  [Planet.Sun]: Sign.Aries,
  [Planet.Moon]: Sign.Taurus,
  [Planet.Mars]: Sign.Capricorn,
  [Planet.Mercury]: Sign.Virgo,
  [Planet.Jupiter]: Sign.Cancer,
  [Planet.Venus]: Sign.Pisces,
  [Planet.Saturn]: Sign.Libra,
  [Planet.Rahu]: Sign.Taurus,
  [Planet.Ketu]: Sign.Scorpio,
};

export const PLANET_DEBILITATED_SIGNS: Record<Planet, Sign> = {
  [Planet.Sun]: Sign.Libra,
  [Planet.Moon]: Sign.Scorpio,
  [Planet.Mars]: Sign.Cancer,
  [Planet.Mercury]: Sign.Pisces,
  [Planet.Jupiter]: Sign.Capricorn,
  [Planet.Venus]: Sign.Virgo,
  [Planet.Saturn]: Sign.Aries,
  [Planet.Rahu]: Sign.Scorpio,
  [Planet.Ketu]: Sign.Taurus,
};

/**
 * Functional benefics and malefics based on Lagna (Ascendant sign)
 * Key: Lagna sign, Value: { benefics: planets, malefics: planets }
 */
export const FUNCTIONAL_NATURES: Record<Sign, { benefics: Planet[]; malefics: Planet[]; yogakaraka: Planet | null }> = {
  [Sign.Aries]: {
    benefics: [Planet.Sun, Planet.Moon, Planet.Jupiter,Planet.Mars],
    malefics: [Planet.Saturn, Planet.Venus, Planet.Rahu, Planet.Ketu],
    yogakaraka: null,
  },
  [Sign.Taurus]: {
    benefics: [Planet.Moon, Planet.Mars, Planet.Saturn, Planet.Venus],
    malefics: [Planet.Mercury, Planet.Rahu, Planet.Ketu],
    yogakaraka: Planet.Saturn,
  },
  [Sign.Gemini]: {
    benefics: [Planet.Mercury, Planet.Venus, Planet.Saturn],
    malefics: [Planet.Moon, Planet.Rahu, Planet.Ketu],
    yogakaraka: null,
  },
  [Sign.Cancer]: {
    benefics: [Planet.Moon, Planet.Jupiter, Planet.Mars],
    malefics: [Planet.Saturn, Planet.Venus, Planet.Rahu, Planet.Ketu],
    yogakaraka: Planet.Jupiter,
  },
  [Sign.Leo]: {
    benefics: [Planet.Sun, Planet.Mercury, Planet.Jupiter],
    malefics: [Planet.Saturn, Planet.Moon, Planet.Rahu, Planet.Ketu],
    yogakaraka: null,
  },
  [Sign.Virgo]: {
    benefics: [Planet.Mercury, Planet.Venus, Planet.Saturn],
    malefics: [Planet.Moon, Planet.Rahu, Planet.Ketu, Planet.Jupiter],
    yogakaraka: null,
  },
  [Sign.Libra]: {
    benefics: [Planet.Venus, Planet.Mercury, Planet.Saturn],
    malefics: [Planet.Sun, Planet.Moon, Planet.Mars, Planet.Rahu, Planet.Ketu],
    yogakaraka: Planet.Saturn,
  },
  [Sign.Scorpio]: {
    benefics: [Planet.Mars, Planet.Jupiter, Planet.Saturn],
    malefics: [Planet.Venus, Planet.Mercury, Planet.Rahu, Planet.Ketu],
    yogakaraka: Planet.Mars,
  },
  [Sign.Sagittarius]: {
    benefics: [Planet.Jupiter, Planet.Sun, Planet.Moon],
    malefics: [Planet.Venus, Planet.Mercury, Planet.Rahu, Planet.Ketu],
    yogakaraka: null,
  },
  [Sign.Capricorn]: {
    benefics: [Planet.Saturn, Planet.Mercury, Planet.Venus],
    malefics: [Planet.Moon, Planet.Jupiter, Planet.Rahu, Planet.Ketu],
    yogakaraka: Planet.Mars,
  },
  [Sign.Aquarius]: {
    benefics: [Planet.Saturn, Planet.Rahu, Planet.Venus],
    malefics: [Planet.Sun, Planet.Moon, Planet.Jupiter, Planet.Mars, Planet.Ketu],
    yogakaraka: null,
  },
  [Sign.Pisces]: {
    benefics: [Planet.Jupiter, Planet.Venus, Planet.Moon],
    malefics: [Planet.Mercury, Planet.Saturn, Planet.Rahu, Planet.Ketu],
    yogakaraka: Planet.Venus,
  },
};

/**
 * Friendly nakshatras from birth star (returns true if nakshatra is friendly)
 * Based on Tara Bala (birth star friendship)
 */
function isFriendlyNakshatra(birthNakshatra: number, targetNakshatra: number): boolean {
  // Friend: +1, +7, +9, +13, +19, +21, +25 from birth nakshatra
  // Neutral: +2, +4, +8, +12, +14, +16, +18, +22, +24, +26
  // Enemy: +3, +5, +6, +10, +11, +15, +17, +20, +23
  const friendlyOffsets = [1, 7, 9, 13, 19, 21, 25];
  const offset = (targetNakshatra - birthNakshatra + 27) % 27;
  return friendlyOffsets.includes(offset);
}

/**
 * Check if planet is in own sign or exalted
 */
export function isPlanetInOwnOrExalted(planet: Planet, sign: Sign): boolean {
  const ownSigns = PLANET_OWN_SIGNS[planet] || [];
  if (ownSigns.includes(sign)) return true;
  if (PLANET_EXALTED_SIGNS[planet] === sign) return true;
  return false;
}

/**
 * Check if planet is in debilitated sign
 */
export function isPlanetInDebilitated(planet: Planet, sign: Sign): boolean {
  return PLANET_DEBILITATED_SIGNS[planet] === sign;
}

/**
 * Check if a planet is a functional benefic for the given Lagna
 */
export function isFunctionalBenefic(planet: Planet, lagnaSign: Sign): boolean {
  const nature = FUNCTIONAL_NATURES[lagnaSign];
  return nature.benefics.includes(planet);
}

/**
 * Get house number from Lagna (0-based index where Lagna=0 is 1st house)
 */
function getHouseFromLagna(planetSign: Sign, lagnaSign: Sign): number {
  return (planetSign - lagnaSign + 12) % 12;
}

/**
 * Check if planet is in Kendra (1st, 4th, 7th, 10th) from Lagna
 */
export function isInKendra(planetSign: Sign, lagnaSign: Sign): boolean {
  const house = getHouseFromLagna(planetSign, lagnaSign);
  return house === 0 || house === 3 || house === 6 || house === 9;
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
 *
 * Scoring factors (max 100 points):
 * - Prana Dasha lord is functional benefic? (+20)
 * - Transit Lagna in Kendra from natal Lagna? (+20)
 * - Moon in friendly Nakshatra from birth star? (+20)
 * - Moon in own sign or exalted? (+20)
 * - Moon is NOT in debilitated sign? (+20)
 */
export function calculateHourlyScore(
  transit: TransitPosition,
  dashaPlanet: Planet | null,
  chart: ChartData,
): number {
  let score = 50; // Base score

  // Get natal Lagna sign from chart
  const natalLagnaSign = Math.floor(chart.ascendant / 30) as Sign;
  const natalMoon = chart.planets.find(p => p.planet === Planet.Moon);
  const natalMoonNakshatra = natalMoon?.nakshatra ?? 0;

  // Factor 1: Prana Dasha lord is functional benefic? (+20)
  if (dashaPlanet !== null) {
    if (isFunctionalBenefic(dashaPlanet, natalLagnaSign)) {
      score += 20;
    }
  }

  // Factor 2: Transit Lagna in Kendra from natal Lagna? (+20)
  // Kendra = 1st, 4th, 7th, 10th houses
  if (isInKendra(transit.lagnaSign, natalLagnaSign)) {
    score += 20;
  }

  // Factor 3: Moon in friendly Nakshatra from birth star? (+20)
  if (isFriendlyNakshatra(natalMoonNakshatra, transit.moonNakshatra)) {
    score += 20;
  }

  // Factor 4: Moon in own sign or exalted? (+20)
  const moonSign = transit.moonSign as Sign;
  const birthMoon = chart.planets.find(p => p.planet === Planet.Moon);
  const birthMoonPlanet = birthMoon?.planet ?? Planet.Moon;
  if (isPlanetInOwnOrExalted(birthMoonPlanet, moonSign)) {
    score += 20;
  }

  // Factor 5: Moon is NOT in debilitated sign (+20) or is (-20)
  if (isPlanetInDebilitated(birthMoonPlanet, moonSign)) {
    score -= 20;
  } else {
    score += 20;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Category-based hourly predictions.
 */
export interface HourlyCategories {
  career: string;
  finance: string;
  health: string;
  relationships: string;
  education: string;
  overall: string;
}

/**
 * Category trend assessment for aggregation.
 */
export type CategoryTrend = 'positive' | 'negative' | 'neutral';

/**
 * Daily aggregation of hourly predictions.
 */
export interface DailyAggregation {
  date: string;
  avgScore: number;
  bestHour: number;
  bestScore: number;
  worstHour: number;
  worstScore: number;
  categories: {
    career: CategoryTrend;
    finance: CategoryTrend;
    health: CategoryTrend;
    relationships: CategoryTrend;
    education: CategoryTrend;
  };
  significantEvents: string[];
}

/**
 * Weekly aggregation summary.
 */
export interface WeeklyAggregation {
  week: number;
  startDate: string;
  endDate: string;
  avgScore: number;
  highlight: string;
  bestDay: string;
  worstDay: string;
}

/**
 * Monthly prediction result.
 */
export interface MonthlyPrediction {
  month: number;
  year: number;
  daysInMonth: number;
  daily: DailyAggregation[];
  weekly: WeeklyAggregation[];
  monthly: {
    avgScore: number;
    bestDays: string[];
    worstDays: string[];
    categoryHighlights: {
      career: { positive: string[]; negative: string[] };
      finance: { positive: string[]; negative: string[] };
      health: { positive: string[]; negative: string[] };
      relationships: { positive: string[]; negative: string[] };
      education: { positive: string[]; negative: string[] };
    };
  };
}

/**
 * Generate category-based hourly predictions.
 */
export function calculateHourlyCategories(
  transit: TransitPosition,
  dashaPlanet: Planet | null,
  chart: ChartData,
): HourlyCategories {
  const natalLagnaSign = Math.floor(chart.ascendant / 30) as Sign;
  const natalMoon = chart.planets.find(p => p.planet === Planet.Moon);
  const natalMoonNakshatra = natalMoon?.nakshatra ?? 0;

  // Determine if dasha planet is functional benefic
  const isDashaFavorable = dashaPlanet ? isFunctionalBenefic(dashaPlanet, natalLagnaSign) : true;

  // Check if Moon is in friendly nakshatra
  const isMoonFriendly = isFriendlyNakshatra(natalMoonNakshatra, transit.moonNakshatra);

  // Check Lagna position
  const isLagnaKendra = isInKendra(transit.lagnaSign, natalLagnaSign);

  // Check Moon sign strength
  const moonSign = transit.moonSign as Sign;
  const birthMoon = chart.planets.find(p => p.planet === Planet.Moon);
  const birthMoonPlanet = birthMoon?.planet ?? Planet.Moon;
  const isMoonStrong = isPlanetInOwnOrExalted(birthMoonPlanet, moonSign);
  const isMoonWeak = isPlanetInDebilitated(birthMoonPlanet, moonSign);

  const categories: HourlyCategories = {
    career: '',
    finance: '',
    health: '',
    relationships: '',
    education: '',
    overall: '',
  };

  // Career (based on Saturn/dasha planet and Lagna)
  if (dashaPlanet === Planet.Saturn) {
    categories.career = isDashaFavorable
      ? "Strong career influence. Good for workplace decisions."
      : "Career challenges may arise. Be cautious.";
  } else if (isLagnaKendra) {
    categories.career = "Transit Lagna in Kendra supports professional activities.";
  } else {
    categories.career = "Neutral for career. Not ideal for major moves.";
  }

  // Finance (based on Jupiter/Venus)
  if (dashaPlanet === Planet.Jupiter || dashaPlanet === Planet.Venus) {
    categories.finance = isDashaFavorable
      ? "Favorable for finances. Good for investments."
      : "Financial caution advised.";
  } else if (isMoonStrong) {
    categories.finance = "Moon in strong position supports financial planning.";
  } else {
    categories.finance = "Neutral for finances.";
  }

  // Health (based on Mars/Rahu)
  if (dashaPlanet === Planet.Mars || dashaPlanet === Planet.Rahu) {
    categories.health = "Potential health issues. Take precautions.";
  } else if (isMoonWeak) {
    categories.health = "Mental peace may be affected.";
  } else {
    categories.health = "Good for health.";
  }

  // Relationships (based on Venus)
  if (dashaPlanet === Planet.Venus) {
    categories.relationships = isDashaFavorable
      ? "Excellent for relationships and partnerships."
      : "Relationship tensions possible.";
  } else {
    categories.relationships = isMoonFriendly
      ? "Moon in friendly nakshatra supports connections."
      : "Relationships neutral today.";
  }

  // Education (based on Jupiter)
  if (dashaPlanet === Planet.Jupiter) {
    categories.education = "Strong for learning and teaching.";
  } else {
    categories.education = "Normal for education.";
  }

  // Overall
  let positiveCount = 0;
  if (isDashaFavorable) positiveCount++;
  if (isLagnaKendra) positiveCount++;
  if (isMoonFriendly) positiveCount++;
  if (isMoonStrong) positiveCount++;

  if (positiveCount >= 3) categories.overall = "Overall: Very good day.";
  else if (positiveCount >= 2) categories.overall = "Overall: Good day.";
  else if (positiveCount >= 1) categories.overall = "Overall: Moderate day.";
  else categories.overall = "Overall: Challenging day.";

  return categories;
}

/**
 * Parse category text to get trend assessment.
 */
function parseCategoryTrend(categoryText: string): CategoryTrend {
  const lower = categoryText.toLowerCase();
  if (lower.includes('very good') || lower.includes('excellent') || lower.includes('favorable')) {
    return 'positive';
  }
  if (lower.includes('challenging') || lower.includes('caution') || lower.includes('difficult')) {
    return 'negative';
  }
  return 'neutral';
}

/**
 * Generate hourly predictions for a specific date (used by aggregation).
 */
export interface HourlyPredictionData {
  hour: number;
  score: number;
  categories: HourlyCategories;
  transit: TransitPosition;
  dashaPlanet: Planet | null;
}

/**
 * Generate predictions for a full month and aggregate them.
 */
export function generateMonthlyPredictions(
  year: number,
  month: number,
  latitude: number,
  longitude: number,
  utcOffset: number,
  chart: ChartData,
  dashas: DashaPeriod[],
): MonthlyPrediction {
  const daily: DailyAggregation[] = [];
  const monthStr = String(month).padStart(2, '0');

  // Get days in month
  const daysInMonth = new Date(year, month, 0).getDate();

  // Process each day
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dateStr = `${year}-${monthStr}-${String(day).padStart(2, '0')}`;

    // Generate hourly predictions for this day
    const hourlyPredictions: HourlyPredictionData[] = [];

    for (let hour = 0; hour < 24; hour++) {
      const hourDate = new Date(date);
      hourDate.setHours(hour, 0, 0, 0);

      try {
        const transit = calculateTransit(hourDate, latitude, longitude, utcOffset);
        const dashaAtTime = getDashaAtDateForAggregation(dashas, hourDate);
        const score = calculateHourlyScore(transit, dashaAtTime?.prana.planet ?? null, chart);
        const categories = calculateHourlyCategories(transit, dashaAtTime?.prana.planet ?? null, chart);

        hourlyPredictions.push({
          hour,
          score,
          categories,
          transit,
          dashaPlanet: dashaAtTime?.prana.planet ?? null,
        });
      } catch (e) {
        // Skip invalid hours
      }
    }

    if (hourlyPredictions.length === 0) continue;

    // Aggregate hourly predictions for the day
    const scores = hourlyPredictions.map(h => h.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Find best and worst hours
    let bestHour = 0, bestScore = hourlyPredictions[0]?.score ?? 50;
    let worstHour = 0, worstScore = hourlyPredictions[0]?.score ?? 50;
    for (let i = 0; i < hourlyPredictions.length; i++) {
      const hourScore = hourlyPredictions[i]?.score ?? 50;
      if (hourScore > bestScore) {
        bestScore = hourScore;
        bestHour = i;
      }
      if (hourScore < worstScore) {
        worstScore = hourScore;
        worstHour = i;
      }
    }

    // Determine category trends
    const categoryTrends: DailyAggregation['categories'] = {
      career: 'neutral',
      finance: 'neutral',
      health: 'neutral',
      relationships: 'neutral',
      education: 'neutral',
    };

    // Count positive/negative for each category
    const categoryCounts = {
      career: { positive: 0, negative: 0, total: 0 },
      finance: { positive: 0, negative: 0, total: 0 },
      health: { positive: 0, negative: 0, total: 0 },
      relationships: { positive: 0, negative: 0, total: 0 },
      education: { positive: 0, negative: 0, total: 0 },
    };

    for (const hp of hourlyPredictions) {
      const cats = hp.categories;
      categoryCounts.career.total++;
      categoryCounts.finance.total++;
      categoryCounts.health.total++;
      categoryCounts.relationships.total++;
      categoryCounts.education.total++;

      const careerTrend = parseCategoryTrend(cats.career);
      if (careerTrend === 'positive') categoryCounts.career.positive++;
      else if (careerTrend === 'negative') categoryCounts.career.negative++;

      const financeTrend = parseCategoryTrend(cats.finance);
      if (financeTrend === 'positive') categoryCounts.finance.positive++;
      else if (financeTrend === 'negative') categoryCounts.finance.negative++;

      const healthTrend = parseCategoryTrend(cats.health);
      if (healthTrend === 'positive') categoryCounts.health.positive++;
      else if (healthTrend === 'negative') categoryCounts.health.negative++;

      const relTrend = parseCategoryTrend(cats.relationships);
      if (relTrend === 'positive') categoryCounts.relationships.positive++;
      else if (relTrend === 'negative') categoryCounts.relationships.negative++;

      const eduTrend = parseCategoryTrend(cats.education);
      if (eduTrend === 'positive') categoryCounts.education.positive++;
      else if (eduTrend === 'negative') categoryCounts.education.negative++;
    }

    // Determine trend based on majority
    for (const cat of ['career', 'finance', 'health', 'relationships', 'education'] as const) {
      const counts = categoryCounts[cat];
      if (counts.positive > counts.total / 2) {
        categoryTrends[cat] = 'positive';
      } else if (counts.negative > counts.total / 2) {
        categoryTrends[cat] = 'negative';
      }
    }

    // Collect significant events
    const significantEvents: string[] = [];

    // Check for best hour transit
    const bestTransit = hourlyPredictions[bestHour]?.transit;
    if (bestTransit) {
      const moonSign = bestTransit.moonSign as Sign;
      if (isPlanetInOwnOrExalted(Planet.Moon, moonSign)) {
        significantEvents.push(`Moon in own/exalted sign at best hour`);
      }
      if (isInKendra(bestTransit.lagnaSign as Sign, Math.floor(chart.ascendant / 30) as Sign)) {
        significantEvents.push(`Lagna in Kendra at best hour`);
      }
    }

    // Check for worst hour transit
    const worstTransit = hourlyPredictions[worstHour]?.transit;
    if (worstTransit) {
      const moonSign = worstTransit.moonSign as Sign;
      if (isPlanetInDebilitated(Planet.Moon, moonSign)) {
        significantEvents.push(`Moon in debilitated sign at worst hour`);
      }
    }

    daily.push({
      date: dateStr,
      avgScore: Math.round(avgScore),
      bestHour,
      bestScore: Math.round(bestScore),
      worstHour,
      worstScore: Math.round(worstScore),
      categories: categoryTrends,
      significantEvents,
    });
  }

  // Aggregate by week
  const weekly: WeeklyAggregation[] = [];
  const weeksInMonth = Math.ceil(daily.length / 7);

  for (let w = 0; w < weeksInMonth; w++) {
    const weekStart = w * 7;
    const weekEnd = Math.min(weekStart + 7, daily.length);
    const weekDays = daily.slice(weekStart, weekEnd);

    if (weekDays.length === 0) continue;

    const weekAvg = weekDays.reduce((a, d) => a + d.avgScore, 0) / weekDays.length;
    const firstDay = weekDays[0]!;
    const bestDay = weekDays.reduce((a, d) => d.avgScore > a.avgScore ? d : a, firstDay);
    const worstDay = weekDays.reduce((a, d) => d.avgScore < a.avgScore ? d : a, firstDay);

    // Determine highlight
    let highlight = '';
    if (weekAvg >= 70) highlight = 'Very favorable week';
    else if (weekAvg >= 55) highlight = 'Generally positive';
    else if (weekAvg >= 45) highlight = 'Balanced week';
    else if (weekAvg >= 30) highlight = 'Challenging week';
    else highlight = 'Difficult week';

    weekly.push({
      week: w + 1,
      startDate: weekDays[0]?.date ?? '',
      endDate: weekDays[weekDays.length - 1]?.date ?? '',
      avgScore: Math.round(weekAvg),
      highlight,
      bestDay: bestDay?.date ?? '',
      worstDay: worstDay?.date ?? '',
    });
  }

  // Monthly aggregation
  const monthlyAvg = daily.reduce((a, d) => a + d.avgScore, 0) / daily.length;

  // Find best and worst days
  const sortedByScore = [...daily].sort((a, b) => b.avgScore - a.avgScore);
  const bestDays = sortedByScore.slice(0, 3).map(d => d.date);
  const worstDays = sortedByScore.slice(-3).map(d => d.date).reverse();

  // Category highlights
  const categoryHighlights = {
    career: { positive: [] as string[], negative: [] as string[] },
    finance: { positive: [] as string[], negative: [] as string[] },
    health: { positive: [] as string[], negative: [] as string[] },
    relationships: { positive: [] as string[], negative: [] as string[] },
    education: { positive: [] as string[], negative: [] as string[] },
  };

  for (const day of daily) {
    for (const cat of ['career', 'finance', 'health', 'relationships', 'education'] as const) {
      if (day.categories[cat] === 'positive') {
        categoryHighlights[cat].positive.push(day.date);
      } else if (day.categories[cat] === 'negative') {
        categoryHighlights[cat].negative.push(day.date);
      }
    }
  }

  // Limit to top 5 each
  for (const cat of Object.keys(categoryHighlights) as Array<keyof typeof categoryHighlights>) {
    categoryHighlights[cat].positive = categoryHighlights[cat].positive.slice(0, 5);
    categoryHighlights[cat].negative = categoryHighlights[cat].negative.slice(0, 5);
  }

  return {
    month,
    year,
    daysInMonth,
    daily,
    weekly,
    monthly: {
      avgScore: Math.round(monthlyAvg),
      bestDays,
      worstDays,
      categoryHighlights,
    },
  };
}

/**
 * Get dasha at date for aggregation (simplified version).
 */
function getDashaAtDateForAggregation(dashas: DashaPeriod[], date: Date): { prana: { planet: Planet } } | null {
  for (const d of dashas) {
    const mahaStart = new Date(d.mahadasha.startDate).getTime();
    const mahaEnd = new Date(d.mahadasha.endDate).getTime();
    const dateMs = date.getTime();

    if (dateMs >= mahaStart && dateMs <= mahaEnd) {
      return { prana: { planet: d.prana.planet } };
    }
  }
  return null;
}