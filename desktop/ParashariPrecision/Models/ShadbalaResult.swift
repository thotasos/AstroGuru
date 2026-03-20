import Foundation

// MARK: - Shadbala Result

struct ShadbalaResult: Codable, Identifiable {
    let planet: Int
    let sthanabala: Double
    let digbala: Double
    let kalabala: Double
    let chestabala: Double
    let naisargikabala: Double
    let drigbala: Double
    let total: Double
    let totalRupas: Double
    let ishtaPhala: Double
    let kashtaPhala: Double

    var id: Int { planet }

    enum CodingKeys: String, CodingKey {
        case planet
        case sthanabala
        case digbala
        case kalabala
        case chestabala
        case naisargikabala
        case drigbala
        case total
        case totalRupas = "totalRupas"
        case ishtaPhala = "ishtaPhala"
        case kashtaPhala = "kashtaPhala"
    }

    var planetName: String {
        PlanetName.from(id: planet)
    }

    var planetEnum: Planet? {
        Planet(rawValue: planet)
    }

    var strengthCategory: String {
        let rupas = totalRupas
        if rupas >= 6 { return "Strong" }
        if rupas >= 4 { return "Moderate" }
        return "Weak"
    }

    var strengthColor: String {
        let rupas = totalRupas
        if rupas >= 6 { return "green" }
        if rupas >= 4 { return "yellow" }
        return "red"
    }
}
