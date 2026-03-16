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
            return "Server not reachable. Check that the local server is running on port 3001."
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

// MARK: - API Service

actor APIService {
    static let shared = APIService()

    let baseURL = "http://localhost:3001"

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
        return try await get("/api/profiles")
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

    func calculateChart(profileId: String) async throws -> ChartData {
        return try await get("/api/profiles/\(profileId)/chart")
    }

    func calculateChart(profileId: String, varga: String) async throws -> ChartData {
        return try await get("/api/profiles/\(profileId)/chart/\(varga)")
    }

    func calculateAllVargas(profileId: String) async throws -> [String: ChartData] {
        return try await get("/api/profiles/\(profileId)/vargas")
    }

    func calculateDashas(profileId: String) async throws -> [DashaPeriod] {
        return try await get("/api/profiles/\(profileId)/dashas")
    }

    func detectYogas(profileId: String) async throws -> [YogaResult] {
        return try await get("/api/profiles/\(profileId)/yogas")
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
