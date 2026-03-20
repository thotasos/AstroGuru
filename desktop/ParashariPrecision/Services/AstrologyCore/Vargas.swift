// ============================================================
// Varga (Divisional Chart) Calculations — Parashari Precision
// ============================================================
// All calculations use the sidereal longitude of the planet.
// Each function returns a sign index 0–11 (Aries=0 … Pisces=11).
// ============================================================

import Foundation

// ------------------------------------
// Helper: modular arithmetic
// ------------------------------------

/** Return (n mod m) always in [0, m) */
private func mod(_ n: Double, _ m: Double) -> Double {
    return ((n.truncatingRemainder(dividingBy: m)) + m).truncatingRemainder(dividingBy: m)
}

/** Return Int mod */
private func mod(_ n: Int, _ m: Int) -> Int {
    return ((n % m) + m) % m
}

/** Return sign index given an offset from a base sign (0-indexed). */
private func signOffset(_ baseSign: Int, _ offset: Int) -> Int {
    return mod(baseSign + offset, 12)
}

/** Normalize degrees to 0-360 range */
private func normalizeDegrees(_ longitude: Double) -> Double {
    return mod(longitude, 360)
}

// ------------------------------------
// Main Dispatcher
// ------------------------------------

/**
 * Calculate the varga sign for a given sidereal longitude in the specified divisional chart.
 *
 * - Parameters:
 *   - siderealLongitude: Sidereal ecliptic longitude 0–360°
 *   - varga: Divisional chart type
 * - Returns: Sign index 0–11 (Aries=0 … Pisces=11)
 */
func getVargaSign(siderealLongitude: Double, varga: Varga) -> Int {
    let longitude = normalizeDegrees(siderealLongitude)

    switch varga {
    case .d1:  return getD1Sign(longitude: longitude)
    case .d2:  return getD2Sign(longitude: longitude)
    case .d3:  return getD3Sign(longitude: longitude)
    case .d4:  return getD4Sign(longitude: longitude)
    case .d7:  return getD7Sign(longitude: longitude)
    case .d9:  return getD9Sign(longitude: longitude)
    case .d10: return getD10Sign(longitude: longitude)
    case .d12: return getD12Sign(longitude: longitude)
    case .d16: return getD16Sign(longitude: longitude)
    case .d20: return getD20Sign(longitude: longitude)
    case .d24: return getD24Sign(longitude: longitude)
    case .d27: return getD27Sign(longitude: longitude)
    case .d30: return getD30Sign(longitude: longitude)
    case .d40: return getD40Sign(longitude: longitude)
    case .d45: return getD45Sign(longitude: longitude)
    case .d60: return getD60Sign(longitude: longitude)
    }
}

// ------------------------------------
// D1 — Rasi (Natal Chart)
// ------------------------------------

private func getD1Sign(longitude: Double) -> Int {
    return Int(longitude / 30)
}

// ------------------------------------
// D2 — Hora
// ------------------------------------

private func getD2Sign(longitude: Double) -> Int {
    let sign = Int(longitude / 30)        // 0–11
    let degInSign = longitude.truncatingRemainder(dividingBy: 30)  // 0–30
    let isOdd = sign % 2 == 0            // Aries(0)=odd in 1-indexed

    if isOdd {
        // Odd signs (Aries=0, Gemini=2, Leo=4, Libra=6, Sagittarius=8, Aquarius=10)
        return degInSign < 15 ? 4 : 3  // Leo or Cancer
    } else {
        // Even signs (Taurus=1, Cancer=3, Virgo=5, Scorpio=7, Capricorn=9, Pisces=11)
        return degInSign < 15 ? 3 : 4  // Cancer or Leo
    }
}

// ------------------------------------
// D3 — Drekkana
// ------------------------------------

private func getD3Sign(longitude: Double) -> Int {
    let sign = Int(longitude / 30)
    let degInSign = longitude.truncatingRemainder(dividingBy: 30)
    let portion = Int(degInSign / 10)  // 0, 1, or 2
    let offsets = [0, 4, 8]
    return signOffset(sign, offsets[portion] ?? 0)
}

// ------------------------------------
// D4 — Chaturthamsha
// ------------------------------------

private func getD4Sign(longitude: Double) -> Int {
    let sign = Int(longitude / 30)
    let degInSign = longitude.truncatingRemainder(dividingBy: 30)
    let portion = Int(degInSign / 7.5)  // 0,1,2,3
    let offsets = [0, 3, 6, 9]
    return signOffset(sign, offsets[min(portion, 3)] ?? 0)
}

// ------------------------------------
// D7 — Saptamsha
// ------------------------------------

private func getD7Sign(longitude: Double) -> Int {
    let sign = Int(longitude / 30)
    let degInSign = longitude.truncatingRemainder(dividingBy: 30)
    let portion = Int(degInSign / (30.0 / 7.0))  // 0–6
    let isOddSign = sign % 2 == 0 // Aries(0)=1st=odd

    let baseOffset = isOddSign ? 0 : 6
    return signOffset(sign, baseOffset + portion)
}

// ------------------------------------
// D9 — Navamsha
// ------------------------------------

private func getD9Sign(longitude: Double) -> Int {
    let globalIndex = Int(longitude * 9.0 / 30.0)
    return mod(globalIndex, 12)
}

// ------------------------------------
// D10 — Dashamsha
// ------------------------------------

private func getD10Sign(longitude: Double) -> Int {
    let sign = Int(longitude / 30)
    let degInSign = longitude.truncatingRemainder(dividingBy: 30)
    let portion = Int(degInSign / 3)  // 0–9
    let isOddSign = sign % 2 == 0

    let baseOffset = isOddSign ? 0 : 8  // 9th sign = offset 8
    return signOffset(sign, baseOffset + portion)
}

// ------------------------------------
// D12 — Dwadashamsha
// ------------------------------------

private func getD12Sign(longitude: Double) -> Int {
    let sign = Int(longitude / 30)
    let degInSign = longitude.truncatingRemainder(dividingBy: 30)
    let portion = Int(degInSign / 2.5)  // 0–11
    return signOffset(sign, portion)
}

// ------------------------------------
// D16 — Shodashamsha (Kalamsha)
// ------------------------------------

private func getD16Sign(longitude: Double) -> Int {
    let sign = Int(longitude / 30)
    let degInSign = longitude.truncatingRemainder(dividingBy: 30)
    let portion = Int(degInSign / (30.0 / 16.0))  // 0–15
    let signType = sign % 3  // 0=movable, 1=fixed, 2=dual
    let baseSign = [0, 4, 8][signType] ?? 0
    return signOffset(baseSign, portion)
}

// ------------------------------------
// D20 — Vimshamsha
// ------------------------------------

private func getD20Sign(longitude: Double) -> Int {
    let sign = Int(longitude / 30)
    let degInSign = longitude.truncatingRemainder(dividingBy: 30)
    let portion = Int(degInSign / (30.0 / 20.0))  // 0–19
    let signType = sign % 3
    let baseSign = [0, 8, 4][signType] ?? 0  // Movable=Aries, Fixed=Sagittarius, Dual=Leo
    return signOffset(baseSign, portion)
}

// ------------------------------------
// D24 — Chaturvimshamsha (Siddhamsha)
// ------------------------------------

private func getD24Sign(longitude: Double) -> Int {
    let sign = Int(longitude / 30)
    let degInSign = longitude.truncatingRemainder(dividingBy: 30)
    let portion = Int(degInSign / (30.0 / 24.0))  // 0–23
    let isOddSign = sign % 2 == 0
    let baseSign = isOddSign ? 4 : 3  // Leo or Cancer
    return signOffset(baseSign, portion)
}

// ------------------------------------
// D27 — Bhamsha (Nakshatramsha / Saptavimshamsha)
// ------------------------------------

private func getD27Sign(longitude: Double) -> Int {
    let sign = Int(longitude / 30)
    let degInSign = longitude.truncatingRemainder(dividingBy: 30)
    let portion = Int(degInSign / (30.0 / 27.0))  // 0–26

    // Fire=0(Aries),4(Leo),8(Sag) → Aries(0); Earth=1,5,9→Cancer(3); Air=2,6,10→Libra(6); Water=3,7,11→Cap(9)
    let signElement: [Int: Int] = [
        0: 0, 4: 0, 8: 0,   // Fire → Aries
        1: 3, 5: 3, 9: 3,   // Earth → Cancer
        2: 6, 6: 6, 10: 6,  // Air → Libra
        3: 9, 7: 9, 11: 9,   // Water → Capricorn
    ]
    let baseSign = signElement[sign] ?? 0
    return signOffset(baseSign, portion)
}

// ------------------------------------
// D30 — Trimshamsha
// ------------------------------------

private func getD30Sign(longitude: Double) -> Int {
    let sign = Int(longitude / 30)
    let degInSign = longitude.truncatingRemainder(dividingBy: 30)
    let isOddSign = sign % 2 == 0 // Aries(0)=odd

    if isOddSign {
        // Odd signs: Mars 0–5, Saturn 5–10, Jupiter 10–18, Mercury 18–25, Venus 25–30
        if degInSign < 5  { return 0 }   // Aries (Mars)
        if degInSign < 10 { return 10 }  // Aquarius (Saturn)
        if degInSign < 18 { return 8 }   // Sagittarius (Jupiter)
        if degInSign < 25 { return 5 }   // Virgo (Mercury)
        return 6                        // Libra (Venus)
    } else {
        // Even signs: Venus 0–5, Mercury 5–12, Jupiter 12–20, Saturn 20–25, Mars 25–30
        if degInSign < 5  { return 1 }   // Taurus (Venus)
        if degInSign < 12 { return 2 }   // Gemini (Mercury)
        if degInSign < 20 { return 8 }   // Sagittarius (Jupiter)
        if degInSign < 25 { return 9 }   // Capricorn (Saturn)
        return 7                        // Scorpio (Mars)
    }
}

// ------------------------------------
// D40 — Khavedamsha
// ------------------------------------

private func getD40Sign(longitude: Double) -> Int {
    let sign = Int(longitude / 30)
    let degInSign = longitude.truncatingRemainder(dividingBy: 30)
    let portion = Int(degInSign / (30.0 / 40.0))  // 0–39
    let signType = sign % 3
    let baseSign = [0, 3, 6][signType] ?? 0  // Movable=Aries, Fixed=Cancer, Dual=Libra
    return signOffset(baseSign, portion)
}

// ------------------------------------
// D45 — Akshavedamsha
// ------------------------------------

private func getD45Sign(longitude: Double) -> Int {
    let sign = Int(longitude / 30)
    let degInSign = longitude.truncatingRemainder(dividingBy: 30)
    let portion = Int(degInSign / (30.0 / 45.0))  // 0–44
    let signType = sign % 3
    let baseSign = [0, 4, 8][signType] ?? 0  // Movable=Aries, Fixed=Leo, Dual=Sagittarius
    return signOffset(baseSign, portion)
}

// ------------------------------------
// D60 — Shashtiamsha
// ------------------------------------

private func getD60Sign(longitude: Double) -> Int {
    let sign = Int(longitude / 30)
    let degInSign = longitude.truncatingRemainder(dividingBy: 30)
    let portion = Int(degInSign / 0.5)  // 0–59
    let isOddSign = sign % 2 == 0
    let baseSign = isOddSign ? 0 : 6
    return signOffset(baseSign, portion)
}

// ------------------------------------
// Batch utility
// ------------------------------------

/**
 * Calculate all varga signs for a given sidereal longitude.
 *
 * - Parameter siderealLongitude: Sidereal ecliptic longitude 0–360°
 * - Returns: Dictionary mapping each Varga to its sign index (0–11)
 */
func getAllVargaSigns(siderealLongitude: Double) -> [Varga: Int] {
    var result: [Varga: Int] = [:]
    for varga in Varga.allCases {
        result[varga] = getVargaSign(siderealLongitude: siderealLongitude, varga: varga)
    }
    return result
}

/**
 * Get the sign name for a given varga sign index (for debugging/display).
 */
func getSignNameFromIndex(_ signIndex: Int) -> String {
    let names = [
        "Aries", "Taurus", "Gemini", "Cancer",
        "Leo", "Virgo", "Libra", "Scorpio",
        "Sagittarius", "Capricorn", "Aquarius", "Pisces",
    ]
    return names[mod(signIndex, 12)] ?? "Unknown"
}
