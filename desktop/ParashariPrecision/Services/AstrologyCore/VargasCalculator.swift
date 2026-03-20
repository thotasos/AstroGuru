import Foundation

// MARK: - Varga (Divisional Chart) Calculator
//
// Pure Swift implementation for calculating varga signs from sidereal longitude.
// All functions return sign index 0-11 (Aries=0 ... Pisces=11).
// Based on the TypeScript implementation in packages/core/src/calculations/vargas.ts
//
// NOTE: Varga enum is defined in Types.swift

// MARK: - Vargas Calculator

public struct VargasCalculator {

    /// Normalize degrees to 0-360 range
    public static func normalizeDegrees(_ longitude: Double) -> Double {
        var result = longitude.truncatingRemainder(dividingBy: 360)
        if result < 0 {
            result += 360
        }
        return result
    }

    /// Return (n mod m) always in [0, m)
    private static func mod(_ n: Double, _ m: Int) -> Int {
        let result = Int(n.truncatingRemainder(dividingBy: Double(m)))
        return result < 0 ? result + m : result
    }

    /// Return (n mod m) always in [0, m)
    private static func modInt(_ n: Int, _ m: Int) -> Int {
        let result = n % m
        return result < 0 ? result + m : result
    }

    /// Return sign index given an offset from a base sign (0-indexed)
    private static func signOffset(baseSign: Int, offset: Int) -> Int {
        return modInt(baseSign + offset, 12)
    }

    // MARK: - Main Dispatcher

    /// Calculate the varga sign for a given sidereal longitude
    ///
    /// - Parameters:
    ///   - siderealLongitude: Sidereal ecliptic longitude 0-360°
    ///   - varga: Divisional chart type
    /// - Returns: Sign index 0-11 (Aries=0 ... Pisces=11)
    public static func getVargaSign(siderealLongitude: Double, varga: Varga) -> Int {
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

    // MARK: - D1 — Rasi (Natal Chart)

    /// D1: Simple division by 30°
    public static func getD1Sign(longitude: Double) -> Int {
        return Int(longitude / 30)
    }

    // MARK: - D2 — Hora

    /// D2: Odd signs → 0-15° = Leo(4), 15-30° = Cancer(3)
    ///     Even signs → 0-15° = Cancer(3), 15-30° = Leo(4)
    public static func getD2Sign(longitude: Double) -> Int {
        let sign = Int(longitude / 30)        // 0-11
        let degInSign = longitude.truncatingRemainder(dividingBy: 30)  // 0-30
        let isOdd = sign % 2 == 0              // Aries(0)=odd in 1-indexed

        if isOdd {
            // Odd signs (Aries=0, Gemini=2, Leo=4, Libra=6, Sagittarius=8, Aquarius=10)
            return degInSign < 15 ? 4 : 3  // Leo or Cancer
        } else {
            // Even signs (Taurus=1, Cancer=3, Virgo=5, Scorpio=7, Capricorn=9, Pisces=11)
            return degInSign < 15 ? 3 : 4  // Cancer or Leo
        }
    }

    // MARK: - D3 — Drekkana

    /// D3: 3 parts of 10° each
    /// 0-10° → same sign, 10-20° → 5th sign, 20-30° → 9th sign
    public static func getD3Sign(longitude: Double) -> Int {
        let sign = Int(longitude / 30)
        let degInSign = longitude.truncatingRemainder(dividingBy: 30)
        let portion = Int(degInSign / 10)  // 0, 1, or 2
        let offsets = [0, 4, 8]
        return signOffset(baseSign: sign, offset: offsets[portion])
    }

    // MARK: - D4 — Chaturthamsha

    /// D4: 4 parts of 7°30' each
    /// 0-7.5° → same sign, 7.5-15° → 4th sign, 15-22.5° → 7th sign, 22.5-30° → 10th sign
    public static func getD4Sign(longitude: Double) -> Int {
        let sign = Int(longitude / 30)
        let degInSign = longitude.truncatingRemainder(dividingBy: 30)
        let portion = Int(degInSign / 7.5)  // 0,1,2,3
        let offsets = [0, 3, 6, 9]
        return signOffset(baseSign: sign, offset: offsets[min(portion, 3)])
    }

    // MARK: - D7 — Saptamsha

    /// D7: 7 parts of 4°17'8.57" (= 30/7°) each
    /// Odd signs: start from same sign
    /// Even signs: start from 7th sign
    public static func getD7Sign(longitude: Double) -> Int {
        let sign = Int(longitude / 30)
        let degInSign = longitude.truncatingRemainder(dividingBy: 30)
        let portion = Int(degInSign / (30.0 / 7.0))  // 0-6
        let isOddSign = sign % 2 == 0  // Aries(0)=1st=odd

        let baseOffset = isOddSign ? 0 : 6
        return signOffset(baseSign: sign, offset: baseOffset + portion)
    }

    // MARK: - D9 — Navamsha

    /// D9: 9 parts of 3°20' each
    /// Global formula: floor(longitude * 9 / 30) mod 12
    public static func getD9Sign(longitude: Double) -> Int {
        let globalIndex = Int(longitude * 9.0 / 30.0)
        return mod(globalIndex, 12)
    }

    // MARK: - D10 — Dashamsha

    /// D10: 10 parts of 3° each
    /// Odd signs: start from same sign
    /// Even signs: start from 9th sign (offset 8)
    public static func getD10Sign(longitude: Double) -> Int {
        let sign = Int(longitude / 30)
        let degInSign = longitude.truncatingRemainder(dividingBy: 30)
        let portion = Int(degInSign / 3)  // 0-9
        let isOddSign = sign % 2 == 0

        let baseOffset = isOddSign ? 0 : 8  // 9th sign = offset 8
        return signOffset(baseSign: sign, offset: baseOffset + portion)
    }

    // MARK: - D12 — Dwadashamsha

    /// D12: 12 parts of 2°30' each. First amsha = same sign.
    public static func getD12Sign(longitude: Double) -> Int {
        let sign = Int(longitude / 30)
        let degInSign = longitude.truncatingRemainder(dividingBy: 30)
        let portion = Int(degInSign / 2.5)  // 0-11
        return signOffset(baseSign: sign, offset: portion)
    }

    // MARK: - D16 — Shodashamsha (Kalamsha)

    /// D16: 16 parts of 1°52'30" (= 30/16°) each
    /// Movable signs → start Aries (0)
    /// Fixed signs → start Leo (4)
    /// Dual signs → start Sagittarius (8)
    public static func getD16Sign(longitude: Double) -> Int {
        let sign = Int(longitude / 30)
        let degInSign = longitude.truncatingRemainder(dividingBy: 30)
        let portion = Int(degInSign / (30.0 / 16.0))  // 0-15
        let signType = sign % 3  // 0=movable, 1=fixed, 2=dual
        // Movable signs: 0,3,6,9; Fixed: 1,4,7,10; Dual: 2,5,8,11
        let baseSigns = [0, 4, 8]
        let baseSign = baseSigns[signType]
        return signOffset(baseSign: baseSign, offset: portion)
    }

    // MARK: - D20 — Vimshamsha

    /// D20: 20 parts of 1°30' each
    /// Movable → Aries, Fixed → Sagittarius, Dual → Leo
    public static func getD20Sign(longitude: Double) -> Int {
        let sign = Int(longitude / 30)
        let degInSign = longitude.truncatingRemainder(dividingBy: 30)
        let portion = Int(degInSign / (30.0 / 20.0))  // 0-19
        let signType = sign % 3
        // Movable=Aries(0), Fixed=Sagittarius(8), Dual=Leo(4)
        let baseSigns = [0, 8, 4]
        let baseSign = baseSigns[signType]
        return signOffset(baseSign: baseSign, offset: portion)
    }

    // MARK: - D24 — Chaturvimshamsha (Siddhamsha)

    /// D24: 24 parts of 1°15' each
    /// Odd signs → start Leo (4)
    /// Even signs → start Cancer (3)
    public static func getD24Sign(longitude: Double) -> Int {
        let sign = Int(longitude / 30)
        let degInSign = longitude.truncatingRemainder(dividingBy: 30)
        let portion = Int(degInSign / (30.0 / 24.0))  // 0-23
        let isOddSign = sign % 2 == 0
        let baseSign = isOddSign ? 4 : 3  // Leo or Cancer
        return signOffset(baseSign: baseSign, offset: portion)
    }

    // MARK: - D27 — Bhamsha (Nakshatramsha)

    /// D27: 27 parts of 1°6'40" (= 30/27°) each
    /// Fire → Aries, Earth → Cancer, Air → Libra, Water → Capricorn
    public static func getD27Sign(longitude: Double) -> Int {
        let sign = Int(longitude / 30)
        let degInSign = longitude.truncatingRemainder(dividingBy: 30)
        let portion = Int(degInSign / (30.0 / 27.0))  // 0-26
        // Sign element mapping
        let signElement: [Int: Int] = [
            0: 0, 4: 0, 8: 0,   // Fire → Aries
            1: 3, 5: 3, 9: 3,   // Earth → Cancer
            2: 6, 6: 6, 10: 6,  // Air → Libra
            3: 9, 7: 9, 11: 9,  // Water → Capricorn
        ]
        let baseSign = signElement[sign] ?? 0
        return signOffset(baseSign: baseSign, offset: portion)
    }

    // MARK: - D30 — Trimshamsha

    /// D30: Unequal divisions (5 sub-divisions per sign)
    /// Odd signs: Mars 0-5°, Saturn 5-10°, Jupiter 10-18°, Mercury 18-25°, Venus 25-30°
    /// Even signs: Venus 0-5°, Mercury 5-12°, Jupiter 12-20°, Saturn 20-25°, Mars 25-30°
    public static func getD30Sign(longitude: Double) -> Int {
        let sign = Int(longitude / 30)
        let degInSign = longitude.truncatingRemainder(dividingBy: 30)
        let isOddSign = sign % 2 == 0  // Aries(0)=odd

        if isOddSign {
            // Odd signs: Mars 0-5, Saturn 5-10, Jupiter 10-18, Mercury 18-25, Venus 25-30
            if degInSign < 5  { return 0 }    // Aries (Mars)
            if degInSign < 10 { return 10 }   // Aquarius (Saturn)
            if degInSign < 18 { return 8 }     // Sagittarius (Jupiter)
            if degInSign < 25 { return 5 }    // Virgo (Mercury)
            return 6                          // Libra (Venus)
        } else {
            // Even signs: Venus 0-5, Mercury 5-12, Jupiter 12-20, Saturn 20-25, Mars 25-30
            if degInSign < 5  { return 1 }    // Taurus (Venus)
            if degInSign < 12 { return 2 }    // Gemini (Mercury)
            if degInSign < 20 { return 8 }    // Sagittarius (Jupiter)
            if degInSign < 25 { return 9 }    // Capricorn (Saturn)
            return 7                          // Scorpio (Mars)
        }
    }

    // MARK: - D40 — Khavedamsha

    /// D40: 40 parts of 0°45' each
    /// Movable → Aries, Fixed → Cancer, Dual → Libra
    public static func getD40Sign(longitude: Double) -> Int {
        let sign = Int(longitude / 30)
        let degInSign = longitude.truncatingRemainder(dividingBy: 30)
        let portion = Int(degInSign / (30.0 / 40.0))  // 0-39
        let signType = sign % 3
        // Movable=Aries(0), Fixed=Cancer(3), Dual=Libra(6)
        let baseSigns = [0, 3, 6]
        let baseSign = baseSigns[signType]
        return signOffset(baseSign: baseSign, offset: portion)
    }

    // MARK: - D45 — Akshavedamsha

    /// D45: 45 parts of 0°40' each
    /// Movable → Aries, Fixed → Leo, Dual → Sagittarius
    public static func getD45Sign(longitude: Double) -> Int {
        let sign = Int(longitude / 30)
        let degInSign = longitude.truncatingRemainder(dividingBy: 30)
        let portion = Int(degInSign / (30.0 / 45.0))  // 0-44
        let signType = sign % 3
        // Movable=Aries(0), Fixed=Leo(4), Dual=Sagittarius(8)
        let baseSigns = [0, 4, 8]
        let baseSign = baseSigns[signType]
        return signOffset(baseSign: baseSign, offset: portion)
    }

    // MARK: - D60 — Shashtiamsha

    /// D60: 60 parts of 0°30' each
    /// Odd signs → start Aries (0)
    /// Even signs → start Libra (6)
    public static func getD60Sign(longitude: Double) -> Int {
        let sign = Int(longitude / 30)
        let degInSign = longitude.truncatingRemainder(dividingBy: 30)
        let portion = Int(degInSign / 0.5)  // 0-59
        let isOddSign = sign % 2 == 0
        let baseSign = isOddSign ? 0 : 6
        return signOffset(baseSign: baseSign, offset: portion)
    }

    // MARK: - Batch Utility

    /// Calculate all varga signs for a given sidereal longitude
    public static func getAllVargaSigns(siderealLongitude: Double) -> [Varga: Int] {
        var result: [Varga: Int] = [:]
        for varga in Varga.allCases {
            result[varga] = getVargaSign(siderealLongitude: siderealLongitude, varga: varga)
        }
        return result
    }

    /// Get sign name from index
    public static func getSignName(fromIndex signIndex: Int) -> String {
        let names = [
            "Aries", "Taurus", "Gemini", "Cancer",
            "Leo", "Virgo", "Libra", "Scorpio",
            "Sagittarius", "Capricorn", "Aquarius", "Pisces"
        ]
        return names[mod(Double(signIndex), 12)]
    }
}
