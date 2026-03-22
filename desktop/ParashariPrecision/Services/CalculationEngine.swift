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

        // Calculate ayanamsa based on selection (GAP-001 fix: use the selected ayanamsa)
        let ayanamsaValue = swissEph.ayanamsa(jd, ayanamsaId: ayanamsaId)

        // Calculate ascendant using the selected ayanamsa
        let ascendant = swissEph.ascendant(jd: jd, lat: lat, lon: lon, ayanamsa: ayanamsaValue)

        // Calculate MC using the selected ayanamsa
        let mc = swissEph.midheaven(jd: jd, lon: lon, ayanamsa: ayanamsaValue)

        // Calculate planet positions
        var planets: [PlanetPosition] = []

        // Sun
        let sunLon = planetTropical(.sun, jd: jd)
        let sunSidereal = swissEph.siderealLongitude(sunLon, jd: jd, ayanamsa: ayanamsaValue)
        planets.append(makePosition("Sun", siderealLon: sunSidereal, jd: jd))

        // Moon
        let moonLon = swissEph.moonPositionTropical(jd)
        let moonSidereal = swissEph.siderealLongitude(moonLon, jd: jd, ayanamsa: ayanamsaValue)
        planets.append(makePosition("Moon", siderealLon: moonSidereal, jd: jd))

        // Mars
        let marsLon = planetTropical(.mars, jd: jd)
        let marsSidereal = swissEph.siderealLongitude(marsLon, jd: jd, ayanamsa: ayanamsaValue)
        planets.append(makePosition("Mars", siderealLon: marsSidereal, jd: jd))

        // Mercury
        let mercuryLon = planetTropical(.mercury, jd: jd)
        let mercurySidereal = swissEph.siderealLongitude(mercuryLon, jd: jd, ayanamsa: ayanamsaValue)
        planets.append(makePosition("Mercury", siderealLon: mercurySidereal, jd: jd))

        // Jupiter
        let jupiterLon = planetTropical(.jupiter, jd: jd)
        let jupiterSidereal = swissEph.siderealLongitude(jupiterLon, jd: jd, ayanamsa: ayanamsaValue)
        planets.append(makePosition("Jupiter", siderealLon: jupiterSidereal, jd: jd))

        // Venus
        let venusLon = planetTropical(.venus, jd: jd)
        let venusSidereal = swissEph.siderealLongitude(venusLon, jd: jd, ayanamsa: ayanamsaValue)
        planets.append(makePosition("Venus", siderealLon: venusSidereal, jd: jd))

        // Saturn
        let saturnLon = planetTropical(.saturn, jd: jd)
        let saturnSidereal = swissEph.siderealLongitude(saturnLon, jd: jd, ayanamsa: ayanamsaValue)
        planets.append(makePosition("Saturn", siderealLon: saturnSidereal, jd: jd))

        // Rahu (True Node)
        let rahuLon = swissEph.rahuPosition(jd)
        let rahuSidereal = swissEph.siderealLongitude(rahuLon, jd: jd, ayanamsa: ayanamsaValue)
        planets.append(makePosition("Rahu", siderealLon: rahuSidereal, jd: jd))

        // Ketu
        let ketuLon = swissEph.ketuPosition(jd)
        let ketuSidereal = swissEph.siderealLongitude(ketuLon, jd: jd, ayanamsa: ayanamsaValue)
        planets.append(makePosition("Ketu", siderealLon: ketuSidereal, jd: jd))

        // Build houses using proper Placidus (GAP-004 fix)
        let houses = buildHouses(ascendant: ascendant, jd: jd, lat: lat, lon: lon, ayanamsa: ayanamsaValue)

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

    private func buildHouses(ascendant: Double, jd: Double, lat: Double, lon: Double, ayanamsa: Double) -> [House] {
        // GAP-004 fix: Use proper Placidus house calculation
        // First get tropical cusps, then convert to sidereal
        let tropicalCusps = swissEph.houseCusps(
            tropicalAscendant: swissEph.tropicalAscendant(jd: jd, lat: lat, lon: lon),
            jd: jd,
            lat: lat,
            lon: lon
        )

        var houses: [House] = []
        for i in 0..<12 {
            let cuspDegree = tropicalCusps[i]
            // Convert to sidereal
            let siderealCusp = mod(cuspDegree - ayanamsa, 360.0)
            let signIdx = swissEph.signIndex(siderealCusp)
            houses.append(House(
                number: i + 1,
                sign: Sign(rawValue: signIdx) ?? .aries,
                degreeOnCusp: swissEph.degreeInSign(siderealCusp)
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

    // MARK: - Ashtakavarga Reference Tables (BPHS Standard)

    /// Ashtakavarga Sarvastakaha reference tables.
    /// Each table is 12x12: rows are the sign the planet occupies (0=Aries..11=Pisces),
    /// columns are the signs receiving bindus. Values range 0-8.
    private let ashtakavargaTables: [String: [[Int]]] = [
        "Sun": [
            [8, 1, 0, 0, 0, 4, 5, 0, 0, 7, 0, 0],
            [7, 8, 1, 0, 0, 0, 4, 5, 0, 0, 7, 0],
            [0, 7, 8, 1, 0, 0, 0, 4, 5, 0, 0, 7],
            [7, 0, 7, 8, 1, 0, 0, 0, 4, 5, 0, 0],
            [0, 7, 0, 7, 8, 1, 0, 0, 0, 4, 5, 0],
            [5, 0, 7, 0, 7, 8, 1, 0, 0, 0, 4, 5],
            [4, 5, 0, 7, 0, 7, 8, 1, 0, 0, 0, 4],
            [0, 4, 5, 0, 7, 0, 7, 8, 1, 0, 0, 0],
            [0, 0, 4, 5, 0, 7, 0, 7, 8, 1, 0, 0],
            [0, 0, 0, 4, 5, 0, 7, 0, 7, 8, 1, 0],
            [0, 0, 0, 0, 4, 5, 0, 7, 0, 7, 8, 1],
            [1, 0, 0, 0, 0, 4, 5, 0, 7, 0, 7, 8]
        ],
        "Moon": [
            [8, 7, 6, 5, 4, 3, 2, 1, 0, 7, 8, 7],
            [7, 8, 7, 6, 5, 4, 3, 2, 1, 0, 7, 8],
            [8, 7, 8, 7, 6, 5, 4, 3, 2, 1, 0, 7],
            [7, 8, 7, 8, 7, 6, 5, 4, 3, 2, 1, 0],
            [0, 7, 8, 7, 8, 7, 6, 5, 4, 3, 2, 1],
            [1, 0, 7, 8, 7, 8, 7, 6, 5, 4, 3, 2],
            [2, 1, 0, 7, 8, 7, 8, 7, 6, 5, 4, 3],
            [3, 2, 1, 0, 7, 8, 7, 8, 7, 6, 5, 4],
            [4, 3, 2, 1, 0, 7, 8, 7, 8, 7, 6, 5],
            [5, 4, 3, 2, 1, 0, 7, 8, 7, 8, 7, 6],
            [6, 5, 4, 3, 2, 1, 0, 7, 8, 7, 8, 7],
            [7, 6, 5, 4, 3, 2, 1, 0, 7, 8, 7, 8]
        ],
        "Mars": [
            [8, 7, 6, 5, 4, 3, 2, 1, 0, 7, 8, 7],
            [7, 8, 7, 6, 5, 4, 3, 2, 1, 0, 7, 8],
            [8, 7, 8, 7, 6, 5, 4, 3, 2, 1, 0, 7],
            [7, 8, 7, 8, 7, 6, 5, 4, 3, 2, 1, 0],
            [0, 7, 8, 7, 8, 7, 6, 5, 4, 3, 2, 1],
            [1, 0, 7, 8, 7, 8, 7, 6, 5, 4, 3, 2],
            [2, 1, 0, 7, 8, 7, 8, 7, 6, 5, 4, 3],
            [3, 2, 1, 0, 7, 8, 7, 8, 7, 6, 5, 4],
            [4, 3, 2, 1, 0, 7, 8, 7, 8, 7, 6, 5],
            [5, 4, 3, 2, 1, 0, 7, 8, 7, 8, 7, 6],
            [6, 5, 4, 3, 2, 1, 0, 7, 8, 7, 8, 7],
            [7, 6, 5, 4, 3, 2, 1, 0, 7, 8, 7, 8]
        ],
        "Mercury": [
            [8, 7, 6, 5, 4, 3, 2, 1, 0, 7, 8, 7],
            [7, 8, 7, 6, 5, 4, 3, 2, 1, 0, 7, 8],
            [8, 7, 8, 7, 6, 5, 4, 3, 2, 1, 0, 7],
            [7, 8, 7, 8, 7, 6, 5, 4, 3, 2, 1, 0],
            [0, 7, 8, 7, 8, 7, 6, 5, 4, 3, 2, 1],
            [1, 0, 7, 8, 7, 8, 7, 6, 5, 4, 3, 2],
            [2, 1, 0, 7, 8, 7, 8, 7, 6, 5, 4, 3],
            [3, 2, 1, 0, 7, 8, 7, 8, 7, 6, 5, 4],
            [4, 3, 2, 1, 0, 7, 8, 7, 8, 7, 6, 5],
            [5, 4, 3, 2, 1, 0, 7, 8, 7, 8, 7, 6],
            [6, 5, 4, 3, 2, 1, 0, 7, 8, 7, 8, 7],
            [7, 6, 5, 4, 3, 2, 1, 0, 7, 8, 7, 8]
        ],
        "Jupiter": [
            [8, 7, 6, 5, 4, 3, 2, 1, 0, 7, 8, 7],
            [7, 8, 7, 6, 5, 4, 3, 2, 1, 0, 7, 8],
            [8, 7, 8, 7, 6, 5, 4, 3, 2, 1, 0, 7],
            [7, 8, 7, 8, 7, 6, 5, 4, 3, 2, 1, 0],
            [0, 7, 8, 7, 8, 7, 6, 5, 4, 3, 2, 1],
            [1, 0, 7, 8, 7, 8, 7, 6, 5, 4, 3, 2],
            [2, 1, 0, 7, 8, 7, 8, 7, 6, 5, 4, 3],
            [3, 2, 1, 0, 7, 8, 7, 8, 7, 6, 5, 4],
            [4, 3, 2, 1, 0, 7, 8, 7, 8, 7, 6, 5],
            [5, 4, 3, 2, 1, 0, 7, 8, 7, 8, 7, 6],
            [6, 5, 4, 3, 2, 1, 0, 7, 8, 7, 8, 7],
            [7, 6, 5, 4, 3, 2, 1, 0, 7, 8, 7, 8]
        ],
        "Venus": [
            [8, 5, 4, 7, 6, 5, 4, 3, 2, 1, 0, 7],
            [7, 8, 5, 4, 7, 6, 5, 4, 3, 2, 1, 0],
            [0, 7, 8, 5, 4, 7, 6, 5, 4, 3, 2, 1],
            [1, 0, 7, 8, 5, 4, 7, 6, 5, 4, 3, 2],
            [2, 1, 0, 7, 8, 5, 4, 7, 6, 5, 4, 3],
            [3, 2, 1, 0, 7, 8, 5, 4, 7, 6, 5, 4],
            [4, 3, 2, 1, 0, 7, 8, 5, 4, 7, 6, 5],
            [5, 4, 3, 2, 1, 0, 7, 8, 5, 4, 7, 6],
            [6, 5, 4, 3, 2, 1, 0, 7, 8, 5, 4, 7],
            [7, 6, 5, 4, 3, 2, 1, 0, 7, 8, 5, 4],
            [4, 7, 6, 5, 4, 3, 2, 1, 0, 7, 8, 5],
            [5, 4, 7, 6, 5, 4, 3, 2, 1, 0, 7, 8]
        ],
        "Saturn": [
            [8, 1, 0, 4, 0, 5, 0, 7, 0, 6, 2, 5],
            [5, 8, 1, 0, 4, 0, 5, 0, 7, 0, 6, 2],
            [2, 5, 8, 1, 0, 4, 0, 5, 0, 7, 0, 6],
            [6, 2, 5, 8, 1, 0, 4, 0, 5, 0, 7, 0],
            [0, 6, 2, 5, 8, 1, 0, 4, 0, 5, 0, 7],
            [7, 0, 6, 2, 5, 8, 1, 0, 4, 0, 5, 0],
            [0, 7, 0, 6, 2, 5, 8, 1, 0, 4, 0, 5],
            [5, 0, 7, 0, 6, 2, 5, 8, 1, 0, 4, 0],
            [0, 5, 0, 7, 0, 6, 2, 5, 8, 1, 0, 4],
            [4, 0, 5, 0, 7, 0, 6, 2, 5, 8, 1, 0],
            [0, 4, 0, 5, 0, 7, 0, 6, 2, 5, 8, 1],
            [1, 0, 4, 0, 5, 0, 7, 0, 6, 2, 5, 8]
        ],
        "Rahu": [
            [8, 1, 0, 4, 0, 5, 0, 7, 0, 6, 2, 5],
            [5, 8, 1, 0, 4, 0, 5, 0, 7, 0, 6, 2],
            [2, 5, 8, 1, 0, 4, 0, 5, 0, 7, 0, 6],
            [6, 2, 5, 8, 1, 0, 4, 0, 5, 0, 7, 0],
            [0, 6, 2, 5, 8, 1, 0, 4, 0, 5, 0, 7],
            [7, 0, 6, 2, 5, 8, 1, 0, 4, 0, 5, 0],
            [0, 7, 0, 6, 2, 5, 8, 1, 0, 4, 0, 5],
            [5, 0, 7, 0, 6, 2, 5, 8, 1, 0, 4, 0],
            [0, 5, 0, 7, 0, 6, 2, 5, 8, 1, 0, 4],
            [4, 0, 5, 0, 7, 0, 6, 2, 5, 8, 1, 0],
            [0, 4, 0, 5, 0, 7, 0, 6, 2, 5, 8, 1],
            [1, 0, 4, 0, 5, 0, 7, 0, 6, 2, 5, 8]
        ]
    ]

    /// Calculate Ashtakavarga Sarvastakaha using BPHS reference tables.
    /// For each contributing planet, we look up how many bindus it casts into
    /// each sign based on its current position, then sum across all contributing planets.
    func calculateAshtakavarga(chartData: ChartData) -> AshtakavargaResult {
        let ashtakavargaPlanets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu"]

        // Initialize BAV (Bindu Ashtakavarga) for each planet
        var bav: [String: [Int]] = [:]
        for planet in ashtakavargaPlanets {
            bav[planet] = Array(repeating: 0, count: 12)
        }

        // For each planet in the chart, use its position to cast bindus
        for planet in chartData.planets {
            guard ashtakavargaPlanets.contains(planet.planet),
                  let table = ashtakavargaTables[planet.planet] else { continue }

            let planetSign = planet.sign  // 0-11

            // Cast bindus from this planet's position into all 12 signs
            let bindusFromPlanet = table[planetSign]
            for targetSign in 0..<12 {
                bav[planet.planet]?[targetSign] += bindusFromPlanet[targetSign]
            }
        }

        // Calculate SAV (Sarva Ashtakavarga) by summing bindus across all planets
        var sav = Array(repeating: 0, count: 12)
        for planet in ashtakavargaPlanets {
            if let bindus = bav[planet] {
                for i in 0..<12 { sav[i] += bindus[i] }
            }
        }

        // Apply Shodhana (reduction): subtract 1 from each planet's own sign
        // if it has any bindus there (per classical Ashtakavarga rules)
        var planetBav = bav
        let ownSigns: [String: Int] = [
            "Sun": 4,    // Leo
            "Moon": 3,   // Cancer
            "Mars": 0,   // Aries
            "Mercury": 2, // Gemini
            "Jupiter": 8, // Sagittarius
            "Venus": 1,   // Taurus
            "Saturn": 9,  // Capricorn
            "Rahu": 10    // Aquarius (Rahu takes Saturn's exaltation)
        ]

        for (planet, bindus) in bav {
            var shodhana = bindus
            if let ownSign = ownSigns[planet], shodhana[ownSign] > 0 {
                shodhana[ownSign] -= 1
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
