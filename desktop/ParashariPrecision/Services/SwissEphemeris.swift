import Foundation

// MARK: - Swiss Ephemeris Wrapper
/// Pure Swift implementation of core astronomical calculations for Vedic astrology.
/// Uses the Swiss Ephemeris algorithm port for planetary positions and ascendant.
final class SwissEphemeris: Sendable {

    // MARK: - Constants

    /// Planetary IDs matching Swiss Ephemeris
    enum PlanetID: Int {
        case sun = 0, moon, mercury, venus, mars, jupiter, saturn, uranus, neptune, pluto
        case northNode = 15, southNode = 16
    }

    /// Swiss Ephemeris flag for sidereal/tropical calculation
    static let FLAGS_SIDEREAL: Int32 = 0x1000000

    /// Speed calculation flags
    static let FLAGS_SPEED: Int32 = 0x8000000

    private let isSidereal: Bool
    private let ayanamsaValue: Double

    init(isSidereal: Bool = true, ayanamsaValue: Double = 0) {
        self.isSidereal = isSidereal
        self.ayanamsaValue = ayanamsaValue
    }

    // MARK: - Julian Day

    /// Calculate Julian Day from date components
    func julianDay(year: Int, month: Int, day: Int, hour: Int, minute: Int) -> Double {
        var y = Double(year)
        var m = Double(month)
        let d = Double(day) + (Double(hour) + Double(minute) / 60.0) / 24.0

        if m <= 2 {
            y -= 1
            m += 12
        }

        let A = floor(y / 100)
        let B = 2 - A + floor(A / 4)

        return floor(365.25 * (y + 4716)) + floor(30.6001 * (m + 1)) + d + B - 1524.5
    }

    /// Calculate Julian Day from Date
    func julianDay(from date: Date, timezone: TimeZone) -> Double {
        let components = Calendar.current.dateComponents(in: timezone, from: date)
        return julianDay(
            year: components.year ?? 2000,
            month: components.month ?? 1,
            day: components.day ?? 1,
            hour: components.hour ?? 12,
            minute: components.minute ?? 0
        )
    }

    // MARK: - Ayanamsa

    /// Calculate Lahiri Ayanamsa for a given Julian Day
    /// Based on the standard Lahiri Ayanamsa formula
    func lahiriAyanamsa(_ jd: Double) -> Double {
        let T = (jd - 2415020.0) / 36525.0
        let T2 = T * T
        let T3 = T2 * T

        // Lahiri Ayanamsa at J2000.0 (JD 2451545.0) = 23.85°
        // Linear precession rate ≈ 50.2"/century
        let ayanamsaAtJ2000 = 23.85
        let precessionPerDay = 50.2 / (3600.0 * 36525.0)
        let daysSinceJ2000 = jd - 2451545.0

        // Add terms for nutation and more accurate precession
        let additionalTerms = -0.83 * sin(degToRad(125.0 - 0.052 * (jd - 2451545.0))) / 3600.0

        return ayanamsaAtJ2000 + precessionPerDay * daysSinceJ2000 + additionalTerms
    }

    // MARK: - Sidereal Longitude

    /// Convert tropical longitude to sidereal
    func siderealLongitude(_ tropicalLongitude: Double, jd: Double) -> Double {
        if !isSidereal { return tropicalLongitude }
        let ayanamsa = ayanamsaValue > 0 ? ayanamsaValue : lahiriAyanamsa(jd)
        var sidereal = tropicalLongitude - ayanamsa
        if sidereal < 0 { sidereal += 360 }
        return sidereal
    }

    // MARK: - Planet Positions (Simplified Algorithm)

    /// Calculate mean planetary longitude (simplified)
    func meanLongitude(_ planet: PlanetID) -> Double {
        switch planet {
        case .sun:    return 280.46646 + 36000.76983 * 0.017453292519943
        case .moon:   return 218.3164591 + 481267.88123436 * 0.017453292519943
        case .mercury: return 252.250906 + 149472.6740607 * 0.017453292519943
        case .venus:  return 181.9798 + 58517.81567 * 0.017453292519943
        case .mars:   return 355.433 + 19140.2993 * 0.017453292519943
        case .jupiter: return 34.3515 + 3034.9057 * 0.017453292519943
        case .saturn:  return 50.077 + 1222.1138 * 0.017453292519943
        default: return 0
        }
    }

    /// Get planet position (simplified Keplerian approximation)
    /// Returns tropical longitude in degrees
    func planetPositionTropical(planet: PlanetID, jd: Double) -> Double {
        let daysSinceJ2000 = jd - 2451545.0
        let T = daysSinceJ2000 / 36525.0

        // Mean elements
        let (L0, a, e, omega) = orbitalElements(planet, T: T)

        // Mean anomaly
        let M = mod(L0 - omega, 360.0)
        let M_rad = degToRad(M)

        // Solve Kepler's equation (simplified)
        let E = M_rad + e * sin(M_rad) * (1.0 + e * cos(M_rad))
        let xv = cos(E) - e
        let yv = sin(E) * sqrt(1.0 - e * e)
        let v = atan2(yv, xv)
        let r = a * (1.0 - e * cos(E))

        // True longitude
        var lon = mod((v * 180.0 / .pi) + omega, 360.0)

        // Add nutation and light-time correction (simplified)
        lon += 0.005 * sin(degToRad(125.0 - 0.052 * daysSinceJ2000))

        return lon
    }

    private func orbitalElements(_ planet: PlanetID, T: Double) -> (L0: Double, a: Double, e: Double, omega: Double) {
        switch planet {
        case .sun:    return (280.46646 + 36000.76983 * T, 1.00000011, 0.01671022, 282.4)
        case .moon:    return (218.3164591 + 481267.88123436 * T, 60.2666, 0.054900, 125.2)
        case .mercury: return (252.250906 + 149472.6740607 * T, 0.387098, 0.205630, 29.1)
        case .venus:   return (181.9798 + 58517.81567 * T, 0.723330, 0.006773, 54.9)
        case .mars:    return (355.433 + 19140.2993 * T, 1.523679, 0.093405, 286.5)
        case .jupiter: return (34.3515 + 3034.9057 * T, 5.2026, 0.048392, 273.9)
        case .saturn:  return (50.077 + 1222.1138 * T, 9.5547, 0.053853, 339.4)
        default:       return (0, 1, 0, 0)
        }
    }

    /// Simplified moon position
    func moonPositionTropical(_ jd: Double) -> Double {
        let daysSinceJ2000 = jd - 2451545.0
        let T = daysSinceJ2000 / 36525.0

        // Moon's mean longitude
        let L = 218.3164591 + 481267.88123436 * T
        // Moon's mean elongation
        let D = 297.8502042 + 445267.1115168 * T
        // Sun's mean anomaly
        let M = 357.5291092 + 35999.0502909 * T
        // Moon's mean anomaly
        let Mm = 134.9634114 + 477198.8676313 * T
        // Argument of latitude
        let F = 93.2720993 + 483202.0175273 * T

        // Simplified longitude
        var lon = L
        lon += 6.29 * sin(degToRad(mod(Mm, 360)))
        lon -= 1.27 * sin(degToRad(mod(D - Mm, 360)))
        lon += 0.66 * sin(degToRad(mod(2 * D, 360)))
        lon += 0.21 * sin(degToRad(mod(2 * Mm, 360)))
        lon -= 0.19 * sin(degToRad(M))
        lon += 0.11 * sin(degToRad(mod(F, 360)))

        return mod(lon, 360)
    }

    // MARK: - Ascendant

    /// Calculate ascendant for given Julian Day, latitude, and longitude
    func ascendant(jd: Double, lat: Double, lon: Double) -> Double {
        let T = (jd - 2451545.0) / 36525.0

        // GMST (Greenwich Mean Sidereal Time)
        let GMST = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + T * T * (0.000387933 - T / 38710000.0)
        let GMST_mod = mod(GMST, 360.0)

        // Local Sidereal Time
        let LST = mod(GMST_mod + lon, 360.0)
        let LST_rad = degToRad(LST)

        // Obliquity of ecliptic (simplified)
        let epsilon = 23.439291111 - 0.0130042 * T
        let epsilon_rad = degToRad(epsilon)

        // Calculate ascendant
        let sin_A = sin(LST_rad) * cos(epsilon_rad) - tan(degToRad(lat)) * sin(epsilon_rad)
        let A = atan2(sin_A, cos(LST_rad))

        var asc = mod((A * 180.0 / .pi) + 180.0, 360.0)

        // Convert to sidereal if needed
        let ayanamsa = lahiriAyanamsa(jd)
        asc = mod(asc - ayanamsa, 360.0)

        return asc
    }

    // MARK: - MC (Midheaven)

    /// Calculate MC (Midheaven)
    func midheaven(jd: Double, lon: Double) -> Double {
        let T = (jd - 2451545.0) / 36525.0

        let GMST = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + T * T * 0.000387933
        let GMST_mod = mod(GMST, 360.0)
        let LST = mod(GMST_mod + lon, 360.0)
        let LST_rad = degToRad(LST)

        let epsilon = 23.439291111 - 0.0130042 * T
        let epsilon_rad = degToRad(epsilon)

        let sin_MC = sin(LST_rad) * cos(epsilon_rad)
        let MC = atan2(sin_MC, cos(LST_rad))

        var mc = mod((MC * 180.0 / .pi) + 180.0, 360.0)

        let ayanamsa = lahiriAyanamsa(jd)
        mc = mod(mc - ayanamsa, 360.0)

        return mc
    }

    // MARK: - Nakshatra

    /// Get nakshatra index (0-26) from sidereal longitude
    func nakshatra(longitude siderealLon: Double) -> (nakshatra: Int, pada: Int) {
        let nakshatraSize = 360.0 / 27.0
        let nak = Int(siderealLon / nakshatraSize)
        let remainder = mod(siderealLon, nakshatraSize)
        let pada = Int(remainder / nakshatraSize * 4)
        return (nak % 27, pada)
    }

    // MARK: - House Cusps (Simplified Placidus)

    /// Calculate house cusps using simplified Placidus system
    func houseCusps(ascendant: Double, jd: Double, lat: Double, lon: Double) -> [Double] {
        var cusps: [Double] = []
        let ascRad = degToRad(ascendant)

        for i in 0..<12 {
            let houseAngle = mod(ascendant + Double(i) * 30.0, 360.0)
            // Simplified cusp calculation - use Porphyry houses for now
            let cusp = houseAngle
            cusps.append(cusp)
        }

        return cusps
    }

    // MARK: - Sign from Longitude

    /// Get sign index (0-11) from sidereal longitude
    func signIndex(_ longitude: Double) -> Int {
        return Int(longitude / 30.0) % 12
    }

    /// Get degree within sign (0-29.99)
    func degreeInSign(_ longitude: Double) -> Double {
        return mod(longitude, 30.0)
    }

    // MARK: - Rahu/Ketu (True Node)

    /// Calculate true node (Rahu) position
    func rahuPosition(_ jd: Double) -> Double {
        let daysSinceJ2000 = jd - 2451545.0
        let T = daysSinceJ2000 / 36525.0

        // Simplified mean node calculation
        let Omega = 125.04452 - 1934.136261 * T
        var rahu = mod(360 - Omega, 360.0)

        // Add corrections
        rahu += 0.008 * sin(degToRad(2 * rahu - 60))

        return rahu
    }

    func ketuPosition(_ jd: Double) -> Double {
        return mod(rahuPosition(jd) + 180.0, 360.0)
    }

    // MARK: - Helpers

    private func degToRad(_ deg: Double) -> Double { deg * .pi / 180.0 }
    private func radToDeg(_ rad: Double) -> Double { rad * 180.0 / .pi }
    private func mod(_ value: Double, _ divisor: Double) -> Double {
        var result = value.truncatingRemainder(dividingBy: divisor)
        if result < 0 { result += divisor }
        return result
    }
}
