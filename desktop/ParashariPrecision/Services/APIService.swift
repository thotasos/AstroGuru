import Foundation

// MARK: - API Errors

enum APIError: LocalizedError {
    case notReachable
    case httpError(statusCode: Int, body: String)
    case decodingError(Error)
    case encodingError(Error)
    case invalidURL
    case unknown(Error)

    var errorDescription: String? {
        switch self {
        case .notReachable:
            return "Server not reachable. Check that the local server is running on port 5199."
        case .httpError(let code, let body):
            return "HTTP \(code): \(body)"
        case .decodingError(let err):
            return "Failed to decode response: \(err.localizedDescription)"
        case .encodingError(let err):
            return "Failed to encode request: \(err.localizedDescription)"
        case .invalidURL:
            return "Invalid URL"
        case .unknown(let err):
            return err.localizedDescription
        }
    }
}

// MARK: - API Response Wrappers

struct SingleItemResponse<T: Codable>: Codable {
    let data: T
}

struct HourlyPredictionsResponse: Codable {
    let data: [HourlyPrediction]
}

struct MonthlyPredictionResponse: Codable {
    let data: MonthlyPrediction
}

// MARK: - Calculation Request Body

struct ProfileIdBody: Codable {
    let profileId: String

    enum CodingKeys: String, CodingKey {
        case profileId = "profile_id"
    }
}

// MARK: - API Service

actor APIService {
    static let shared = APIService()

    let baseURL = "http://127.0.0.1:5199"

    private let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 10
        config.timeoutIntervalForResource = 30
        return URLSession(configuration: config)
    }()

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        d.dateDecodingStrategy = .iso8601
        return d
    }()

    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.keyEncodingStrategy = .convertToSnakeCase
        e.dateEncodingStrategy = .iso8601
        return e
    }()

    // MARK: - Health Check

    func isServerAvailable() async -> Bool {
        guard let url = URL(string: "\(baseURL)/health") else { return false }
        do {
            let (_, response) = try await session.data(from: url)
            if let http = response as? HTTPURLResponse {
                return http.statusCode == 200
            }
            return false
        } catch {
            return false
        }
    }

    // MARK: - Profiles

    func fetchProfiles() async throws -> [BirthProfile] {
        let response: SingleItemResponse<[BirthProfile]> = try await get("/api/profiles")
        return response.data
    }

    func createProfile(_ data: CreateProfileRequest) async throws -> BirthProfile {
        return try await post("/api/profiles", body: data)
    }

    func updateProfile(id: String, data: CreateProfileRequest) async throws -> BirthProfile {
        return try await put("/api/profiles/\(id)", body: data)
    }

    func deleteProfile(id: String) async throws {
        try await delete("/api/profiles/\(id)")
    }

    // MARK: - Chart Calculations

    // Custom response wrapper for ChartData (API returns chart directly, not wrapped)
    struct ChartDataResponse: Codable {
        let chart: ChartData
    }

    // Custom response wrapper for Dasha (API returns different structure)
    // These types are fileprivate to avoid conflicts with DashaPeriod's fromAPIEntries
    fileprivate struct DashaAPIEntry: Codable {
        let mahadasha: DashaPlanetData
        let antardasha: DashaPlanetData
        let pratyantardasha: DashaPlanetData
        let sookshma: DashaPlanetData
        let prana: DashaPlanetData
    }

    fileprivate struct DashaPlanetData: Codable {
        let planet: Int
        let startDate: Date
        let endDate: Date
        let level: Int
    }

    fileprivate struct DashaAPIResponse: Codable {
        let data: [DashaAPIEntry]
    }

    // Custom response wrapper for Ashtakavarga (API returns extra fields)
    struct AshtakavargaWrappedResponse: Codable {
        let data: AshtakavargaResult
        let cached: Bool
        let computedAt: String

        enum CodingKeys: String, CodingKey {
            case data, cached
            case computedAt = "computed_at"
        }
    }

    // Helper for decoding arbitrary JSON
    struct AnyCodable: Codable {
        let value: Any

        init(_ value: Any) {
            self.value = value
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.singleValueContainer()
            if let intVal = try? container.decode(Int.self) {
                value = intVal
            } else if let doubleVal = try? container.decode(Double.self) {
                value = doubleVal
            } else if let stringVal = try? container.decode(String.self) {
                value = stringVal
            } else if let boolVal = try? container.decode(Bool.self) {
                value = boolVal
            } else if let arrayVal = try? container.decode([AnyCodable].self) {
                value = arrayVal.map { $0.value }
            } else if let dictVal = try? container.decode([String: AnyCodable].self) {
                value = dictVal.mapValues { $0.value }
            } else {
                value = NSNull()
            }
        }

        func decodingContainer() throws -> Decoder {
            return AnyCodableDecoder(value: value)
        }

        func encode(to encoder: Encoder) throws {
            var container = encoder.singleValueContainer()
            if let intVal = value as? Int {
                try container.encode(intVal)
            } else if let doubleVal = value as? Double {
                try container.encode(doubleVal)
            } else if let stringVal = value as? String {
                try container.encode(stringVal)
            } else if let boolVal = value as? Bool {
                try container.encode(boolVal)
            } else {
                try container.encodeNil()
            }
        }
    }

    struct AnyCodableDecoder: Decoder {
        let value: Any

        var codingPath: [CodingKey] = []
        var userInfo: [CodingUserInfoKey: Any] = [:]

        init(value: Any) {
            self.value = value
        }

        func singleValueContainer() throws -> SingleValueDecodingContainer {
            return AnyCodableSingleValueContainer(value: value)
        }

        func container<Key>(keyedBy type: Key.Type) throws -> KeyedDecodingContainer<Key> {
            throw DecodingError.typeMismatch(type, DecodingError.Context(codingPath: [], debugDescription: "Not keyed"))
        }

        func unkeyedContainer() throws -> UnkeyedDecodingContainer {
            throw DecodingError.typeMismatch([Any].self, DecodingError.Context(codingPath: [], debugDescription: "Not unkeyed"))
        }
    }

    struct AnyCodableSingleValueContainer: SingleValueDecodingContainer {
        let value: Any
        var codingPath: [CodingKey] = []

        func decode(_ type: Bool.Type) throws -> Bool {
            guard let v = value as? Bool else { throw DecodingError.typeMismatch(type, DecodingError.Context(codingPath: codingPath, debugDescription: "")) }
            return v
        }

        func decode(_ type: Int.Type) throws -> Int {
            if let v = value as? Int { return v }
            if let v = value as? Double { return Int(v) }
            throw DecodingError.typeMismatch(type, DecodingError.Context(codingPath: codingPath, debugDescription: ""))
        }

        func decode(_ type: Double.Type) throws -> Double {
            guard let v = value as? Double else { throw DecodingError.typeMismatch(type, DecodingError.Context(codingPath: codingPath, debugDescription: "")) }
            return v
        }

        func decode(_ type: String.Type) throws -> String {
            guard let v = value as? String else { throw DecodingError.typeMismatch(type, DecodingError.Context(codingPath: codingPath, debugDescription: "")) }
            return v
        }

        func decode(_ type: [AnyCodable].Type) throws -> [AnyCodable] {
            guard let arr = value as? [Any] else { throw DecodingError.typeMismatch(type, DecodingError.Context(codingPath: codingPath, debugDescription: "")) }
            return arr.map { AnyCodable($0) }
        }

        func decode(_ type: [String: AnyCodable].Type) throws -> [String: AnyCodable] {
            guard let dict = value as? [String: Any] else { throw DecodingError.typeMismatch(type, DecodingError.Context(codingPath: codingPath, debugDescription: "")) }
            return dict.mapValues { AnyCodable($0) }
        }

        func decode<T: Decodable>(_ type: T.Type) throws -> T {
            return try T(from: AnyCodableDecoder(value: value))
        }

        func decodeNil() -> Bool {
            return value is NSNull
        }
    }

    func calculateChart(profileId: String) async throws -> ChartData {
        let body = ProfileIdBody(profileId: profileId)
        let response: ChartDataResponse = try await post("/api/calculations/chart", body: body)
        return response.chart
    }

    func calculateChart(profileId: String, varga: String) async throws -> ChartData {
        // Use the full calculation which includes all vargas
        let full = try await calculateFull(profileId: profileId)
        // Return the main chart for D1, vargas are stored separately
        if varga == "D1" {
            return full.chart
        }
        // For other vargas, we'd need to call a specific endpoint
        // For now, fall back to the chart
        return full.chart
    }

    func calculateAllVargas(profileId: String) async throws -> [String: ChartData] {
        let full = try await calculateFull(profileId: profileId)
        return full.vargas
    }

    func calculateDashas(profileId: String) async throws -> [DashaPeriod] {
        let body = ProfileIdBody(profileId: profileId)
        let response: DashaAPIResponse = try await post("/api/calculations/dashas", body: body)
        return transformDashaEntries(response.data)
    }

    // Transform API dasha entries into DashaPeriod tree using fileprivate types
    private func transformDashaEntries(_ entries: [DashaAPIEntry]) -> [DashaPeriod] {
        var mahadashaMap: [String: DashaPeriod] = [:]

        for entry in entries {
            let mahaKey = "\(entry.mahadasha.planet)-\(entry.mahadasha.startDate.timeIntervalSince1970)"

            // Create or get mahadasha
            if mahadashaMap[mahaKey] == nil {
                let maha = DashaPeriod(
                    planet: Planet(rawValue: entry.mahadasha.planet)?.name ?? "Unknown",
                    startDate: entry.mahadasha.startDate,
                    endDate: entry.mahadasha.endDate,
                    level: 1
                )
                mahadashaMap[mahaKey] = maha
            }

            // Get or create antardasha under mahadasha
            guard var maha = mahadashaMap[mahaKey] else { continue }
            let antaraKey = "\(mahaKey)-\(entry.antardasha.planet)"

            var antara: DashaPeriod
            if let existing = maha.subPeriods?.first(where: { $0.planet == Planet(rawValue: entry.antardasha.planet)?.name && $0.level == 2 }) {
                antara = existing
            } else {
                antara = DashaPeriod(
                    planet: Planet(rawValue: entry.antardasha.planet)?.name ?? "Unknown",
                    startDate: entry.antardasha.startDate,
                    endDate: entry.antardasha.endDate,
                    level: 2,
                    parentId: maha.id
                )
                var subPeriods = maha.subPeriods ?? []
                subPeriods.append(antara)
                maha = DashaPeriod(
                    planet: maha.planet,
                    startDate: maha.startDate,
                    endDate: maha.endDate,
                    level: maha.level,
                    parentId: maha.parentId,
                    subPeriods: subPeriods
                )
                mahadashaMap[mahaKey] = maha
            }

            // Get or create pratyantardasha
            let pratiKey = "\(antaraKey)-\(entry.pratyantardasha.planet)"
            var prati: DashaPeriod
            if let existing = antara.subPeriods?.first(where: { $0.planet == Planet(rawValue: entry.pratyantardasha.planet)?.name && $0.level == 3 }) {
                prati = existing
            } else {
                prati = DashaPeriod(
                    planet: Planet(rawValue: entry.pratyantardasha.planet)?.name ?? "Unknown",
                    startDate: entry.pratyantardasha.startDate,
                    endDate: entry.pratyantardasha.endDate,
                    level: 3,
                    parentId: antara.id
                )
                var subPeriods = antara.subPeriods ?? []
                subPeriods.append(prati)
                // Update antara in mahadasha
                if let mahaIdx = mahadashaMap[mahaKey]?.subPeriods?.firstIndex(where: { $0.id == antara.id }) {
                    mahadashaMap[mahaKey]?.subPeriods?[mahaIdx] = DashaPeriod(
                        planet: antara.planet,
                        startDate: antara.startDate,
                        endDate: antara.endDate,
                        level: antara.level,
                        parentId: antara.parentId,
                        subPeriods: subPeriods
                    )
                }
            }

            // Create sookshma under prati
            let sookshma = DashaPeriod(
                planet: Planet(rawValue: entry.sookshma.planet)?.name ?? "Unknown",
                startDate: entry.sookshma.startDate,
                endDate: entry.sookshma.endDate,
                level: 4,
                parentId: prati.id
            )

            // Create prana under sookshma
            let prana = DashaPeriod(
                planet: Planet(rawValue: entry.prana.planet)?.name ?? "Unknown",
                startDate: entry.prana.startDate,
                endDate: entry.prana.endDate,
                level: 5,
                parentId: sookshma.id
            )

            let sookshmaWithPrana = DashaPeriod(
                planet: sookshma.planet,
                startDate: sookshma.startDate,
                endDate: sookshma.endDate,
                level: sookshma.level,
                parentId: sookshma.parentId,
                subPeriods: [prana]
            )

            // Update prati with sookshma
            if let mahaIdx = mahadashaMap[mahaKey]?.subPeriods?.firstIndex(where: { $0.id == prati.id }) {
                var pratiUpdated = prati
                var pratiSub = prati.subPeriods ?? []
                pratiSub.append(sookshmaWithPrana)
                pratiUpdated = DashaPeriod(
                    planet: prati.planet,
                    startDate: prati.startDate,
                    endDate: prati.endDate,
                    level: prati.level,
                    parentId: prati.parentId,
                    subPeriods: pratiSub
                )
                mahadashaMap[mahaKey]?.subPeriods?[mahaIdx] = pratiUpdated
            }
        }

        return Array(mahadashaMap.values)
    }

    func detectYogas(profileId: String) async throws -> [YogaResult] {
        let body = ProfileIdBody(profileId: profileId)
        let response: SingleItemResponse<[YogaResult]> = try await post("/api/calculations/yogas", body: body)
        return response.data
    }

    func calculateShadbala(profileId: String) async throws -> [ShadbalaResult] {
        let body = ProfileIdBody(profileId: profileId)
        let response: SingleItemResponse<[ShadbalaResult]> = try await post("/api/calculations/shadbala", body: body)
        return response.data
    }

    func calculateAshtakavarga(profileId: String) async throws -> AshtakavargaResult {
        let body = ProfileIdBody(profileId: profileId)
        let response: AshtakavargaWrappedResponse = try await post("/api/calculations/ashtakavarga", body: body)
        return response.data
    }

    // MARK: - Full Calculation

    // Vargas is returned as array of [name, chartData] tuples
    struct FullCalculationResponse: Codable {
        let chart: ChartData
        let vargas: [String: ChartData]
        let dashas: [DashaPeriod]
        let yogas: [YogaResult]
        let shadbala: [ShadbalaResult]
        let ashtakavarga: AshtakavargaResult
        let cached: Bool
        let computedAt: String

        enum CodingKeys: String, CodingKey {
            case chart, vargas, dashas, yogas, shadbala, ashtakavarga, cached
            case computedAt = "computed_at"
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            chart = try container.decode(ChartData.self, forKey: .chart)

            // Vargas is [[String, ChartData]] - decode as raw JSON data first
            let vargasData = try container.decode([[String: AnyCodable]].self, forKey: .vargas)
            var vargasDict: [String: ChartData] = [:]
            for entry in vargasData {
                // Each entry is a dict like {"0": "D1", "1": {...chartData...}}
                if let nameAny = entry["0"], let name = nameAny.value as? String,
                   let chartAny = entry["1"] {
                    // Decode chart from the nested value
                    if let chartDict = chartAny.value as? [String: Any] {
                        let chartJSON = try JSONSerialization.data(withJSONObject: chartDict)
                        let chartDecoder = JSONDecoder()
                        chartDecoder.keyDecodingStrategy = .convertFromSnakeCase
                        chartDecoder.dateDecodingStrategy = .iso8601
                        let chart = try chartDecoder.decode(ChartData.self, from: chartJSON)
                        vargasDict[name] = chart
                    }
                }
            }
            vargas = vargasDict

            dashas = try container.decode([DashaPeriod].self, forKey: .dashas)
            yogas = try container.decode([YogaResult].self, forKey: .yogas)
            shadbala = try container.decode([ShadbalaResult].self, forKey: .shadbala)
            ashtakavarga = try container.decode(AshtakavargaResult.self, forKey: .ashtakavarga)
            cached = try container.decode(Bool.self, forKey: .cached)
            computedAt = try container.decode(String.self, forKey: .computedAt)
        }
    }

    struct FullCalculationWrappedResponse: Codable {
        let data: FullCalculationResponse
    }

    func calculateFull(profileId: String) async throws -> FullCalculationResponse {
        let body = ProfileIdBody(profileId: profileId)
        let response: FullCalculationWrappedResponse = try await post("/api/calculations/full", body: body)
        return response.data
    }

    // MARK: - Cache Management

    func invalidateCache(profileId: String) async throws {
        _ = try await delete("/api/calculations/cache/\(profileId)")
    }

    // MARK: - Predictions

    func getHourlyPredictions(profileId: String, date: String? = nil) async throws -> [HourlyPrediction] {
        var path = "/api/predictions/\(profileId)/hourly"
        if let date = date {
            path += "?date=\(date)"
        }
        let response: HourlyPredictionsResponse = try await get(path)
        return response.data
    }

    func getMonthlyPredictions(profileId: String, year: Int, month: Int) async throws -> MonthlyPrediction {
        let path = "/api/predictions/\(profileId)/monthly?year=\(year)&month=\(month)"
        let response: MonthlyPredictionResponse = try await get(path)
        return response.data
    }

    func clearPredictionCache(profileId: String) async throws -> PredictionCacheResponse {
        _ = try await delete("/api/predictions/\(profileId)/cache")
        return PredictionCacheResponse(deleted: 0, profileId: profileId)
    }

    // MARK: - Generic HTTP Methods

    private func get<T: Decodable>(_ path: String) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(path)") else {
            throw APIError.invalidURL
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        return try await perform(request)
    }

    private func post<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(path)") else {
            throw APIError.invalidURL
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        do {
            request.httpBody = try encoder.encode(body)
        } catch {
            throw APIError.encodingError(error)
        }
        return try await perform(request)
    }

    private func put<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(path)") else {
            throw APIError.invalidURL
        }
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        do {
            request.httpBody = try encoder.encode(body)
        } catch {
            throw APIError.encodingError(error)
        }
        return try await perform(request)
    }

    private func delete(_ path: String) async throws {
        guard let url = URL(string: "\(baseURL)\(path)") else {
            throw APIError.invalidURL
        }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse else { return }
            guard (200...299).contains(http.statusCode) else {
                let body = String(data: data, encoding: .utf8) ?? ""
                throw APIError.httpError(statusCode: http.statusCode, body: body)
            }
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.notReachable
        }
    }

    private func perform<T: Decodable>(_ request: URLRequest) async throws -> T {
        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                throw APIError.notReachable
            }
            guard (200...299).contains(http.statusCode) else {
                let body = String(data: data, encoding: .utf8) ?? ""
                throw APIError.httpError(statusCode: http.statusCode, body: body)
            }
            do {
                return try decoder.decode(T.self, from: data)
            } catch {
                throw APIError.decodingError(error)
            }
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.notReachable
        }
    }
}
