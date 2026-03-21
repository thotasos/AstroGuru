import Foundation

// MARK: - CalculationEngine
/// Pure Swift calculation engine for Vedic astrology.
/// Replaces the JavaScriptCore bridge for reliability.
final class CalculationEngine: Sendable {
    private let swissEph: SwissEphemeris

    init() {
        self.swissEph = SwissEphemeris(isSidereal: true, ayanamsaValue: 0)
    }

    // MARK: - Chart Calculation

    func calculateChart(
        year: Int, month: Int, day: Int,
        hour: Int, minute: Int,
        lat: Double, lon: Double,
        tzOffset: Double, ayanamsaId: Int
    ) -> ChartData {
        // Calculate Julian Day
        let jd = swissEph.julianDay(year: year, month: month, day: day, hour: hour, minute: minute)

        // Calculate ayanamsa
        let ayanamsaValue = swissEph.lahiriAyanamsa(jd)

        // Calculate ascendant
        let ascendant = swissEph.ascendant(jd: jd, lat: lat, lon: lon)

        // Calculate MC
        let mc = swissEph.midheaven(jd: jd, lon: lon)

        // Calculate planet positions
        var planets: [PlanetPosition] = []

        // Sun
        let sunLon = planetTropical(.sun, jd: jd)
        let sunSidereal = swissEph.siderealLongitude(sunLon, jd: jd)
        planets.append(makePosition("Sun", siderealLon: sunSidereal, jd: jd))

        // Moon
        let moonLon = swissEph.moonPositionTropical(jd)
        let moonSidereal = swissEph.siderealLongitude(moonLon, jd: jd)
        planets.append(makePosition("Moon", siderealLon: moonSidereal, jd: jd))

        // Mars
        let marsLon = planetTropical(.mars, jd: jd)
        let marsSidereal = swissEph.siderealLongitude(marsLon, jd: jd)
        planets.append(makePosition("Mars", siderealLon: marsSidereal, jd: jd))

        // Mercury
        let mercuryLon = planetTropical(.mercury, jd: jd)
        let mercurySidereal = swissEph.siderealLongitude(mercuryLon, jd: jd)
        planets.append(makePosition("Mercury", siderealLon: mercurySidereal, jd: jd))

        // Jupiter
        let jupiterLon = planetTropical(.jupiter, jd: jd)
        let jupiterSidereal = swissEph.siderealLongitude(jupiterLon, jd: jd)
        planets.append(makePosition("Jupiter", siderealLon: jupiterSidereal, jd: jd))

        // Venus
        let venusLon = planetTropical(.venus, jd: jd)
        let venusSidereal = swissEph.siderealLongitude(venusLon, jd: jd)
        planets.append(makePosition("Venus", siderealLon: venusSidereal, jd: jd))

        // Saturn
        let saturnLon = planetTropical(.saturn, jd: jd)
        let saturnSidereal = swissEph.siderealLongitude(saturnLon, jd: jd)
        planets.append(makePosition("Saturn", siderealLon: saturnSidereal, jd: jd))

        // Rahu (True Node)
        let rahuLon = swissEph.rahuPosition(jd)
        planets.append(makePosition("Rahu", siderealLon: rahuLon, jd: jd))

        // Ketu
        let ketuLon = swissEph.ketuPosition(jd)
        planets.append(makePosition("Ketu", siderealLon: ketuLon, jd: jd))

        // Build houses
        let houses = buildHouses(ascendant: ascendant, jd: jd, lat: lat)

        return ChartData(
            ascendant: ascendant,
            planets: planets,
            houses: houses,
            julianDay: jd,
            ayanamsaValue: ayanamsaValue,
            ayanamsaType: ayanamsaId,
            mc: mc
        )
    }

    private func planetTropical(_ planet: SwissEphemeris.PlanetID, jd: Double) -> Double {
        return swissEph.planetPositionTropical(planet: planet, jd: jd)
    }

    private func makePosition(_ planet: String, siderealLon: Double, jd: Double) -> PlanetPosition {
        let sign = swissEph.signIndex(siderealLon)
        let degree = swissEph.degreeInSign(siderealLon)
        let (nakshatra, pada) = swissEph.nakshatra(longitude: siderealLon)
        let isRetrograde = isRetrograde(planet: planet, jd: jd)

        return PlanetPosition(
            planet: planet,
            sign: sign,
            degreeInSign: degree,
            longitude: siderealLon,
            nakshatra: nakshatra,
            pada: pada,
            isRetrograde: isRetrograde
        )
    }

    private func isRetrograde(planet: String, jd: Double) -> Bool {
        // Simplified retrograde detection
        // In a full implementation, this would compare current vs previous position
        return false
    }

    private func buildHouses(ascendant: Double, jd: Double, lat: Double) -> [House] {
        var houses: [House] = []
        for i in 1...12 {
            let cuspDegree = mod(ascendant + Double(i - 1) * 30.0, 360.0)
            let signIdx = swissEph.signIndex(cuspDegree)
            houses.append(House(
                number: i,
                sign: Sign(rawValue: signIdx) ?? .aries,
                degreeOnCusp: swissEph.degreeInSign(cuspDegree)
            ))
        }
        return houses
    }

    // MARK: - Vimshottari Dasha

    /// Calculate Vimshottari Mahadashas
    func calculateDashas(
        year: Int, month: Int, day: Int,
        hour: Int, minute: Int,
        lat: Double, lon: Double
    ) -> [DashaPeriod] {
        // Get Moon's nakshatra at birth for Dasha starting planet
        let jd = swissEph.julianDay(year: year, month: month, day: day, hour: hour, minute: minute)
        let moonLon = swissEph.moonPositionTropical(jd)
        let moonSidereal = swissEph.siderealLongitude(moonLon, jd: jd)
        let (nakIndex, _) = swissEph.nakshatra(longitude: moonSidereal)

        // Vimshottari Dasha sequence
        let dashaSequence = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury", "Ketu", "Venus", "Moon"]
        let dashaLengths = [7, 20, 6, 10, 7, 18, 16, 19, 17, 7, 20, 6]

        // Find starting nakshatra's dasha lord
        let nakLordIndex = nakIndex % 12
        let dashaLord = dashaSequence[nakLordIndex]
        let dashaStartYear = year - dashaLengths[nakLordIndex]

        // Build Mahadasha tree
        var dashas: [DashaPeriod] = []
        var currentYear = year

        for i in 0..<12 {
            let lordIndex = (nakLordIndex + i) % 12
            let lord = dashaSequence[lordIndex]
            let length = dashaLengths[lordIndex]
            let startYear = i == 0 ? year : currentYear
            let endYear = startYear + length

            // Calculate antardashas
            let antardashas = buildAntardashas(lord: lord, startYear: startYear, endYear: endYear, dashaSequence: dashaSequence, dashaLengths: dashaLengths)

            dashas.append(DashaPeriod(
                lord: lord,
                sign: 0,
                startYear: startYear,
                startMonth: 1,
                endYear: endYear,
                endMonth: 1,
                balance: 0,
                antardashas: antardashas
            ))

            currentYear = endYear
        }

        return dashas
    }

    private func buildAntardashas(lord: String, startYear: Int, endYear: Int, dashaSequence: [String], dashaLengths: [Int]) -> [DashaPeriod] {
        guard let lordIndex = dashaSequence.firstIndex(of: lord) else { return [] }

        let mahadashaLength = endYear - startYear
        var antardashas: [DashaPeriod] = []

        for i in 0..<12 {
            let antarlordIndex = (lordIndex + i) % 12
            let antarlord = dashaSequence[antarlordIndex]
            let antarlength = (dashaLengths[antarlordIndex] * mahadashaLength) / 120

            let antardashaStart = startYear + antardashas.reduce(0) { $0 + $1.endYear - $1.startYear }

            antardashas.append(DashaPeriod(
                lord: antarlord,
                sign: 0,
                startYear: antardashaStart,
                startMonth: 1,
                endYear: antardashaStart + antarlength,
                endMonth: 1,
                balance: 0,
                antardashas: []
            ))
        }

        return antardashas
    }

    // MARK: - Shadbala

    /// Calculate Shadbala (sixfold strength) for all planets
    func calculateShadbala(chartData: ChartData) -> [ShadbalaResult] {
        var results: [ShadbalaResult] = []

        for position in chartData.planets {
            let planet = position.planet
            let sign = position.sign
            let lon = position.longitude
            let house = houseOfPlanet(planet: planet, houses: chartData.houses)

            // Sthana Bala (positional strength)
            let sthAnaBala = calculateSthanaBala(sign: sign, planet: planet)

            // Dig Bala (directional strength)
            let digBala = calculateDigBala(planet: planet, house: house)

            // Kala Bala (temporal strength)
            let kalaBala = calculateKalaBala(planet: planet, jd: chartData.julianDay)

            // Cheshta Bala (aspect strength) - simplified
            let chestabala = 0.0

            // Naisargika Bala (natural strength)
            let naisargikaBala = calculateNaisargikaBala(planet: planet)

            // Drig Bala (aspectorial strength)
            let drigBala = calculateDrigBala(planet: planet, houses: chartData.houses)

            // Total
            let total = sthAnaBala + digBala + kalaBala + chestabala + naisargikaBala + drigBala

            // Strength in Virupas (normalized to 600 = strong)
            let strengthInVirupas = min(total * 10, 600)

            results.append(ShadbalaResult(
                planet: planet,
                sthAnaBala: sthAnaBala,
                digBala: digBala,
                kalaBala: kalaBala,
                chestabala: chestabala,
                naisargikaBala: naisargikaBala,
                drigBala: drigBala,
                total: total,
                strengthInVirupas: strengthInVirupas
            ))
        }

        return results
    }

    private func calculateSthanaBala(sign: Int, planet: String) -> Double {
        // Exaltation strengths
        let exaltations: [String: Int] = [
            "Sun": 10, "Moon": 10, "Mars": 28, "Mercury": 25,
            "Jupiter": 5, "Venus": 27, "Saturn": 20
        ]
        // Debilitation points (sign + 6)
        let debilitations: [String: Int] = [
            "Sun": 4, "Moon": 4, "Mars": 10, "Mercury": 10,
            "Jupiter": 7, "Venus": 8, "Saturn": 8
        ]
        // Mulatrikona
        let mulatrikonas: [String: Int] = [
            "Sun": 1, "Moon": 2, "Mars": 3, "Mercury": 6,
            "Jupiter": 3, "Venus": 1, "Saturn": 5
        ]

        if let ex = exaltations[planet], ex == sign { return 60.0 }
        if let db = debilitations[planet], db == sign { return 0.0 }
        if let mt = mulatrikonas[planet], mt == sign { return 45.0 }
        if let own = planetRuler(sign: sign), own == planet { return 30.0 }
        return 15.0
    }

    private func calculateDigBala(planet: String, house: Int) -> Double {
        // Dig Bala: planets in their own sign in houses 1,4,7,10 get maximum
        let digStrong: [Int] = [1, 4, 7, 10]
        return digStrong.contains(house) ? 60.0 : 30.0
    }

    private func calculateKalaBala(planet: String, jd: Double) -> Double {
        // Simplified Kala Bala based on day/night
        let hour = (jd.truncatingRemainder(dividingBy: 1.0)) * 24.0
        let isDay = hour >= 6 && hour < 18

        let dayPlanets = ["Sun", "Moon", "Jupiter"]
        let nightPlanets = ["Saturn", "Mars", "Venus"]

        if dayPlanets.contains(planet) && isDay { return 60.0 }
        if nightPlanets.contains(planet) && !isDay { return 60.0 }
        return 30.0
    }

    private func calculateNaisargikaBala(planet: String) -> Double {
        let strengths: [String: Double] = [
            "Jupiter": 60, "Venus": 55, "Mercury": 50,
            "Moon": 45, "Sun": 40, "Mars": 35, "Saturn": 30,
            "Rahu": 20, "Ketu": 20
        ]
        return strengths[planet] ?? 25.0
    }

    private func calculateDrigBala(planet: String, houses: [House]) -> Double {
        // Simplified Drig Bala
        return 15.0
    }

    private func planetRuler(sign: Int) -> String? {
        let rulers = ["Sun", "Moon", "Mars", "Rahu", "Mercury", "Jupiter", "Ketu", "Venus", "Saturn", nil, nil, nil]
        return sign < rulers.count ? rulers[sign] : nil
    }

    private func houseOfPlanet(planet: String, houses: [House]) -> Int {
        // Simplified - find which house contains this planet's sign
        // In a full implementation, we'd check planet positions
        return houses.first?.number ?? 1
    }

    // MARK: - Ashtakavarga

    /// Calculate Ashtakavarga Sarvastakaha
    func calculateAshtakavarga(chartData: ChartData) -> AshtakavargaResult {
        var bindus: [[Int]] = []

        for planet in chartData.planets {
            var planetBindus: [Int] = []
            let pLon = planet.longitude

            for sign in 0..<12 {
                var count = 0
                let signStart = Double(sign * 30)
                let signEnd = signStart + 30.0

                // Check reception from each planet
                for other in chartData.planets {
                    if other.planet == planet.planet { continue }
                    let oLon = other.longitude

                    // Simplified: planets in same sign or aspects
                    if Int(oLon / 30) == sign { count += 1 }
                    // Aspects (Mars aspects 4th/7th/8th, etc.)
                    if isAspect(signStart: signStart, signEnd: signEnd, planetLon: oLon, aspectPlanet: other.planet) {
                        count += 1
                    }
                }
                planetBindus.append(min(count, 4))
            }
            bindus.append(planetBindus)
        }

        // Build BAV as [String: [Int]] (planet -> [12 bindus])
        let ashtakavargaPlanets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu"]
        var bav: [String: [Int]] = [:]
        for planet in ashtakavargaPlanets {
            bav[planet] = Array(repeating: 0, count: 12)
        }
        for planet in chartData.planets {
            guard ashtakavargaPlanets.contains(planet.planet) else { continue }
            let sign = planet.sign
            bav[planet.planet]?[sign] += 1
        }

        // Calculate SAV
        var sav = Array(repeating: 0, count: 12)
        for planet in ashtakavargaPlanets {
            if let bindus = bav[planet] {
                for i in 0..<12 { sav[i] += bindus[i] }
            }
        }

        // Apply simplified shodhana
        var planetBav = bav
        for (planet, bindus) in bav {
            var shodhana = bindus
            if let idx = ashtakavargaPlanets.firstIndex(of: planet) {
                let ownSign = idx % 12
                if shodhana[ownSign] > 0 { shodhana[ownSign] -= 1 }
            }
            planetBav[planet] = shodhana
        }

        return AshtakavargaResult(bav: bav, sav: sav, planetBav: planetBav)
    }

    private func isAspect(signStart: Double, signEnd: Double, planetLon: Double, aspectPlanet: String) -> Bool {
        let aspects: [String: [Double]] = [
            "Sun": [0, 7], "Mars": [4, 7, 8], "Jupiter": [5, 7, 9],
            "Saturn": [3, 7, 10], "Rahu": [3, 6, 9]
        ]
        guard let aspectAngles = aspects[aspectPlanet] else { return false }
        let planetSign = Int(planetLon / 30) * 30

        for angle in aspectAngles {
            let aspectCenter = mod(planetLon + angle, 360)
            if aspectCenter >= signStart && aspectCenter < signEnd { return true }
        }
        return false
    }

    // MARK: - Yogas

    /// Detect planetary yogas
    func detectYogas(chartData: ChartData, shadbala: [ShadbalaResult]) -> [YogaResult] {
        var yogas: [YogaResult] = []
        let kendraSigns = [0, 3, 6, 9]

        // Raj Yoga: Jupiter and Venus in kendras (1,4,7,10)
        let jupVenusSigns = chartData.planets.filter { $0.planet == "Jupiter" || $0.planet == "Venus" }.map { $0.sign }
        if jupVenusSigns.count >= 2 {
            let conjunction = abs(jupVenusSigns[0] - jupVenusSigns[1]) == 0
            let kendra = jupVenusSigns.contains { kendraSigns.contains($0) }
            if conjunction || kendra {
                yogas.append(YogaResult(
                    name: "Raj Yoga",
                    description: "Wealth and kingdom yoga formed by Jupiter-Venus conjunction or kendra placement.",
                    planets: ["Jupiter", "Venus"],
                    strength: 0.75,
                    category: "RajYoga"
                ))
            }
        }

        // Gajakesari Yoga: Moon and Jupiter in kendra
        let moonSign = chartData.planets.first { $0.planet == "Moon" }?.sign ?? -1
        let jupSign = chartData.planets.first { $0.planet == "Jupiter" }?.sign ?? -1
        if moonSign != -1 && jupSign != -1 && kendraSigns.contains(moonSign) && kendraSigns.contains(jupSign) {
            yogas.append(YogaResult(
                name: "Gajakesari Yoga",
                description: "Moon and Jupiter in kendra positions - wealth, wisdom, and spiritual growth.",
                planets: ["Moon", "Jupiter"],
                strength: 0.80,
                category: "DharmaKarma"
            ))
        }

        // Sun in own sign or exaltation
        if let sun = chartData.planets.first(where: { $0.planet == "Sun" }) {
            if sun.sign == 4 { // Leo
                yogas.append(YogaResult(
                    name: "Uttama Surya",
                    description: "Sun in its own sign Leo - strong leadership and vitality.",
                    planets: ["Sun"],
                    strength: 0.70,
                    category: "Strength"
                ))
            }
        }

        // Multiple planets in 7th house (Sanyasa Yoga)
        let in7th = chartData.planets.filter { pos in
            chartData.houses.first { $0.number == 7 }?.sign.rawValue == pos.sign
        }
        if in7th.count >= 3 {
            yogas.append(YogaResult(
                name: "Sanyasa Yoga",
                description: "Multiple planets in the 7th house - tendency towards renunciation.",
                planets: in7th.map { $0.planet },
                strength: 0.60,
                category: "Spiritual"
            ))
        }

        return yogas
    }

    // MARK: - Helpers

    private func mod(_ value: Double, _ divisor: Double) -> Double {
        var result = value.truncatingRemainder(dividingBy: divisor)
        if result < 0 { result += divisor }
        return result
    }
}
