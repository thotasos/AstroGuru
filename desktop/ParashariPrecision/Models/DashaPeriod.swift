import Foundation

struct DashaPeriod: Codable {
    let lord: String           // Planet name: "Moon", "Mars", etc.
    let sign: Int             // Sign index 0-11
    let startYear: Int
    let startMonth: Int
    let endYear: Int
    let endMonth: Int
    let balance: Double        // Balance of dasha in years
    let antardashas: [DashaPeriod]

    var endDate: String {
        String(format: "%04d-%02d-01", endYear, endMonth)
    }

    var startDate: String {
        String(format: "%04d-%02d-01", startYear, startMonth)
    }
}
