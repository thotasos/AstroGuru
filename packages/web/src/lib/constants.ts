import type { Planet, Sign, Nakshatra } from '@parashari/core';

export const PLANET_NAMES: Record<number, string> = {
  0: 'Sun',
  1: 'Moon',
  2: 'Mars',
  3: 'Mercury',
  4: 'Jupiter',
  5: 'Venus',
  6: 'Saturn',
  7: 'Rahu',
  8: 'Ketu',
};

export const PLANET_ABBR: Record<number, string> = {
  0: 'Su',
  1: 'Mo',
  2: 'Ma',
  3: 'Me',
  4: 'Ju',
  5: 'Ve',
  6: 'Sa',
  7: 'Ra',
  8: 'Ke',
};

export const PLANET_COLORS: Record<number, string> = {
  0: '#FCD34D',   // Sun — gold
  1: '#E2E8F0',   // Moon — silver
  2: '#EF4444',   // Mars — red
  3: '#22C55E',   // Mercury — green
  4: '#EAB308',   // Jupiter — yellow
  5: '#EC4899',   // Venus — pink
  6: '#94A3B8',   // Saturn — blue-grey
  7: '#A855F7',   // Rahu — purple
  8: '#92400E',   // Ketu — brown
};

export const SIGN_NAMES: Record<number, string> = {
  0: 'Aries',
  1: 'Taurus',
  2: 'Gemini',
  3: 'Cancer',
  4: 'Leo',
  5: 'Virgo',
  6: 'Libra',
  7: 'Scorpio',
  8: 'Sagittarius',
  9: 'Capricorn',
  10: 'Aquarius',
  11: 'Pisces',
};

export const SIGN_ABBR: Record<number, string> = {
  0: 'Ar',
  1: 'Ta',
  2: 'Ge',
  3: 'Ca',
  4: 'Le',
  5: 'Vi',
  6: 'Li',
  7: 'Sc',
  8: 'Sa',
  9: 'Cp',
  10: 'Aq',
  11: 'Pi',
};

export const NAKSHATRA_NAMES: Record<number, string> = {
  0: 'Ashwini',
  1: 'Bharani',
  2: 'Krittika',
  3: 'Rohini',
  4: 'Mrigashira',
  5: 'Ardra',
  6: 'Punarvasu',
  7: 'Pushya',
  8: 'Ashlesha',
  9: 'Magha',
  10: 'Purva Phalguni',
  11: 'Uttara Phalguni',
  12: 'Hasta',
  13: 'Chitra',
  14: 'Swati',
  15: 'Vishakha',
  16: 'Anuradha',
  17: 'Jyeshtha',
  18: 'Mula',
  19: 'Purva Ashadha',
  20: 'Uttara Ashadha',
  21: 'Shravana',
  22: 'Dhanishta',
  23: 'Shatabhisha',
  24: 'Purva Bhadrapada',
  25: 'Uttara Bhadrapada',
  26: 'Revati',
};

/** Nakshatra lords (dasha lords) */
export const NAKSHATRA_LORDS: Record<number, number> = {
  0: 7, // Ashwini — Ketu
  1: 5, // Bharani — Venus
  2: 0, // Krittika — Sun
  3: 1, // Rohini — Moon
  4: 2, // Mrigashira — Mars
  5: 8, // Ardra — Rahu
  6: 4, // Punarvasu — Jupiter
  7: 6, // Pushya — Saturn
  8: 3, // Ashlesha — Mercury
  9: 8, // Magha — Ketu (wait: Ketu=8)
  10: 5, // PurvaPhalguni — Venus
  11: 0, // UttaraPhalguni — Sun
  12: 1, // Hasta — Moon
  13: 2, // Chitra — Mars
  14: 7, // Swati — Rahu
  15: 4, // Vishakha — Jupiter
  16: 6, // Anuradha — Saturn
  17: 3, // Jyeshtha — Mercury
  18: 8, // Mula — Ketu
  19: 5, // PurvaAshadha — Venus
  20: 0, // UttaraAshadha — Sun
  21: 1, // Shravana — Moon
  22: 2, // Dhanishta — Mars
  23: 7, // Shatabhisha — Rahu
  24: 4, // PurvaBhadrapada — Jupiter
  25: 6, // UttaraBhadrapada — Saturn
  26: 3, // Revati — Mercury
};

/** Vimshottari dasha years by planet */
export const DASHA_YEARS: Record<number, number> = {
  0: 6,   // Sun
  1: 10,  // Moon
  2: 7,   // Mars
  3: 17,  // Mercury
  4: 16,  // Jupiter
  5: 20,  // Venus
  6: 19,  // Saturn
  7: 18,  // Rahu
  8: 7,   // Ketu
};

/** South Indian chart fixed sign grid: [row][col] = sign number
 * -1 = center metadata cell */
export const SI_GRID: number[][] = [
  [11, 0, 1, 2],   // Pisces, Aries, Taurus, Gemini
  [10, -1, -1, 3], // Aquarius, [center], [center], Cancer
  [9, -1, -1, 4],  // Capricorn, [center], [center], Leo
  [8, 7, 6, 5],    // Sagittarius, Scorpio, Libra, Virgo
];

export const VARGAS = [
  { id: 'D1', label: 'D1 – Rashi', description: 'Birth chart / Personality' },
  { id: 'D2', label: 'D2 – Hora', description: 'Wealth & finances' },
  { id: 'D3', label: 'D3 – Drekkana', description: 'Siblings & courage' },
  { id: 'D4', label: 'D4 – Chaturthamsha', description: 'Fortune & home' },
  { id: 'D7', label: 'D7 – Saptamsha', description: 'Children & progeny' },
  { id: 'D9', label: 'D9 – Navamsha', description: 'Dharma & spouse' },
  { id: 'D10', label: 'D10 – Dashamsha', description: 'Career & status' },
  { id: 'D12', label: 'D12 – Dwadashamsha', description: 'Parents' },
  { id: 'D16', label: 'D16 – Shodashamsha', description: 'Vehicles & comforts' },
  { id: 'D20', label: 'D20 – Vimshamsha', description: 'Spiritual practice' },
  { id: 'D24', label: 'D24 – Chaturvimshamsha', description: 'Education & learning' },
  { id: 'D27', label: 'D27 – Bhamsha', description: 'Strength & vitality' },
  { id: 'D30', label: 'D30 – Trimshamsha', description: 'Misfortunes & evil' },
  { id: 'D40', label: 'D40 – Khavedamsha', description: 'Auspicious effects' },
  { id: 'D45', label: 'D45 – Akshavedamsha', description: 'General matters' },
  { id: 'D60', label: 'D60 – Shashtiamsha', description: 'Past life karma' },
];
