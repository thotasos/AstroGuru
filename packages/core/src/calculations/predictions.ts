// ============================================================
// Prediction Engine — Plain English Astrological Predictions
// ============================================================
// Generates predictions based on Vimshottari Dasha, chart data,
// yogas, shadbala, and ashtakavarga.
// ============================================================

import {
  Planet,
  Sign,
  House,
  Nakshatra,
  ChartData,
  DashaPeriod,
  DashaLevel,
  YogaResult,
  ShadbalaResult,
  AshtakavargaResult,
  PlanetPosition,
} from '../types/index.js';

// ------------------------------------
// Planet Significations (Natural)
// ------------------------------------

const PLANET_SIGNIFICATIONS: Record<Planet, { keywords: string[]; nature: string; domains: string[] }> = {
  [Planet.Sun]: {
    keywords: ['soul', 'vitality', 'authority', 'father', 'government', 'power', 'self', 'creativity', 'bones', 'heart', 'eyes'],
    nature: 'Malefic but considered auspicious for Leo/Aries',
    domains: ['career', 'status', 'government', 'father', 'health'],
  },
  [Planet.Moon]: {
    keywords: ['mind', 'emotions', 'mother', 'home', 'travel', 'fluids', '想象力', 'happiness', 'stomach', 'breasts'],
    nature: 'Benefic, changes quickly',
    domains: ['emotions', 'home', 'mother', 'travel', 'mind'],
  },
  [Planet.Mars]: {
    keywords: ['energy', 'courage', 'brother', 'property', 'conflict', 'surgery', 'blood', 'muscles', 'fire', 'sports'],
    nature: 'Malefic, aggressive',
    domains: ['energy', 'property', 'siblings', 'conflict', 'sports'],
  },
  [Planet.Mercury]: {
    keywords: ['intellect', 'communication', 'business', 'friends', 'skills', 'speech', 'nervous system', 'hands'],
    nature: 'Neutral, changes based on association',
    domains: ['communication', 'business', 'intellect', 'skills'],
  },
  [Planet.Jupiter]: {
    keywords: ['wisdom', 'wealth', 'children', 'teachers', 'knowledge', 'luck', 'religion', 'philosophy', 'fat', 'liver'],
    nature: 'Great benefic',
    domains: ['wealth', 'children', 'wisdom', 'religion', 'travel'],
  },
  [Planet.Venus]: {
    keywords: ['love', 'beauty', 'marriage', 'pleasure', 'arts', 'vehicle', 'kidneys', 'reproduction', 'romance'],
    nature: 'Benefic',
    domains: ['love', 'marriage', 'arts', 'wealth', 'pleasure'],
  },
  [Planet.Saturn]: {
    keywords: ['discipline', 'delay', 'poverty', 'death', 'misery', 'hard work', 'bones', 'skin', 'teeth', 'old age'],
    nature: 'Malefic, slowest',
    domains: ['discipline', 'career', 'death', 'old age', 'misery'],
  },
  [Planet.Rahu]: {
    keywords: ['obsession', 'materialism', 'foreign', 'sudden', 'electronics', 'snakes', 'poison', 'infections'],
    nature: 'Shadow planet, materialistic',
    domains: ['material success', 'foreign', 'obsessions', 'electronics'],
  },
  [Planet.Ketu]: {
    keywords: ['spirituality', 'liberation', 'detachment', 'moksha', 'past lives', 'burns', 'accidents', 'secret'],
    nature: 'Shadow planet, spiritual',
    domains: ['spirituality', 'liberation', 'past lives', 'accidents'],
  },
};

// ------------------------------------
// Sign Qualities
// ------------------------------------

const SIGN_QUALITIES: Record<Sign, { element: string; quality: string; deity: string }> = {
  [Sign.Aries]: { element: 'Fire', quality: 'Cardinal', deity: 'Agni' },
  [Sign.Taurus]: { element: 'Earth', quality: 'Fixed', deity: 'Indra' },
  [Sign.Gemini]: { element: 'Air', quality: 'Mutable', deity: 'Vishnu' },
  [Sign.Cancer]: { element: 'Water', quality: 'Cardinal', deity: 'Varuna' },
  [Sign.Leo]: { element: 'Fire', quality: 'Fixed', deity: 'Rudra' },
  [Sign.Virgo]: { element: 'Earth', quality: 'Mutable', deity: 'Brahma' },
  [Sign.Libra]: { element: 'Air', quality: 'Cardinal', deity: 'Indra' },
  [Sign.Scorpio]: { element: 'Water', quality: 'Fixed', deity: 'Kartikeya' },
  [Sign.Sagittarius]: { element: 'Fire', quality: 'Mutable', deity: 'Vishnu' },
  [Sign.Capricorn]: { element: 'Earth', quality: 'Cardinal', deity: 'Ganesha' },
  [Sign.Aquarius]: { element: 'Air', quality: 'Fixed', deity: 'Vishnu' },
  [Sign.Pisces]: { element: 'Water', quality: 'Mutable', deity: 'Matsya' },
};

// ------------------------------------
// House Meanings
// ------------------------------------

const HOUSE_MEANINGS: Record<House, { keywords: string[]; areas: string[] }> = {
  [House.First]: { keywords: ['self', 'body', 'appearance', 'personality'], areas: ['physical body', 'personality', 'life force'] },
  [House.Second]: { keywords: ['wealth', 'family', 'speech', 'face', 'eyes', 'food'], areas: ['wealth', 'family', 'speech', 'eating habits'] },
  [House.Third]: { keywords: ['siblings', 'courage', 'efforts', 'short travel', 'skills'], areas: ['siblings', 'courage', 'communication', 'short journeys'] },
  [House.Fourth]: { keywords: ['home', 'mother', 'happiness', 'property', 'vehicle'], areas: ['home', 'mother', 'property', 'comforts'] },
  [House.Fifth]: { keywords: ['children', 'creativity', 'intelligence', 'romance', 'speculation'], areas: ['children', 'creativity', 'love affairs', 'gambling'] },
  [House.Sixth]: { keywords: ['enemies', 'debts', 'disease', 'service', 'work'], areas: ['enemies', 'illness', 'daily work', 'debts'] },
  [House.Seventh]: { keywords: ['marriage', 'partner', 'business', 'travel', 'death'], areas: ['marriage', 'business partner', 'foreign travel'] },
  [House.Eighth]: { keywords: ['death', 'longevity', 'spouse property', 'secret', 'transform'], areas: ['death', 'inheritance', 'hidden things', 'transformations'] },
  [House.Ninth]: { keywords: ['fortune', 'father', 'teacher', 'religion', 'long travel'], areas: ['fortune', 'father', 'preceptor', 'long journeys'] },
  [House.Tenth]: { keywords: ['career', 'fame', 'status', 'power', 'government'], areas: ['career', 'reputation', 'authority', 'government'] },
  [House.Eleventh]: { keywords: ['gains', 'friends', 'aspirations', 'elder sibling'], areas: ['gains', 'friends', 'hopes', 'elder siblings'] },
  [House.Twelfth]: { keywords: ['loss', 'expense', 'prison', 'hospital', 'liberation'], areas: ['losses', 'expenses', 'hospital', 'spiritual liberation'] },
};

// ------------------------------------
// Nakshatra Characteristics
// ------------------------------------

const NAKSHATRA_CHARACTERISTICS: Record<Nakshatra, { deity: string; nature: string; power: string }> = {
  [Nakshatra.Ashwini]: { deity: 'Ashvins', nature: 'Fast, healer', power: 'Swift movement' },
  [Nakshatra.Bharani]: { deity: 'Yama', nature: 'Nurturing, steadfast', power: 'Testing' },
  [Nakshatra.Krittika]: { deity: 'Agni', nature: 'Sharp, purifying', power: 'Cleansing' },
  [Nakshatra.Rohini]: { deity: 'Brahma', nature: 'Growth, nourishing', power: 'Nourishment' },
  [Nakshatra.Mrigashira]: { deity: 'Soma', nature: 'Gentle, seeking', power: 'Seeking' },
  [Nakshatra.Ardra]: { deity: 'Rudra', nature: 'Dynamic, fierce', power: 'Transformation' },
  [Nakshatra.Punarvasu]: { deity: 'Aditi', nature: 'Renewing, blessed', power: 'Renewal' },
  [Nakshatra.Pushya]: { deity: 'Brihaspati', nature: 'Nourishing, protective', power: 'Protection' },
  [Nakshatra.Ashlesha]: { deity: 'Naga', nature: 'Intense, mysterious', power: 'Hypnotic' },
  [Nakshatra.Magha]: { deity: 'Pitris', nature: 'Ancestral, royal', power: 'Royal authority' },
  [Nakshatra.PurvaPhalguni]: { deity: 'Bhaga', nature: 'Loving, creative', power: 'Fulfillment' },
  [Nakshatra.UttaraPhalguni]: { deity: 'Aryaman', nature: 'Supporting, reliable', power: 'Reliability' },
  [Nakshatra.Hasta]: { deity: 'Savitar', nature: 'Skillful, achieving', power: 'Accomplishment' },
  [Nakshatra.Chitra]: { deity: 'Tvashtar', nature: 'Beautiful, artistic', power: 'Artistry' },
  [Nakshatra.Swati]: { deity: 'Vayu', nature: 'Independent, smooth', power: 'Independence' },
  [Nakshatra.Vishakha]: { deity: 'Indra-Agni', nature: 'Goal-oriented, victorious', power: 'Achievement' },
  [Nakshatra.Anuradha]: { deity: 'Mitra', nature: 'Devoted, balanced', power: 'Devotion' },
  [Nakshatra.Jyeshtha]: { deity: 'Indra', nature: 'Elder, powerful', power: 'Seniority' },
  [Nakshatra.Mula]: { deity: 'Nirriti', nature: 'Root-seeking, destroying', power: 'Root cause' },
  [Nakshatra.PurvaAshadha]: { deity: 'Apo', nature: 'Invincible, winning', power: 'Victory' },
  [Nakshatra.UttaraAshadha]: { deity: 'Vishvadeva', nature: 'Universal, enduring', power: 'Endurance' },
  [Nakshatra.Shravana]: { deity: 'Vishnu', nature: 'Listening, learning', power: 'Listening' },
  [Nakshatra.Dhanishta]: { deity: 'Vasava', nature: 'Wealthy, musical', power: 'Wealth' },
  [Nakshatra.Shatabhisha]: { deity: 'Varuna', nature: 'Healing, mysterious', power: 'Healing' },
  [Nakshatra.PurvaBhadrapada]: { deity: 'Aja Ekapada', nature: 'Transforming, spiritual', power: 'Transformation' },
  [Nakshatra.UttaraBhadrapada]: { deity: 'Ahir Budhnya', nature: 'Deep, nurturing', power: 'Depth' },
  [Nakshatra.Revati]: { deity: 'Pushan', nature: 'Nurturing, guiding', power: 'Guidance' },
};

// ------------------------------------
// Helper Functions
// ------------------------------------

function getPlanetName(planet: Planet): string {
  const names: Record<Planet, string> = {
    [Planet.Sun]: 'Sun',
    [Planet.Moon]: 'Moon',
    [Planet.Mars]: 'Mars',
    [Planet.Mercury]: 'Mercury',
    [Planet.Jupiter]: 'Jupiter',
    [Planet.Venus]: 'Venus',
    [Planet.Saturn]: 'Saturn',
    [Planet.Rahu]: 'Rahu (North Node)',
    [Planet.Ketu]: 'Ketu (South Node)',
  };
  return names[planet];
}

function getSignName(sign: Sign): string {
  const names: Record<Sign, string> = {
    [Sign.Aries]: 'Aries',
    [Sign.Taurus]: 'Taurus',
    [Sign.Gemini]: 'Gemini',
    [Sign.Cancer]: 'Cancer',
    [Sign.Leo]: 'Leo',
    [Sign.Virgo]: 'Virgo',
    [Sign.Libra]: 'Libra',
    [Sign.Scorpio]: 'Scorpio',
    [Sign.Sagittarius]: 'Sagittarius',
    [Sign.Capricorn]: 'Capricorn',
    [Sign.Aquarius]: 'Aquarius',
    [Sign.Pisces]: 'Pisces',
  };
  return names[sign];
}

function getHouseName(house: House): string {
  return `${house}${getOrdinalSuffix(house)} House`;
}

function getOrdinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return 'th';
  const idx = (v % 10) as 1 | 2 | 3;
  if (idx === 1) return 'st';
  if (idx === 2) return 'nd';
  if (idx === 3) return 'rd';
  return 'th';
}

function getNakshatraName(nakshatra: Nakshatra): string {
  const names: Record<Nakshatra, string> = {
    [Nakshatra.Ashwini]: 'Ashwini',
    [Nakshatra.Bharani]: 'Bharani',
    [Nakshatra.Krittika]: 'Krittika',
    [Nakshatra.Rohini]: 'Rohini',
    [Nakshatra.Mrigashira]: 'Mrigashira',
    [Nakshatra.Ardra]: 'Ardra',
    [Nakshatra.Punarvasu]: 'Punarvasu',
    [Nakshatra.Pushya]: 'Pushya',
    [Nakshatra.Ashlesha]: 'Ashlesha',
    [Nakshatra.Magha]: 'Magha',
    [Nakshatra.PurvaPhalguni]: 'Purva Phalguni',
    [Nakshatra.UttaraPhalguni]: 'Uttara Phalguni',
    [Nakshatra.Hasta]: 'Hasta',
    [Nakshatra.Chitra]: 'Chitra',
    [Nakshatra.Swati]: 'Swati',
    [Nakshatra.Vishakha]: 'Vishakha',
    [Nakshatra.Anuradha]: 'Anuradha',
    [Nakshatra.Jyeshtha]: 'Jyeshtha',
    [Nakshatra.Mula]: 'Mula',
    [Nakshatra.PurvaAshadha]: 'Purva Ashadha',
    [Nakshatra.UttaraAshadha]: 'Uttara Ashadha',
    [Nakshatra.Shravana]: 'Shravana',
    [Nakshatra.Dhanishta]: 'Dhanishta',
    [Nakshatra.Shatabhisha]: 'Shatabhisha',
    [Nakshatra.PurvaBhadrapada]: 'Purva Bhadrapada',
    [Nakshatra.UttaraBhadrapada]: 'Uttara Bhadrapada',
    [Nakshatra.Revati]: 'Revati',
  };
  return names[nakshatra];
}

function getDashaLevelName(level: 1 | 2 | 3 | 4 | 5): string {
  const names: Record<1 | 2 | 3 | 4 | 5, string> = {
    1: 'Mahadasha',
    2: 'Antardasha',
    3: 'Pratyantardasha',
    4: 'Sookshma',
    5: 'Prana',
  };
  return names[level];
}

function formatDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}

function getPlanetPosition(chart: ChartData, planet: Planet): PlanetPosition | undefined {
  return chart.planets.find(p => p.planet === planet);
}

function getPlanetSign(chart: ChartData, planet: Planet): Sign | null {
  const pos = getPlanetPosition(chart, planet);
  return pos ? pos.sign : null;
}

function getPlanetHouse(chart: ChartData, planet: Planet): House | null {
  const pos = getPlanetPosition(chart, planet);
  if (!pos) return null;

  // Find which house this planet is in
  // The house a planet is in depends on its sign relative to the ascendant
  const ascendantSign = Math.floor(chart.ascendant / 30);
  const planetSign = pos.sign;
  const houseNumber = ((planetSign - ascendantSign + 12) % 12) + 1;
  return houseNumber as House;
}

function isPlanetExalted(planet: Planet, sign: Sign): boolean {
  const exaltations: Record<Planet, Sign> = {
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
  return exaltations[planet] === sign;
}

function isPlanetDebilitated(planet: Planet, sign: Sign): boolean {
  const debilitations: Record<Planet, Sign> = {
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
  return debilitations[planet] === sign;
}

function getPlanetStrength(shadbala: ShadbalaResult[], planet: Planet): ShadbalaResult | undefined {
  return shadbala.find(s => s.planet === planet);
}

function isPlanetStrong(shadbalaResult: ShadbalaResult | undefined): boolean {
  if (!shadbalaResult) return false;
  // Consider a planet strong if total is > 5 Rupas (300 Virupas)
  return shadbalaResult.totalRupas > 5;
}

function getActiveYogasForPeriod(yogas: YogaResult[], activePlanets: Planet[]): YogaResult[] {
  return yogas.filter(yoga =>
    yoga.isPresent &&
    yoga.planets.some(p => activePlanets.includes(p))
  );
}

// ------------------------------------
// Prediction Types
// ------------------------------------

export interface PredictionPeriod {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  activePlanet: Planet;
  subPlanet?: Planet; // For antardasha: the mahadasha planet
  startDate: Date;
  endDate: Date;
  summary: string;
  keyInfluences: string[];
  activeYogas: string[];
  planetStrength: 'strong' | 'weak' | 'moderate';
  houseAffected: House;
  signPosition: Sign;
  aspects?: string;
}

export interface PredictionRequest {
  chart: ChartData;
  dashas: DashaPeriod[];
  yogas: YogaResult[];
  shadbala: ShadbalaResult[];
  ashtakavarga: AshtakavargaResult;
  startDate?: Date;
  endDate?: Date;
  level?: 1 | 2 | 3 | 4 | 5;
}

export interface PredictionResponse {
  periods: PredictionPeriod[];
  chart: ChartData;
}

// ------------------------------------
// Core Prediction Generation
// ------------------------------------

function generatePlanetSignification(planet: Planet, sign: Sign, house: House, strength: 'strong' | 'weak' | 'moderate'): string {
  const planetInfo = PLANET_SIGNIFICATIONS[planet];
  const signInfo = SIGN_QUALITIES[sign];
  const houseInfo = HOUSE_MEANINGS[house];

  const strengthModifier = strength === 'strong' ? 'powerfully' : strength === 'weak' ? 'weakly' : 'moderately';
  const aspects = `The ${getPlanetName(planet)} represents ${planetInfo.keywords.slice(0, 3).join(', ')}. In this period, it operates ${strengthModifier} as it moves through ${getSignName(sign)} (${signInfo.element} ${signInfo.quality}), affecting the ${houseInfo.keywords[0]} area of life.`;

  return aspects;
}

function generateDashaPrediction(
  dashaPlanet: Planet,
  level: 1 | 2 | 3 | 4 | 5,
  chart: ChartData,
  shadbala: ShadbalaResult[],
  yogas: YogaResult[],
  subPlanet?: Planet
): { summary: string; influences: string[]; house: House; sign: Sign; strength: 'strong' | 'weak' | 'moderate' } {
  const planetSign = getPlanetSign(chart, dashaPlanet);
  const planetHouse = getPlanetHouse(chart, dashaPlanet);
  const planetStrength = getPlanetStrength(shadbala, dashaPlanet);

  const sign = planetSign ?? Sign.Aries;
  const house = planetHouse ?? House.First;
  const isStrong = isPlanetStrong(planetStrength);
  const isExalted = isPlanetExalted(dashaPlanet, sign);
  const isDebilitated = isPlanetDebilitated(dashaPlanet, sign);

  // Determine strength
  let strength: 'strong' | 'weak' | 'moderate' = 'moderate';
  if (isStrong || isExalted) strength = 'strong';
  else if (isDebilitated || (planetStrength && planetStrength.totalRupas < 3)) strength = 'weak';

  const planetInfo = PLANET_SIGNIFICATIONS[dashaPlanet];
  const levelName = getDashaLevelName(level);

  // Build summary
  let summary = `During this ${levelName} of ${getPlanetName(dashaPlanet)}`;

  if (subPlanet && level === 2) {
    summary += ` (within the ${getPlanetName(subPlanet)} Mahadasha)`;
  }

  summary += ', ';

  if (isExalted) {
    summary += `the planet is exalted in ${getSignName(sign)}, amplifying its positive effects.`;
  } else if (isDebilitated) {
    summary += `the planet is debilitated in ${getSignName(sign)}, which may create challenges.`;
  } else {
    summary += `the planet is in ${getSignName(sign)}.`;
  }

  // Add key influences
  const influences: string[] = [];

  // House influence
  const houseInfo = HOUSE_MEANINGS[house];
  influences.push(`Primary life area affected: ${houseInfo.areas[0]}`);

  // Sign influence
  const signInfo = SIGN_QUALITIES[sign];
  influences.push(`Sign quality: ${signInfo.element} and ${signInfo.quality}`);

  // Planet nature
  influences.push(`Planet nature: ${planetInfo.nature}`);

  // Add planet domains
  if (planetInfo.domains.length > 0) {
    influences.push(`Key domains: ${planetInfo.domains.slice(0, 2).join(', ')}`);
  }

  // Check for yogas
  const relevantYogas = yogas.filter(y =>
    y.isPresent && y.planets.includes(dashaPlanet)
  );
  if (relevantYogas.length > 0) {
    influences.push(`Active yoga${relevantYogas.length > 1 ? 's' : ''}: ${relevantYogas.map(y => y.name).join(', ')}`);
  }

  // Strength indicator
  if (strength === 'strong') {
    influences.push('Planet is in strong position with good shadbala');
  } else if (strength === 'weak') {
    influences.push('Planet may be weakened - challenges possible');
  }

  return { summary, influences, house, sign, strength };
}

function generatePeriodSummary(
  activePlanet: Planet,
  level: 1 | 2 | 3 | 4 | 5,
  chart: ChartData,
  shadbala: ShadbalaResult[],
  yogas: YogaResult[],
  subPlanet?: Planet
): string {
  const { summary, influences, house, sign, strength } = generateDashaPrediction(
    activePlanet, level, chart, shadbala, yogas, subPlanet
  );

  const planetSign = getPlanetSign(chart, activePlanet) ?? Sign.Aries;
  const houseInfo = HOUSE_MEANINGS[house];

  // Create a more detailed summary
  let fullSummary = summary + '\n\n';

  // Add the detailed signification
  fullSummary += generatePlanetSignification(activePlanet, planetSign, house, strength) + '\n\n';

  // Add house interpretation
  fullSummary += `This period primarily influences the ${houseInfo.keywords[0]} area: ${houseInfo.areas.join(', ')}.`;

  return fullSummary;
}

// ------------------------------------
// Main Prediction Function
// ------------------------------------

export function generatePredictions(request: PredictionRequest): PredictionResponse {
  const { chart, dashas, yogas, shadbala, ashtakavarga, startDate, endDate, level } = request;

  // Default to full 120-year range if no dates specified
  const start = startDate ?? dashas[0]?.mahadasha.startDate ?? new Date(Date.now() - 60 * 365 * 24 * 60 * 60 * 1000);
  const end = endDate ?? dashas[dashas.length - 1]?.mahadasha.endDate ?? new Date(Date.now() + 60 * 365 * 24 * 60 * 60 * 1000);

  const periods: PredictionPeriod[] = [];

  // Determine which dasha level to process
  const maxLevel = level ?? 1;

  // Build lookup maps for each level to ensure uniqueness
  const mahaMap = new Map<string, typeof dashas[0]>();
  const antiMap = new Map<string, typeof dashas[0]>();
  const pratyMap = new Map<string, typeof dashas[0]>();

  for (const dasha of dashas) {
    const mahaKey = dasha.mahadasha.startDate.toString();
    const antiKey = `${mahaKey}-${dasha.antardasha.startDate.toString()}`;
    const pratyKey = `${antiKey}-${dasha.pratyantardasha.startDate.toString()}`;

    if (!mahaMap.has(mahaKey)) mahaMap.set(mahaKey, dasha);
    if (!antiMap.has(antiKey)) antiMap.set(antiKey, dasha);
    if (!pratyMap.has(pratyKey)) pratyMap.set(pratyKey, dasha);
  }

  // Process based on level
  const dashasToProcess = maxLevel === 1 ? Array.from(mahaMap.values()) :
                         maxLevel === 2 ? Array.from(antiMap.values()) :
                         Array.from(pratyMap.values());

  for (const dasha of dashasToProcess) {
    // Filter by date range - check the mahadasha level dates
    const mahaStart = new Date(dasha.mahadasha.startDate);
    const mahaEnd = new Date(dasha.mahadasha.endDate);

    // Skip if completely outside range
    if (mahaEnd < start || mahaStart > end) continue;

    // Get antardasha at a higher scope for use in level 3+
    const antardasha = dasha.antardasha;

    // Process Mahadasha (level 1)
    if (maxLevel === 1) {
      const activePlanet = dasha.mahadasha.planet;
      const summary = generatePeriodSummary(activePlanet, 1, chart, shadbala, yogas);
      const { influences, house, sign, strength } = generateDashaPrediction(activePlanet, 1, chart, shadbala, yogas);
      const activeYogas = getActiveYogasForPeriod(yogas, [activePlanet]).map(y => y.name);

      periods.push({
        id: `m-${activePlanet}-${mahaStart.getTime()}`,
        level: 1,
        activePlanet,
        startDate: mahaStart,
        endDate: mahaEnd,
        summary,
        keyInfluences: influences,
        activeYogas,
        planetStrength: strength,
        houseAffected: house,
        signPosition: sign,
      });
    }

    // Process Antardasha (level 2) if requested
    if (maxLevel === 2) {
      const antiStart = new Date(antardasha.startDate);
      const antiEnd = new Date(antardasha.endDate);

      if (!(antiEnd < start || antiStart > end)) {
        const summary = generatePeriodSummary(antardasha.planet, 2, chart, shadbala, yogas, dasha.mahadasha.planet);
        const { influences, house, sign, strength } = generateDashaPrediction(antardasha.planet, 2, chart, shadbala, yogas, dasha.mahadasha.planet);
        const activeYogas = getActiveYogasForPeriod(yogas, [dasha.mahadasha.planet, antardasha.planet]).map(y => y.name);

        periods.push({
          id: `a-${antardasha.planet}-${antiStart.getTime()}`,
          level: 2,
          activePlanet: antardasha.planet,
          subPlanet: dasha.mahadasha.planet,
          startDate: antiStart,
          endDate: antiEnd,
          summary,
          keyInfluences: influences,
          activeYogas,
          planetStrength: strength,
          houseAffected: house,
          signPosition: sign,
        });
      }
    }

    // Process Pratyantardasha (level 3) if requested
    if (maxLevel === 3) {
      const praty = dasha.pratyantardasha;
      const pratyStart = new Date(praty.startDate);
      const pratyEnd = new Date(praty.endDate);

      if (!(pratyEnd < start || pratyStart > end)) {
        const summary = generatePeriodSummary(praty.planet, 3, chart, shadbala, yogas, antardasha?.planet ?? dasha.mahadasha.planet);
        const { influences, house, sign, strength } = generateDashaPrediction(praty.planet, 3, chart, shadbala, yogas);
        const activeYogas = getActiveYogasForPeriod(yogas, [dasha.mahadasha.planet, antardasha?.planet ?? dasha.mahadasha.planet, praty.planet]).map(y => y.name);

        periods.push({
          id: `p-${praty.planet}-${pratyStart.getTime()}`,
          level: 3,
          activePlanet: praty.planet,
          subPlanet: antardasha?.planet,
          startDate: pratyStart,
          endDate: pratyEnd,
          summary,
          keyInfluences: influences,
          activeYogas,
          planetStrength: strength,
          houseAffected: house,
          signPosition: sign,
        });
      }
    }

    // Process Sookshma (level 4) if requested
    if (maxLevel === 4) {
      const sookshma = dasha.sookshma;
      const sookStart = new Date(sookshma.startDate);
      const sookEnd = new Date(sookshma.endDate);

      if (!(sookEnd < start || sookStart > end)) {
        const summary = generatePeriodSummary(sookshma.planet, 4, chart, shadbala, yogas);
        const { influences, house, sign, strength } = generateDashaPrediction(sookshma.planet, 4, chart, shadbala, yogas);

        periods.push({
          id: `s-${sookshma.planet}-${sookStart.getTime()}`,
          level: 4,
          activePlanet: sookshma.planet,
          startDate: sookStart,
          endDate: sookEnd,
          summary,
          keyInfluences: influences,
          activeYogas: [],
          planetStrength: strength,
          houseAffected: house,
          signPosition: sign,
        });
      }
    }

    // Process Prana (level 5) if requested
    if (maxLevel === 5) {
      const prana = dasha.prana;
      const pranaStart = new Date(prana.startDate);
      const pranaEnd = new Date(prana.endDate);

      if (!(pranaEnd < start || pranaStart > end)) {
        const summary = generatePeriodSummary(prana.planet, 5, chart, shadbala, yogas);
        const { influences, house, sign, strength } = generateDashaPrediction(prana.planet, 5, chart, shadbala, yogas);

        periods.push({
          id: `r-${prana.planet}-${pranaStart.getTime()}`,
          level: 5,
          activePlanet: prana.planet,
          startDate: pranaStart,
          endDate: pranaEnd,
          summary,
          keyInfluences: influences,
          activeYogas: [],
          planetStrength: strength,
          houseAffected: house,
          signPosition: sign,
        });
      }
    }
  }

  // Sort by start date
  periods.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  return { periods, chart };
}

// ------------------------------------
// Summary Generation for a Single Period
// ------------------------------------

export function generateSinglePeriodSummary(
  period: DashaLevel,
  chart: ChartData,
  shadbala: ShadbalaResult[],
  yogas: YogaResult[],
  parentPlanet?: Planet
): string {
  const activePlanet = period.planet;
  return generatePeriodSummary(activePlanet, period.level as 1 | 2 | 3 | 4 | 5, chart, shadbala, yogas, parentPlanet);
}

// ------------------------------------
// Current Period Prediction
// ------------------------------------

export function getCurrentPeriodPrediction(
  chart: ChartData,
  dashas: DashaPeriod[],
  yogas: YogaResult[],
  shadbala: ShadbalaResult[]
): PredictionPeriod | null {
  const now = new Date();

  // Find the current dasha period
  const current = dashas.find(d => {
    const start = new Date(d.mahadasha.startDate).getTime();
    const end = new Date(d.mahadasha.endDate).getTime();
    const nowMs = now.getTime();
    return nowMs >= start && nowMs <= end;
  });

  if (!current) return null;

  const mahaPlanet = current.mahadasha.planet;
  const antiPlanet = current.antardasha.planet;
  const summary = generatePeriodSummary(mahaPlanet, 1, chart, shadbala, yogas);
  const { influences, house, sign, strength } = generateDashaPrediction(mahaPlanet, 1, chart, shadbala, yogas);
  const activeYogas = getActiveYogasForPeriod(yogas, [mahaPlanet, antiPlanet]).map(y => y.name);

  return {
    id: 'current',
    level: 1,
    activePlanet: mahaPlanet,
    subPlanet: antiPlanet,
    startDate: new Date(current.mahadasha.startDate),
    endDate: new Date(current.mahadasha.endDate),
    summary,
    keyInfluences: influences,
    activeYogas,
    planetStrength: strength,
    houseAffected: house,
    signPosition: sign,
  };
}
