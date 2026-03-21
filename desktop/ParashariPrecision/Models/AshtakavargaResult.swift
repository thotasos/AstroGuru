import Foundation

struct AshtakavargaResult: Codable {
    let bav: [String: [Int]]     // BAV: planet -> [12 sign bindus]
    let sav: [Int]               // SAV: [12 sign totals]
    let planetBav: [String: [Int]] // Trikona/Ekadhipatya shodhana applied

    func bindu(for planet: String, sign: Int) -> Int {
        bav[planet]?[sign] ?? 0
    }

    func savTotal(for sign: Int) -> Int {
        sav[sign]
    }
}