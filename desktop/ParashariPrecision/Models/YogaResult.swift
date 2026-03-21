import Foundation

struct YogaResult: Codable, Identifiable {
    let id: String
    let name: String
    let description: String
    let isPresent: Bool
    let planets: [String]   // Planet names involved
    let houses: [Int]       // House numbers involved
    let strength: Double     // 0.0 - 1.0
    let category: String     // "Rajyoga", "Dhanayoga", etc.

    init(
        id: String = UUID().uuidString,
        name: String,
        description: String,
        isPresent: Bool = true,
        planets: [String] = [],
        houses: [Int] = [],
        strength: Double = 0.0,
        category: String = ""
    ) {
        self.id = id
        self.name = name
        self.description = description
        self.isPresent = isPresent
        self.planets = planets
        self.houses = houses
        self.strength = strength
        self.category = category
    }
}