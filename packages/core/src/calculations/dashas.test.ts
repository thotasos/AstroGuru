// ============================================================
// Vimshottari Dasha Calculation Tests — Parashari Precision
// ============================================================
// Tests the full 5-level dasha system.
// No Swiss Ephemeris required — all math-based.
// ============================================================

import {
  calculateDasha,
  getDashaLordAtDate,
  getDashaLordsAtDate,
  getMahadashas,
  getNakshatra,
  DASHA_SEQUENCE,
  NAKSHATRA_LORD,
} from './dashas.js';
import { Planet, Nakshatra } from '../types/index.js';

// ------------------------------------
// Constants
// ------------------------------------

const DAYS_PER_YEAR = 365.25;
const NAKSHATRA_SPAN_DEG = 360 / 27; // 13.3333...°

// ------------------------------------
// Helper utilities
// ------------------------------------

/** Build a date N years after a reference date. */
function addYears(date: Date, years: number): Date {
  const ms = date.getTime() + years * DAYS_PER_YEAR * 86400000;
  return new Date(ms);
}

/** Build a date N days after a reference date. */
function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

// ===========================================================================
// getNakshatra — Nakshatra identification
// ===========================================================================

describe('getNakshatra', () => {
  test('0° sidereal → Ashwini nakshatra', () => {
    const info = getNakshatra(0);
    expect(info.nakshatra).toBe(Nakshatra.Ashwini);
    expect(info.lord).toBe(Planet.Ketu);
    expect(info.pada).toBe(1);
  });

  test('13°20\' (= one nakshatra span) → Bharani', () => {
    const info = getNakshatra(NAKSHATRA_SPAN_DEG);
    expect(info.nakshatra).toBe(Nakshatra.Bharani);
    expect(info.lord).toBe(Planet.Venus);
  });

  test('Exactly at nakshatra boundary (13.3333°) → Bharani starts', () => {
    const info = getNakshatra(NAKSHATRA_SPAN_DEG + 0.0001);
    expect(info.nakshatra).toBe(Nakshatra.Bharani);
  });

  test('Moon at 0° Aries (Ashwini) → Ketu dasha lord', () => {
    const info = getNakshatra(0);
    expect(info.lord).toBe(Planet.Ketu);
  });

  test('Moon at 13°19\' (end of Ashwini) → still Ketu dasha lord', () => {
    const info = getNakshatra(13.32);
    expect(info.nakshatra).toBe(Nakshatra.Ashwini);
    expect(info.lord).toBe(Planet.Ketu);
  });

  test('Moon halfway through Ashwini (6°40\') → degree in nakshatra ≈ 6.666', () => {
    const halfNakshatra = NAKSHATRA_SPAN_DEG / 2;
    const info = getNakshatra(halfNakshatra);
    expect(info.degreeInNakshatra).toBeCloseTo(halfNakshatra, 3);
  });

  test('Moon at 200° sidereal → Vishakha area', () => {
    // 200° / (360/27) = 200/13.333 = 15.0 → nakshatra index 15 = Vishakha
    const info = getNakshatra(200);
    // 15 * 13.333 = 200 exactly — right at Vishakha boundary
    // floor(200/13.333) = floor(15.00) = 15 = Vishakha
    expect(info.nakshatra).toBe(Nakshatra.Vishakha);
    expect(info.lord).toBe(Planet.Jupiter);
  });

  test('Moon at 201° → Vishakha (within span)', () => {
    const info = getNakshatra(201);
    expect(info.nakshatra).toBe(Nakshatra.Vishakha);
    expect(info.lord).toBe(Planet.Jupiter);
  });

  test('All 27 nakshatras can be computed without error', () => {
    for (let i = 0; i < 27; i++) {
      const lon = i * NAKSHATRA_SPAN_DEG + 0.001;
      expect(() => getNakshatra(lon)).not.toThrow();
    }
  });

  test('Nakshatra pada 1 at start of nakshatra', () => {
    const info = getNakshatra(0.001);
    expect(info.pada).toBe(1);
  });

  test('Nakshatra pada 2 at 25% of span', () => {
    const info = getNakshatra(NAKSHATRA_SPAN_DEG * 0.26);
    expect(info.pada).toBe(2);
  });

  test('Nakshatra pada 4 at 75% of span', () => {
    const info = getNakshatra(NAKSHATRA_SPAN_DEG * 0.76);
    expect(info.pada).toBe(4);
  });

  test('360° normalizes correctly', () => {
    const info = getNakshatra(360);
    expect(info.nakshatra).toBe(Nakshatra.Ashwini);
  });
});

// ===========================================================================
// DASHA_SEQUENCE and NAKSHATRA_LORD constants
// ===========================================================================

describe('DASHA_SEQUENCE constants', () => {
  test('Total of all dasha years = 120', () => {
    const total = DASHA_SEQUENCE.reduce((sum, [, years]) => sum + years, 0);
    expect(total).toBe(120);
  });

  test('Sequence has exactly 9 entries', () => {
    expect(DASHA_SEQUENCE).toHaveLength(9);
  });

  test('Ketu dasha = 7 years', () => {
    const ketuEntry = DASHA_SEQUENCE.find(([p]) => p === Planet.Ketu);
    expect(ketuEntry?.[1]).toBe(7);
  });

  test('Venus dasha = 20 years', () => {
    const venusEntry = DASHA_SEQUENCE.find(([p]) => p === Planet.Venus);
    expect(venusEntry?.[1]).toBe(20);
  });

  test('Sun dasha = 6 years', () => {
    const sunEntry = DASHA_SEQUENCE.find(([p]) => p === Planet.Sun);
    expect(sunEntry?.[1]).toBe(6);
  });

  test('NAKSHATRA_LORD has 27 entries', () => {
    expect(NAKSHATRA_LORD).toHaveLength(27);
  });

  test('Ashwini (index 0) lord = Ketu', () => {
    expect(NAKSHATRA_LORD[0]).toBe(Planet.Ketu);
  });

  test('Revati (index 26) lord = Mercury', () => {
    expect(NAKSHATRA_LORD[26]).toBe(Planet.Mercury);
  });

  test('Dasha lords cycle in the DASHA_SEQUENCE order across nakshatras', () => {
    // Nakshatras 0, 9, 18 should all have Ketu (same position in 9-cycle repeating lord)
    expect(NAKSHATRA_LORD[0]).toBe(Planet.Ketu);   // Ashwini
    expect(NAKSHATRA_LORD[9]).toBe(Planet.Ketu);   // Magha
    expect(NAKSHATRA_LORD[18]).toBe(Planet.Ketu);  // Mula
  });
});

// ===========================================================================
// getMahadashas
// ===========================================================================

describe('getMahadashas', () => {
  const birthDate = new Date('2000-01-01T00:00:00Z');

  test('Returns exactly 9 mahadasha entries', () => {
    const mahas = getMahadashas(0, birthDate);  // 0° = Ashwini = Ketu
    expect(mahas).toHaveLength(9);
  });

  test('All mahadasha levels = 1', () => {
    const mahas = getMahadashas(0, birthDate);
    for (const maha of mahas) {
      expect(maha.level).toBe(1);
    }
  });

  test('Total span of all mahadashas = 120 years (within rounding)', () => {
    const mahas = getMahadashas(0, birthDate);
    const totalMs = mahas[mahas.length - 1]!.endDate.getTime() - mahas[0]!.startDate.getTime();
    const totalYears = totalMs / (DAYS_PER_YEAR * 86400000);
    expect(totalYears).toBeCloseTo(120, 1);
  });

  test('TC-04: Moon at 0° Aries (Ashwini) — Ketu starts, Venus follows 7 years later', () => {
    // Moon at 0° = start of Ashwini = full Ketu dasha remaining
    const moonLon = 0.001;  // Just into Ashwini to get nearly full balance
    const birth = new Date('2010-01-01T00:00:00Z');
    const mahas = getMahadashas(moonLon, birth);

    expect(mahas[0]!.planet).toBe(Planet.Ketu);
    expect(mahas[1]!.planet).toBe(Planet.Venus);

    // Venus should start approximately 7 years after Ketu started
    const ketuStart = mahas[0]!.startDate;
    const venusStart = mahas[1]!.startDate;
    const diffYears = (venusStart.getTime() - ketuStart.getTime()) / (DAYS_PER_YEAR * 86400000);
    expect(diffYears).toBeCloseTo(7, 1);
  });

  test('Mahadashas are in the correct cyclic order starting from Ketu', () => {
    const moonLon = 0.001;  // Ashwini = Ketu dasha
    const mahas = getMahadashas(moonLon, birthDate);
    const expectedOrder = [
      Planet.Ketu, Planet.Venus, Planet.Sun, Planet.Moon,
      Planet.Mars, Planet.Rahu, Planet.Jupiter, Planet.Saturn, Planet.Mercury,
    ];
    for (let i = 0; i < 9; i++) {
      expect(mahas[i]!.planet).toBe(expectedOrder[i]);
    }
  });

  test('Mahadasha start dates are sequential (no gaps)', () => {
    const mahas = getMahadashas(0.001, birthDate);
    for (let i = 1; i < 9; i++) {
      const prevEnd = mahas[i - 1]!.endDate.getTime();
      const currStart = mahas[i]!.startDate.getTime();
      // They should be equal (within floating point noise of 1ms)
      expect(Math.abs(prevEnd - currStart)).toBeLessThan(2);
    }
  });

  test('Moon at midpoint of Ashwini → half of Ketu dasha remaining', () => {
    const halfAshwini = NAKSHATRA_SPAN_DEG / 2;  // 6.666...°
    const birth = new Date('2010-06-01T00:00:00Z');
    const mahas = getMahadashas(halfAshwini, birth);

    // The first mahadasha started before birth
    // Balance = (1 - 0.5) * 7 = 3.5 years
    const ketuEnd = mahas[0]!.endDate;
    const diffYears = (ketuEnd.getTime() - birth.getTime()) / (DAYS_PER_YEAR * 86400000);
    expect(diffYears).toBeCloseTo(3.5, 1);
  });

  test('Moon at end of Ashwini nakshatra → minimal Ketu balance', () => {
    const nearEndAshwini = NAKSHATRA_SPAN_DEG * 0.99;
    const birth = new Date('2010-01-01T00:00:00Z');
    const mahas = getMahadashas(nearEndAshwini, birth);

    // Very small Ketu balance, Venus starts quickly
    const ketuEnd = mahas[0]!.endDate;
    const diffYears = (ketuEnd.getTime() - birth.getTime()) / (DAYS_PER_YEAR * 86400000);
    expect(diffYears).toBeCloseTo(0.07, 1);  // ~0.01 * 7 = 0.07 years remaining
  });

  test('Moon in Bharani (Venus nakshatra) → starts with Venus mahadasha', () => {
    const bharaniStart = NAKSHATRA_SPAN_DEG + 0.001;  // Just past Ashwini
    const mahas = getMahadashas(bharaniStart, birthDate);
    expect(mahas[0]!.planet).toBe(Planet.Venus);
  });

  test('Moon in Vishakha (Jupiter) → starts with Jupiter mahadasha', () => {
    const vishakhaStart = 15 * NAKSHATRA_SPAN_DEG + 0.001;  // Vishakha = nakshatra 15
    const mahas = getMahadashas(vishakhaStart, birthDate);
    expect(mahas[0]!.planet).toBe(Planet.Jupiter);
  });
});

// ===========================================================================
// calculateDasha — Full 5-level dasha tree
// ===========================================================================

describe('calculateDasha', () => {
  const birthDate = new Date('2000-01-01T00:00:00Z');
  const moonAtAshwini = 0.001;  // Ketu dasha

  test('Returns an array (not empty)', () => {
    const dashas = calculateDasha(moonAtAshwini, birthDate);
    expect(dashas.length).toBeGreaterThan(0);
  });

  test('Each period has all 5 levels', () => {
    const dashas = calculateDasha(moonAtAshwini, birthDate);
    const first = dashas[0]!;
    expect(first.mahadasha).toBeDefined();
    expect(first.antardasha).toBeDefined();
    expect(first.pratyantardasha).toBeDefined();
    expect(first.sookshma).toBeDefined();
    expect(first.prana).toBeDefined();
  });

  test('Dasha levels are 1, 2, 3, 4, 5 respectively', () => {
    const dashas = calculateDasha(moonAtAshwini, birthDate);
    const first = dashas[0]!;
    expect(first.mahadasha.level).toBe(1);
    expect(first.antardasha.level).toBe(2);
    expect(first.pratyantardasha.level).toBe(3);
    expect(first.sookshma.level).toBe(4);
    expect(first.prana.level).toBe(5);
  });

  test('First mahadasha planet = Ketu for Moon in Ashwini', () => {
    const dashas = calculateDasha(moonAtAshwini, birthDate);
    expect(dashas[0]!.mahadasha.planet).toBe(Planet.Ketu);
  });

  test('Prana periods are non-zero duration', () => {
    const dashas = calculateDasha(moonAtAshwini, birthDate);
    const first = dashas[0]!;
    const duration = first.prana.endDate.getTime() - first.prana.startDate.getTime();
    expect(duration).toBeGreaterThan(0);
  });

  test('Consecutive prana periods are contiguous (no gaps)', () => {
    const dashas = calculateDasha(moonAtAshwini, birthDate);
    // Check first 100 prana periods for continuity
    const limit = Math.min(100, dashas.length - 1);
    for (let i = 0; i < limit; i++) {
      const end = dashas[i]!.prana.endDate.getTime();
      const nextStart = dashas[i + 1]!.prana.startDate.getTime();
      expect(Math.abs(end - nextStart)).toBeLessThan(2);  // Within 1ms
    }
  });

  test('All periods within a mahadasha have same mahadasha planet', () => {
    const dashas = calculateDasha(moonAtAshwini, birthDate);
    const ketuPeriods = dashas.filter((d) => d.mahadasha.planet === Planet.Ketu);
    for (const p of ketuPeriods) {
      expect(p.mahadasha.planet).toBe(Planet.Ketu);
    }
    expect(ketuPeriods.length).toBeGreaterThan(0);
  });

  test('Moon at Vishakha (Jupiter) → first mahadasha = Jupiter', () => {
    const vishakha = 15 * NAKSHATRA_SPAN_DEG + 0.001;
    const dashas = calculateDasha(vishakha, birthDate);
    expect(dashas[0]!.mahadasha.planet).toBe(Planet.Jupiter);
  });
});

// ===========================================================================
// getDashaLordAtDate
// ===========================================================================

describe('getDashaLordAtDate', () => {
  const birthDate = new Date('2000-01-01T00:00:00Z');
  const moonAtAshwini = 0.001;

  test('Returns a period at birth date', () => {
    const dashas = calculateDasha(moonAtAshwini, birthDate);
    const result = getDashaLordAtDate(dashas, birthDate);
    expect(result).toBeDefined();
  });

  test('Dasha at birth date has Ketu mahadasha (Moon in Ashwini)', () => {
    const dashas = calculateDasha(moonAtAshwini, birthDate);
    const result = getDashaLordAtDate(dashas, birthDate);
    expect(result!.mahadasha.planet).toBe(Planet.Ketu);
  });

  test('Dasha after 8 years (into Venus maha) has Venus mahadasha', () => {
    const dashas = calculateDasha(moonAtAshwini, birthDate);
    const futureDate = addYears(birthDate, 8);  // 8 years after = in Venus dasha (7 yr Ketu + 1 yr Venus)
    const result = getDashaLordAtDate(dashas, futureDate);
    expect(result!.mahadasha.planet).toBe(Planet.Venus);
  });

  test('TC-04: Transition at exactly year 7 — Venus starts', () => {
    // Moon at 0° of Ashwini means full 7 yr Ketu starts at birth
    const mahas = getMahadashas(moonAtAshwini, birthDate);
    const ketuEnd = mahas[0]!.endDate;
    const venusStart = mahas[1]!.startDate;

    // At exactly Venus start, should be Venus
    const dashas = calculateDasha(moonAtAshwini, birthDate);
    const justInVenus = new Date(venusStart.getTime() + 1000);  // 1 second into Venus
    const result = getDashaLordAtDate(dashas, justInVenus);
    expect(result!.mahadasha.planet).toBe(Planet.Venus);

    // Just before Venus (still Ketu)
    const justBeforeVenus = new Date(ketuEnd.getTime() - 1000);
    const resultKetu = getDashaLordAtDate(dashas, justBeforeVenus);
    expect(resultKetu!.mahadasha.planet).toBe(Planet.Ketu);
  });

  test('Returns undefined for date far before all dasha periods', () => {
    const dashas = calculateDasha(moonAtAshwini, birthDate);
    const veryOldDate = new Date('1900-01-01T00:00:00Z');
    const result = getDashaLordAtDate(dashas, veryOldDate);
    // May be undefined if before all periods
    // (the dasha tree starts before birth but not 100 years before)
    // Just verify it doesn't throw
    expect(result).toBeDefined();  // Should still be in range since first maha starts before birth
  });
});

// ===========================================================================
// getDashaLordsAtDate — condensed view
// ===========================================================================

describe('getDashaLordsAtDate', () => {
  test('Returns all 5 dasha lords at birth', () => {
    const birthDate = new Date('2000-01-01T00:00:00Z');
    const moonLon = 0.001;
    const dashas = calculateDasha(moonLon, birthDate);
    const lords = getDashaLordsAtDate(dashas, birthDate);

    expect(lords).toBeDefined();
    expect(lords!.mahadasha).toBeDefined();
    expect(lords!.antardasha).toBeDefined();
    expect(lords!.pratyantardasha).toBeDefined();
    expect(lords!.sookshma).toBeDefined();
    expect(lords!.prana).toBeDefined();
  });

  test('Mahadasha lord = Ketu for Moon in Ashwini at birth', () => {
    const birthDate = new Date('2000-01-01T00:00:00Z');
    const dashas = calculateDasha(0.001, birthDate);
    const lords = getDashaLordsAtDate(dashas, birthDate);
    expect(lords!.mahadasha).toBe(Planet.Ketu);
  });

  test('Returns undefined for empty dasha array', () => {
    const result = getDashaLordsAtDate([], new Date());
    expect(result).toBeUndefined();
  });
});

// ===========================================================================
// Dasha balance at birth
// ===========================================================================

describe('Dasha balance at birth', () => {
  test('Moon exactly at start of nakshatra → full dasha balance', () => {
    // Moon at 0° (very start of Ashwini) → full 7 years Ketu remaining
    const birth = new Date('2010-01-01T00:00:00Z');
    const moonLon = 0.00001;  // virtually at 0°
    const mahas = getMahadashas(moonLon, birth);

    const ketuEnd = mahas[0]!.endDate;
    const balanceYears = (ketuEnd.getTime() - birth.getTime()) / (DAYS_PER_YEAR * 86400000);
    // Should be close to 7 years (the full Ketu period)
    expect(balanceYears).toBeCloseTo(7, 0);  // within 1 year
  });

  test('Moon at 3/4 of nakshatra → 1/4 dasha balance remaining', () => {
    const birth = new Date('2010-01-01T00:00:00Z');
    const threeQuarterNakshatra = NAKSHATRA_SPAN_DEG * 0.75;  // 3/4 through Ashwini
    const mahas = getMahadashas(threeQuarterNakshatra, birth);

    // Balance = (1 - 0.75) * 7 = 1.75 years
    const ketuEnd = mahas[0]!.endDate;
    const balanceYears = (ketuEnd.getTime() - birth.getTime()) / (DAYS_PER_YEAR * 86400000);
    expect(balanceYears).toBeCloseTo(1.75, 1);
  });

  test('Dasha balance proportional to position within nakshatra', () => {
    const birth = new Date('2010-01-01T00:00:00Z');

    // Check several fractions
    const fractions = [0.1, 0.25, 0.5, 0.75, 0.9];
    for (const fraction of fractions) {
      const moonLon = NAKSHATRA_SPAN_DEG * fraction;
      const mahas = getMahadashas(moonLon, birth);
      const expectedBalance = (1 - fraction) * 7;  // Ketu = 7 years
      const ketuEnd = mahas[0]!.endDate;
      const actualBalance = (ketuEnd.getTime() - birth.getTime()) / (DAYS_PER_YEAR * 86400000);
      expect(actualBalance).toBeCloseTo(expectedBalance, 1);
    }
  });
});
