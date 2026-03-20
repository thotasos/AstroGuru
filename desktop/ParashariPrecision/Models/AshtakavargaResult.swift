import Foundation

// MARK: - Ashtakavarga Result

// AshtakavargaResult keys: 0-6 for planets, 7 for Ascendant
struct AshtakavargaResult: Codable {
    let bav: [Int: [Int]]  // Key: 0-6 planets, 7=Lagna -> [scores per sign]
    let sav: [Int]          // Sarva Ashtakavarga scores by sign (12 signs)
    let planetBav: [Int: [Int]]  // Key: 0-6 planets -> [scores per sign]

    enum CodingKeys: String, CodingKey {
        case bav
        case sav
        case planetBav = "planetBav"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        // Bav and planetBav are arrays of [key, scores] tuples where key can be Int or String
        // Decode as [[Any]] to handle mixed types
        let bavArray = try container.decode([[JSONValue]].self, forKey: .bav)
        var bavDict: [Int: [Int]] = [:]
        for entry in bavArray {
            if entry.count >= 2 {
                let keyValue = entry[0]
                let scoresValue = entry[1]
                if case .string(let keyStr) = keyValue, keyStr == "Ascendant" {
                    if case .array(let scores) = scoresValue {
                        bavDict[7] = scores.map { if case .int(let v) = $0 { return v } else { return 0 } }
                    }
                } else if case .int(let keyInt) = keyValue {
                    if case .array(let scores) = scoresValue {
                        bavDict[keyInt] = scores.map { if case .int(let v) = $0 { return v } else { return 0 } }
                    }
                }
            }
        }
        self.bav = bavDict

        self.sav = try container.decode([Int].self, forKey: .sav)

        let planetBavArray = try container.decode([[JSONValue]].self, forKey: .planetBav)
        var planetBavDict: [Int: [Int]] = [:]
        for entry in planetBavArray {
            if entry.count >= 2 {
                let keyValue = entry[0]
                let scoresValue = entry[1]
                if case .int(let keyInt) = keyValue {
                    if case .array(let scores) = scoresValue {
                        planetBavDict[keyInt] = scores.map { if case .int(let v) = $0 { return v } else { return 0 } }
                    }
                }
            }
        }
        self.planetBav = planetBavDict
    }

    init(bav: [Int: [Int]], sav: [Int], planetBav: [Int: [Int]]) {
        self.bav = bav
        self.sav = sav
        self.planetBav = planetBav
    }

    // Get BAV for a specific planet or lagna (index 7 = Ascendant)
    func bavForPlanet(_ planetIndex: Int) -> [Int] {
        return bav[planetIndex] ?? []
    }

    // Get PBAV for a specific planet
    func pbavForPlanet(_ planetIndex: Int) -> [Int] {
        return planetBav[planetIndex] ?? []
    }
}

// MARK: - JSON Value for heterogeneous decoding

enum JSONValue: Codable {
    case string(String)
    case int(Int)
    case array([JSONValue])
    case dictionary([String: JSONValue])

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let stringVal = try? container.decode(String.self) {
            self = .string(stringVal)
        } else if let intVal = try? container.decode(Int.self) {
            self = .int(intVal)
        } else if let arrayVal = try? container.decode([JSONValue].self) {
            self = .array(arrayVal)
        } else if let dictVal = try? container.decode([String: JSONValue].self) {
            self = .dictionary(dictVal)
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Unknown JSON value")
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let val): try container.encode(val)
        case .int(let val): try container.encode(val)
        case .array(let val): try container.encode(val)
        case .dictionary(let val): try container.encode(val)
        }
    }
}
