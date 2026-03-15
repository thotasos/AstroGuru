// ============================================================
// Parashari Precision — Shared TypeScript Types
// ============================================================

// ------------------------------------
// Enumerations
// ------------------------------------

/** Planets — indices match Swiss Ephemeris logical ordering used internally */
export enum Planet {
  Sun = 0,
  Moon = 1,
  Mars = 2,
  Mercury = 3,
  Jupiter = 4,
  Venus = 5,
  Saturn = 6,
  Rahu = 7,   // Mean Node (North)
  Ketu = 8,   // Mean Node (South) — derived as Rahu + 180°
}

/** Zodiac signs 0-indexed (Aries=0 … Pisces=11) */
export enum Sign {
  Aries = 0,
  Taurus = 1,
  Gemini = 2,
  Cancer = 3,
  Leo = 4,
  Virgo = 5,
  Libra = 6,
  Scorpio = 7,
  Sagittarius = 8,
  Capricorn = 9,
  Aquarius = 10,
  Pisces = 11,
}

/** Bhava (house) numbers 1-12 */
export enum House {
  First = 1,
  Second = 2,
  Third = 3,
  Fourth = 4,
  Fifth = 5,
  Sixth = 6,
  Seventh = 7,
  Eighth = 8,
  Ninth = 9,
  Tenth = 10,
  Eleventh = 11,
  Twelfth = 12,
}

/** Divisional (Varga) charts */
export enum Varga {
  D1 = 'D1',
  D2 = 'D2',
  D3 = 'D3',
  D4 = 'D4',
  D7 = 'D7',
  D9 = 'D9',
  D10 = 'D10',
  D12 = 'D12',
  D16 = 'D16',
  D20 = 'D20',
  D24 = 'D24',
  D27 = 'D27',
  D30 = 'D30',
  D40 = 'D40',
  D45 = 'D45',
  D60 = 'D60',
}

/** Nakshatras 0=Ashwini … 26=Revati */
export enum Nakshatra {
  Ashwini = 0,
  Bharani = 1,
  Krittika = 2,
  Rohini = 3,
  Mrigashira = 4,
  Ardra = 5,
  Punarvasu = 6,
  Pushya = 7,
  Ashlesha = 8,
  Magha = 9,
  PurvaPhalguni = 10,
  UttaraPhalguni = 11,
  Hasta = 12,
  Chitra = 13,
  Swati = 14,
  Vishakha = 15,
  Anuradha = 16,
  Jyeshtha = 17,
  Mula = 18,
  PurvaAshadha = 19,
  UttaraAshadha = 20,
  Shravana = 21,
  Dhanishta = 22,
  Shatabhisha = 23,
  PurvaBhadrapada = 24,
  UttaraBhadrapada = 25,
  Revati = 26,
}

/** Ayanamsa systems */
export enum Ayanamsa {
  Lahiri = 'Lahiri',
  Raman = 'Raman',
  KP = 'KP',
}

// ------------------------------------
// Positional Data
// ------------------------------------

/** Full positional data for a planet in a chart */
export interface PlanetPosition {
  planet: Planet;
  /** Tropical longitude 0–360° */
  tropicalLongitude: number;
  /** Sidereal longitude 0–360° (after ayanamsa subtraction) */
  siderealLongitude: number;
  /** Sign 0–11 derived from siderealLongitude */
  sign: Sign;
  /** Degrees within the sign 0–30° */
  degreeInSign: number;
  /** Nakshatra 0–26 */
  nakshatra: Nakshatra;
  /** Nakshatra pada 1–4 */
  nakshatraPada: number;
  /** True when planet's daily motion is negative (retrograde) */
  isRetrograde: boolean;
  /** Daily motion in degrees (negative = retrograde) */
  speed: number;
  /** Latitude in degrees */
  latitude: number;
}

/** House cusp position */
export interface HousePosition {
  house: House;
  /** Sign on the cusp (whole-sign system: 1st house sign = ascendant sign) */
  sign: Sign;
  /** Degrees on the cusp (ecliptic longitude of the cusp) */
  degreeOnCusp: number;
}

/** Complete natal chart data */
export interface ChartData {
  /** Ascendant sidereal longitude 0–360° */
  ascendant: number;
  /** All planet positions */
  planets: PlanetPosition[];
  /** House cusps (12 houses, whole-sign) */
  houses: HousePosition[];
  /** Julian Day Number (UT) */
  julianDay: number;
  /** Ayanamsa value applied (degrees) */
  ayanamsa: number;
  /** Ayanamsa system used */
  ayanamsaType: Ayanamsa;
  /** Midheaven (MC) sidereal longitude */
  mc: number;
}

/** Divisional chart — extends ChartData with the varga type */
export interface VargaChart extends ChartData {
  varga: Varga;
  /** Varga sign positions for each planet (0–11) */
  vargaSigns: Record<Planet, Sign>;
}

// ------------------------------------
// Dasha System
// ------------------------------------

/** A single dasha period at one hierarchical level */
export interface DashaLevel {
  planet: Planet;
  startDate: Date;
  endDate: Date;
  /** 1=Mahadasha, 2=Antardasha, 3=Pratyantardasha, 4=Sookshma, 5=Prana */
  level: 1 | 2 | 3 | 4 | 5;
}

/** Nested five-level Vimshottari dasha period */
export interface DashaPeriod {
  mahadasha: DashaLevel;
  antardasha: DashaLevel;
  pratyantardasha: DashaLevel;
  sookshma: DashaLevel;
  prana: DashaLevel;
}

// ------------------------------------
// Yoga Results
// ------------------------------------

export interface YogaResult {
  name: string;
  description: string;
  isPresent: boolean;
  planets: Planet[];
  houses: number[];
  /** Strength 0.0–1.0 */
  strength: number;
  category: string;
}

// ------------------------------------
// Shadbala
// ------------------------------------

export interface ShadbalaResult {
  planet: Planet;
  /** Sthanabala (positional) in Virupas */
  sthanabala: number;
  /** Digbala (directional) in Virupas */
  digbala: number;
  /** Kalabala (temporal) in Virupas */
  kalabala: number;
  /** Chestabala (motional) in Virupas */
  chestabala: number;
  /** Naisargikabala (natural) in Virupas */
  naisargikabala: number;
  /** Drigbala (aspectual) in Virupas */
  drigbala: number;
  /** Sum of all six balas */
  total: number;
  /** Total in Rupas (Virupas / 60) */
  totalRupas: number;
  /** Ishta phala (benefic potential) */
  ishtaPhala: number;
  /** Kashta phala (malefic potential) */
  kashtaPhala: number;
}

// ------------------------------------
// Ashtakavarga
// ------------------------------------

/** Ashtakavarga result for a single planet */
export interface AshtakavargaResult {
  /** Bindu (benefic point) Ashta-varga — 12 signs, 8 contributors each */
  bav: Map<Planet | 'Ascendant', number[]>;
  /** Sarvashtakavarga — sum across all contributors for each sign */
  sav: number[];
  /** Per-planet Bindus (total benefic points per sign for that planet) */
  planetBav: Map<Planet, number[]>;
}

// ------------------------------------
// Birth Data
// ------------------------------------

/** Input data for chart calculation */
export interface BirthData {
  name: string;
  /** ISO 8601 UTC date-time string, e.g. "1990-01-15T10:30:00Z" */
  dateOfBirth: string;
  /** Geographic latitude in decimal degrees (north positive) */
  latitude: number;
  /** Geographic longitude in decimal degrees (east positive) */
  longitude: number;
  /** UTC offset in hours, e.g. 5.5 for IST */
  timezone: number;
  /** Ayanamsa to use (defaults to Lahiri) */
  ayanamsaId?: Ayanamsa;
}

// ------------------------------------
// South Indian Chart
// ------------------------------------

export interface GridCell {
  /** Row 0–3 */
  row: number;
  /** Column 0–3 */
  col: number;
  /** Sign at this fixed grid position (0–11) */
  sign: Sign;
  /** Planets placed in this sign */
  planets: Planet[];
  /** True if this is the lagna (ascendant) cell */
  isLagna: boolean;
  /** True if this is one of the 4 centre metadata cells */
  isMetadata: boolean;
}

// ------------------------------------
// Nakshatra Info
// ------------------------------------

export interface NakshatraInfo {
  nakshatra: Nakshatra;
  /** Pada 1–4 */
  pada: number;
  /** Dasha lord for this nakshatra */
  lord: Planet;
  /** Degrees within the nakshatra 0–13°20' */
  degreeInNakshatra: number;
}
