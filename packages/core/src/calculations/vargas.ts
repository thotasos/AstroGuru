// ============================================================
// Varga (Divisional Chart) Calculations — Parashari Precision
// ============================================================
// All calculations use the sidereal longitude of the planet.
// Each function returns a sign index 0–11 (Aries=0 … Pisces=11).
// ============================================================

import { Varga } from '../types/index.js';
import { normalizeDegrees } from '../ephemeris/swissEph.js';

// ------------------------------------
// Helper: modular arithmetic
// ------------------------------------

/** Return (n mod m) always in [0, m) */
function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Return sign index given an offset from a base sign (0-indexed). */
function signOffset(baseSign: number, offset: number): number {
  return mod(baseSign + offset, 12);
}

// ------------------------------------
// Main Dispatcher
// ------------------------------------

/**
 * Calculate the varga sign for a given sidereal longitude in the specified divisional chart.
 *
 * @param siderealLongitude  Sidereal ecliptic longitude 0–360°
 * @param varga              Divisional chart type
 * @returns Sign index 0–11 (Aries=0 … Pisces=11)
 */
export function getVargaSign(siderealLongitude: number, varga: Varga): number {
  const longitude = normalizeDegrees(siderealLongitude);

  switch (varga) {
    case Varga.D1:  return getD1Sign(longitude);
    case Varga.D2:  return getD2Sign(longitude);
    case Varga.D3:  return getD3Sign(longitude);
    case Varga.D4:  return getD4Sign(longitude);
    case Varga.D7:  return getD7Sign(longitude);
    case Varga.D9:  return getD9Sign(longitude);
    case Varga.D10: return getD10Sign(longitude);
    case Varga.D12: return getD12Sign(longitude);
    case Varga.D16: return getD16Sign(longitude);
    case Varga.D20: return getD20Sign(longitude);
    case Varga.D24: return getD24Sign(longitude);
    case Varga.D27: return getD27Sign(longitude);
    case Varga.D30: return getD30Sign(longitude);
    case Varga.D40: return getD40Sign(longitude);
    case Varga.D45: return getD45Sign(longitude);
    case Varga.D60: return getD60Sign(longitude);
  }
}

// ------------------------------------
// D1 — Rasi (Natal Chart)
// ------------------------------------
function getD1Sign(longitude: number): number {
  return Math.floor(longitude / 30);
}

// ------------------------------------
// D2 — Hora
// ------------------------------------
// Odd signs (Aries, Gemini, Leo, Virgo, Libra, Sagittarius, Aquarius):
//   0–15° → Leo (4)
//   15–30° → Cancer (3)
// Even signs (Taurus, Cancer, Virgo, Scorpio, Capricorn, Pisces):
//   0–15° → Cancer (3)
//   15–30° → Leo (4)
// Traditional: Odd (fire/air masculine) 0-15=Leo, 15-30=Cancer
//              Even (earth/water feminine) 0-15=Cancer, 15-30=Leo
function getD2Sign(longitude: number): number {
  const sign = Math.floor(longitude / 30);        // 0–11
  const degInSign = longitude % 30;               // 0–30
  const isOdd = sign % 2 === 0;                   // Aries(0)=odd in 1-indexed; 0-indexed even means 1st,3rd…=odd signs

  if (isOdd) {
    // Odd signs (Aries=0, Gemini=2, Leo=4, Libra=6, Sagittarius=8, Aquarius=10)
    return degInSign < 15 ? 4 : 3;  // Leo or Cancer
  } else {
    // Even signs (Taurus=1, Cancer=3, Virgo=5, Scorpio=7, Capricorn=9, Pisces=11)
    return degInSign < 15 ? 3 : 4;  // Cancer or Leo
  }
}

// ------------------------------------
// D3 — Drekkana
// ------------------------------------
// Each sign is divided into 3 equal parts of 10°.
// 1st drekkana (0–10°) → same sign
// 2nd drekkana (10–20°) → 5th sign from it
// 3rd drekkana (20–30°) → 9th sign from it
function getD3Sign(longitude: number): number {
  const sign = Math.floor(longitude / 30);
  const degInSign = longitude % 30;
  const portion = Math.floor(degInSign / 10);  // 0, 1, or 2
  const offsets = [0, 4, 8];
  return signOffset(sign, offsets[portion] ?? 0);
}

// ------------------------------------
// D4 — Chaturthamsha
// ------------------------------------
// 4 parts of 7°30' each.
// 0–7.5°   → same sign (offset 0)
// 7.5–15°  → 4th sign  (offset 3)
// 15–22.5° → 7th sign  (offset 6)
// 22.5–30° → 10th sign (offset 9)
function getD4Sign(longitude: number): number {
  const sign = Math.floor(longitude / 30);
  const degInSign = longitude % 30;
  const portion = Math.floor(degInSign / 7.5);  // 0,1,2,3
  const offsets = [0, 3, 6, 9];
  return signOffset(sign, offsets[Math.min(portion, 3)] ?? 0);
}

// ------------------------------------
// D7 — Saptamsha
// ------------------------------------
// 7 parts of 4°17'8.57" (= 30/7°) each.
// Odd signs (0-indexed even): start from same sign.
// Even signs (0-indexed odd): start from 7th sign from it.
function getD7Sign(longitude: number): number {
  const sign = Math.floor(longitude / 30);
  const degInSign = longitude % 30;
  const portion = Math.floor(degInSign / (30 / 7));  // 0–6
  const isOddSign = sign % 2 === 0; // Aries(0)=1st=odd

  const baseOffset = isOddSign ? 0 : 6;
  return signOffset(sign, baseOffset + portion);
}

// ------------------------------------
// D9 — Navamsha
// ------------------------------------
// 9 parts of 3°20' each. Starting sign depends on sign type:
//   Movable (Aries=0, Cancer=3, Libra=6, Capricorn=9) → start Aries (0)
//   Fixed   (Taurus=1, Leo=4, Scorpio=7, Aquarius=10) → start Capricorn (9)
//   Dual    (Gemini=2, Virgo=5, Sagittarius=8, Pisces=11) → start Cancer (3)
//
// TC-02 note: 14° Cancer → Cancer is Movable → starts Aries(0) → 14/3.333=4.2 → 4th index → 4th amsha = Scorpio (Aries+4=Leo? NO)
// Actually: Aries+0=Aries, +1=Taurus, +2=Gemini, +3=Cancer, +4=Leo... but Cancer+14°/3.333=4.2 → floor=4 → offset 4 from Aries = Leo?
// Wait: The test says "14° Cancer → Scorpio in D9". Cancer is movable, starts from Aries.
// 14° into Cancer: portion = floor(14 / 3.3333) = floor(4.2) = 4. Aries(0) + 4 = Leo(4). That gives Leo, not Scorpio.
// Re-examining: 14° in Cancer means total from Aries = 3*30 + 14 = 104°. Navamsha = floor(104 / 3.3333) = floor(31.2) = 31. 31 mod 12 = 7 = Scorpio. YES!
// So the correct formula is: global_navamsha_index = floor(siderealLongitude / (30/9)) mod 12
// This gives the correct result regardless of sign type. But traditional texts use the starting sign approach.
// The global formula and the sign-based formula should give the same result for D9.
// Let's verify with sign-based: Cancer(3), movable → start Aries(0). degInSign = 14. portion = floor(14/3.333)=4. signOffset(Aries=0, 4) = Leo(4). That's WRONG.
// The global formula gives Scorpio which is correct. So we MUST use the global formula.
// Actually let me re-examine: sign-based for Cancer: start from Aries, portion=4 → Aries+4 = Leo.
// But total global index: 3*9 + floor(14/3.333) = 27 + 4 = 31. 31 mod 12 = 7 = Scorpio. CORRECT.
// The global index formula is definitively correct per traditional sources too (each 30° = 9 navamshas).
// The "starting sign" approach for sign-based is equivalent because:
//   Aries start: Navamsha indices 0,1,2,...,8 of Aries sign = Aries,Taurus,...,Sagittarius
//   For Cancer (3rd sign, movable, starts Aries): portion within Cancer 0-8 maps to Aries(0)..Sagittarius(8)
//   But the global index for Cancer portion 4 = 3*9+4=31, 31 mod 12 = 7 = Scorpio.
//   Sign-based: signOffset(Aries=0, 4) = Leo(4). DISCREPANCY.
// The issue: "start Aries" means the 1st navamsha of the entire zodiac (Aries sign, portion 0) = Aries.
// For Cancer sign (3rd sign): global start = 3*9=27. 27 mod 12 = 3 = Cancer. So Cancer's 1st navamsha = Cancer(3).
// Then portion 4: Cancer(3) + 4 = Scorpio(7). CORRECT!
// So: Aries(0)*9=0 mod12=0=Aries start, Taurus(1)*9=9 mod12=9=Capricorn start, Gemini(2)*9=18 mod12=6=Libra start, Cancer(3)*9=27 mod12=3=Cancer start.
// The GLOBAL formula is simply: floor(siderealLongitude * 9 / 30) mod 12 = floor(lon/3.333) mod 12
function getD9Sign(longitude: number): number {
  const globalIndex = Math.floor(longitude * 9 / 30);
  return mod(globalIndex, 12);
}

// ------------------------------------
// D10 — Dashamsha
// ------------------------------------
// 10 parts of 3° each.
// Odd signs: first amsha = same sign, progressing forward.
// Even signs: first amsha = 9th sign from it.
function getD10Sign(longitude: number): number {
  const sign = Math.floor(longitude / 30);
  const degInSign = longitude % 30;
  const portion = Math.floor(degInSign / 3);  // 0–9
  const isOddSign = sign % 2 === 0;

  const baseOffset = isOddSign ? 0 : 8;  // 9th sign = offset 8
  return signOffset(sign, baseOffset + portion);
}

// ------------------------------------
// D12 — Dwadashamsha
// ------------------------------------
// 12 parts of 2°30' each. First amsha = same sign.
function getD12Sign(longitude: number): number {
  const sign = Math.floor(longitude / 30);
  const degInSign = longitude % 30;
  const portion = Math.floor(degInSign / 2.5);  // 0–11
  return signOffset(sign, portion);
}

// ------------------------------------
// D16 — Shodashamsha (Kalamsha)
// ------------------------------------
// 16 parts of 1°52'30" (= 30/16°) each.
// Movable signs → start Aries (0)
// Fixed signs → start Leo (4)
// Dual signs → start Sagittarius (8)
function getD16Sign(longitude: number): number {
  const sign = Math.floor(longitude / 30);
  const degInSign = longitude % 30;
  const portion = Math.floor(degInSign / (30 / 16));  // 0–15
  const signType = sign % 3;  // 0=movable(Aries,Cancer,Libra,Cap), 1=fixed(Tau,Leo,Sco,Aqu), 2=dual(Gem,Vir,Sag,Pis)
  // Movable signs: 0,3,6,9; Fixed: 1,4,7,10; Dual: 2,5,8,11
  // sign%3: Aries(0)%3=0 movable, Taurus(1)%3=1 fixed, Gemini(2)%3=2 dual ✓
  const baseSign = [0, 4, 8][signType] ?? 0;
  return signOffset(baseSign, portion);
}

// ------------------------------------
// D20 — Vimshamsha
// ------------------------------------
// 20 parts of 1°30' each.
// Movable signs → start Aries (0)
// Fixed signs → start Sagittarius (8)
// Dual signs → start Leo (4)
// Note: Traditional Parashari uses:
//   Movable → Aries, Fixed → Sagittarius, Dual → Leo
function getD20Sign(longitude: number): number {
  const sign = Math.floor(longitude / 30);
  const degInSign = longitude % 30;
  const portion = Math.floor(degInSign / (30 / 20));  // 0–19
  const signType = sign % 3;
  // Movable=Aries(0), Fixed=Sagittarius(8), Dual=Leo(4)
  const baseSign = [0, 8, 4][signType] ?? 0;
  return signOffset(baseSign, portion);
}

// ------------------------------------
// D24 — Chaturvimshamsha (Siddhamsha)
// ------------------------------------
// 24 parts of 1°15' each.
// Odd signs (0-indexed even) → start Leo (4)
// Even signs (0-indexed odd) → start Cancer (3)
function getD24Sign(longitude: number): number {
  const sign = Math.floor(longitude / 30);
  const degInSign = longitude % 30;
  const portion = Math.floor(degInSign / (30 / 24));  // 0–23
  const isOddSign = sign % 2 === 0;
  const baseSign = isOddSign ? 4 : 3;  // Leo or Cancer
  return signOffset(baseSign, portion);
}

// ------------------------------------
// D27 — Bhamsha (Nakshatramsha / Saptavimshamsha)
// ------------------------------------
// 27 parts of 1°6'40" (= 30/27°) each.
// Fire signs (Aries=0, Leo=4, Sagittarius=8) → start Aries (0)
// Earth signs (Taurus=1, Virgo=5, Capricorn=9) → start Cancer (3)
// Air signs (Gemini=2, Libra=6, Aquarius=10) → start Libra (6)
// Water signs (Cancer=3, Scorpio=7, Pisces=11) → start Capricorn (9)
function getD27Sign(longitude: number): number {
  const sign = Math.floor(longitude / 30);
  const degInSign = longitude % 30;
  const portion = Math.floor(degInSign / (30 / 27));  // 0–26
  const elementBase = [0, 3, 6, 9, 0, 6, 6, 9, 0, 3, 6, 9] as const;
  // Fire=0(Aries),4(Leo),8(Sag) → Aries(0); Earth=1,5,9→Cancer(3); Air=2,6,10→Libra(6); Water=3,7,11→Cap(9)
  const signElement: Record<number, number> = {
    0: 0, 4: 0, 8: 0,   // Fire → Aries
    1: 3, 5: 3, 9: 3,   // Earth → Cancer
    2: 6, 6: 6, 10: 6,  // Air → Libra
    3: 9, 7: 9, 11: 9,  // Water → Capricorn
  };
  void elementBase; // used for documentation
  const baseSign = signElement[sign] ?? 0;
  return signOffset(baseSign, portion);
}

// ------------------------------------
// D30 — Trimshamsha
// ------------------------------------
// Unequal divisions (5 sub-divisions per sign assigned to 5 planets).
// Odd signs (0-indexed even): Mars 0–5°, Saturn 5–10°, Jupiter 10–18°, Mercury 18–25°, Venus 25–30°
// Even signs (0-indexed odd): Venus 0–5°, Mercury 5–12°, Jupiter 12–20°, Saturn 20–25°, Mars 25–30°
//
// The varga sign = the moolatrikona or own sign of the ruling planet for that portion.
// Planet → natural sign (primary own sign):
//   Mars → Aries(0) [odd] / Scorpio(7) [even]
//   Saturn → Aquarius(10) [odd] / Capricorn(9) [even]
//   Jupiter → Sagittarius(8)
//   Mercury → Virgo(5)
//   Venus → Libra(6) [odd] / Taurus(1) [even]
//
// More precisely: for Trimshamsha we use the traditional "trimshansa lord" sign mapping:
// The sign given for each portion is the natural sign owned by that planet corresponding to the
// chart sign's quality (odd/even → masculine/feminine sign of that planet).
function getD30Sign(longitude: number): number {
  const sign = Math.floor(longitude / 30);
  const degInSign = longitude % 30;
  const isOddSign = sign % 2 === 0; // Aries(0)=odd

  if (isOddSign) {
    // Odd signs: Mars 0–5, Saturn 5–10, Jupiter 10–18, Mercury 18–25, Venus 25–30
    if (degInSign < 5)  return 0;   // Aries (Mars)
    if (degInSign < 10) return 10;  // Aquarius (Saturn)
    if (degInSign < 18) return 8;   // Sagittarius (Jupiter)
    if (degInSign < 25) return 5;   // Virgo (Mercury)
    return 6;                        // Libra (Venus)
  } else {
    // Even signs: Venus 0–5, Mercury 5–12, Jupiter 12–20, Saturn 20–25, Mars 25–30
    if (degInSign < 5)  return 1;   // Taurus (Venus)
    if (degInSign < 12) return 2;   // Gemini (Mercury)
    if (degInSign < 20) return 8;   // Sagittarius (Jupiter)
    if (degInSign < 25) return 9;   // Capricorn (Saturn)
    return 7;                        // Scorpio (Mars)
  }
}

// ------------------------------------
// D40 — Khavedamsha
// ------------------------------------
// 40 parts of 0°45' each.
// Movable signs → start Aries (0)
// Fixed signs → start Cancer (3)
// Dual signs → start Libra (6)
function getD40Sign(longitude: number): number {
  const sign = Math.floor(longitude / 30);
  const degInSign = longitude % 30;
  const portion = Math.floor(degInSign / (30 / 40));  // 0–39
  const signType = sign % 3;
  // Movable=Aries(0), Fixed=Cancer(3), Dual=Libra(6)
  const baseSign = [0, 3, 6][signType] ?? 0;
  return signOffset(baseSign, portion);
}

// ------------------------------------
// D45 — Akshavedamsha
// ------------------------------------
// 45 parts of 0°40' each.
// Movable signs → start Aries (0)
// Fixed signs → start Leo (4)
// Dual signs → start Sagittarius (8)
function getD45Sign(longitude: number): number {
  const sign = Math.floor(longitude / 30);
  const degInSign = longitude % 30;
  const portion = Math.floor(degInSign / (30 / 45));  // 0–44
  const signType = sign % 3;
  // Movable=Aries(0), Fixed=Leo(4), Dual=Sagittarius(8)
  const baseSign = [0, 4, 8][signType] ?? 0;
  return signOffset(baseSign, portion);
}

// ------------------------------------
// D60 — Shashtiamsha
// ------------------------------------
// 60 parts of 0°30' each.
// Odd signs (0-indexed even) → start Aries (0)
// Even signs (0-indexed odd) → start Libra (6)
function getD60Sign(longitude: number): number {
  const sign = Math.floor(longitude / 30);
  const degInSign = longitude % 30;
  const portion = Math.floor(degInSign / 0.5);  // 0–59
  const isOddSign = sign % 2 === 0;
  const baseSign = isOddSign ? 0 : 6;
  return signOffset(baseSign, portion);
}

// ------------------------------------
// Batch utility
// ------------------------------------

/**
 * Calculate all varga signs for a given sidereal longitude.
 *
 * @param siderealLongitude  Sidereal ecliptic longitude 0–360°
 * @returns Record mapping each Varga to its sign index (0–11)
 */
export function getAllVargaSigns(siderealLongitude: number): Record<Varga, number> {
  const result = {} as Record<Varga, number>;
  for (const varga of Object.values(Varga)) {
    result[varga] = getVargaSign(siderealLongitude, varga);
  }
  return result;
}

/**
 * Get the sign name for a given varga sign index (for debugging/display).
 */
export function getSignNameFromIndex(signIndex: number): string {
  const names = [
    'Aries', 'Taurus', 'Gemini', 'Cancer',
    'Leo', 'Virgo', 'Libra', 'Scorpio',
    'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ];
  return names[mod(signIndex, 12)] ?? 'Unknown';
}
