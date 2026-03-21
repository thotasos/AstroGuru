import Foundation

struct ShadbalaResult: Codable, Identifiable {
    var id: String = UUID().uuidString
    let planet: String           // Planet name
    let sthAnaBala: Double       // Positional strength
    let digBala: Double         // Directional strength
    let kalaBala: Double         // Temporal strength
    let chestabala: Double       // Motional strength
    let naisargikaBala: Double   // Natural strength
    let drigBala: Double         // Aspect strength
    let total: Double            // Total strength in Rupas (÷60)
    let strengthInVirupas: Double // Total in Virupas

    var isExalted: Bool { strengthInVirupas >= 600 }
    var isDebilitated: Bool { strengthInVirupas < 300 }
}