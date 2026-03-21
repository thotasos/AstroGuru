import Foundation
import JavaScriptCore

// MARK: - AstrologyCore Bridge
/// Bridge to @parashari/core calculation engine via JavaScriptCore.
/// Falls back to Process-based Node.js bridge if JavaScriptCore cannot load the bundle.
final class AstrologyCore {
    private let context: JSContext?
    private let useProcessBridge: Bool
    private let processBridge: AstrologyCoreProcessBridge?

    init() throws {
        // Try JavaScriptCore first
        let tempContext = JSContext()
        tempContext?.exceptionHandler = { _, ex in
            print("JS Error: \(ex?.toString() ?? "unknown")")
        }

        var loaded = false

        // Try loading @parashari/core bundle as direct script
        if let bundlePath = Bundle.main.path(forResource: "parashari-core", ofType: "js"),
           let jsCode = try? String(contentsOfFile: bundlePath, encoding: .utf8) {
            tempContext?.evaluateScript(jsCode)
            // Check if AstrologyEngine is defined
            if tempContext?.evaluateScript("typeof AstrologyEngine !== 'undefined'")?.toBool() == true {
                loaded = true
            }
        }

        // Try CommonJS pattern if direct load failed
        if !loaded {
            if let bundlePath = Bundle.main.path(forResource: "parashari-core", ofType: "js"),
               let jsCode = try? String(contentsOfFile: bundlePath, encoding: .utf8) {
                tempContext?.evaluateScript("var module = { exports: {} };")
                tempContext?.evaluateScript("(function(module, exports) { \(jsCode) })(module, module.exports);")
                if tempContext?.evaluateScript("typeof AstrologyEngine !== 'undefined'")?.toBool() == true {
                    loaded = true
                }
            }
        }

        if loaded {
            self.context = tempContext
            self.useProcessBridge = false
            self.processBridge = nil
        } else {
            // Fall back to Process-based Node.js bridge
            self.context = nil
            self.useProcessBridge = true
            self.processBridge = AstrologyCoreProcessBridge()
        }
    }

    func calculateChart(birthData: [String: Any]) throws -> ChartData {
        if useProcessBridge {
            guard let bridge = processBridge else {
                throw AstrologyCoreError.calculationFailed
            }
            return try bridge.calculateChart(birthData: birthData)
        }

        guard let ctx = context else {
            throw AstrologyCoreError.calculationFailed
        }

        guard let jsonData = try? JSONSerialization.data(withJSONObject: birthData),
              let jsonString = String(data: jsonData, encoding: .utf8) else {
            throw AstrologyCoreError.invalidInput
        }

        let escapedString = jsonString
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .replacingOccurrences(of: "\n", with: "\\n")

        let jsCode = """
            var birthData = JSON.parse('\(escapedString)');
            var result = new AstrologyEngine().calculateChart(birthData);
            JSON.stringify(result);
        """

        guard let jsResult = ctx.evaluateScript(jsCode),
              let resultString = jsResult.toString(),
              !resultString.isEmpty else {
            throw AstrologyCoreError.calculationFailed
        }

        guard let data = resultString.data(using: .utf8) else {
            throw AstrologyCoreError.invalidResponse
        }

        return try JSONDecoder().decode(ChartData.self, from: data)
    }

    func calculateVargas(birthData: [String: Any]) throws -> [VargaChart] {
        if useProcessBridge {
            guard let bridge = processBridge else {
                throw AstrologyCoreError.calculationFailed
            }
            return try bridge.calculateVargas(birthData: birthData)
        }

        guard let ctx = context else {
            throw AstrologyCoreError.calculationFailed
        }

        guard let jsonData = try? JSONSerialization.data(withJSONObject: birthData),
              let jsonString = String(data: jsonData, encoding: .utf8) else {
            throw AstrologyCoreError.invalidInput
        }

        let escapedString = jsonString
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .replacingOccurrences(of: "\n", with: "\\n")

        let jsCode = """
            var birthData = JSON.parse('\(escapedString)');
            var result = new AstrologyEngine().calculateVargas(birthData);
            JSON.stringify(result);
        """

        guard let jsResult = ctx.evaluateScript(jsCode),
              let resultString = jsResult.toString(),
              !resultString.isEmpty else {
            throw AstrologyCoreError.calculationFailed
        }

        guard let data = resultString.data(using: .utf8) else {
            throw AstrologyCoreError.invalidResponse
        }

        return try JSONDecoder().decode([VargaChart].self, from: data)
    }

    func calculateDashas(birthData: [String: Any]) throws -> [DashaPeriod] {
        if useProcessBridge {
            guard let bridge = processBridge else {
                throw AstrologyCoreError.calculationFailed
            }
            return try bridge.calculateDashas(birthData: birthData)
        }

        guard let ctx = context else {
            throw AstrologyCoreError.calculationFailed
        }

        guard let jsonData = try? JSONSerialization.data(withJSONObject: birthData),
              let jsonString = String(data: jsonData, encoding: .utf8) else {
            throw AstrologyCoreError.invalidInput
        }

        let escapedString = jsonString
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .replacingOccurrences(of: "\n", with: "\\n")

        let jsCode = """
            var birthData = JSON.parse('\(escapedString)');
            var result = new AstrologyEngine().calculateDashas(birthData);
            JSON.stringify(result);
        """

        guard let jsResult = ctx.evaluateScript(jsCode),
              let resultString = jsResult.toString(),
              !resultString.isEmpty else {
            throw AstrologyCoreError.calculationFailed
        }

        guard let data = resultString.data(using: .utf8) else {
            throw AstrologyCoreError.invalidResponse
        }

        return try JSONDecoder().decode([DashaPeriod].self, from: data)
    }
}

// MARK: - Process Bridge Fallback
/// Process-based fallback that spawns a Node.js child process to run @parashari/core calculations.
final class AstrologyCoreProcessBridge {
    private let nodePath: String

    init() {
        // Find node executable
        if let path = AstrologyCoreProcessBridge.findNodePath() {
            self.nodePath = path
        } else {
            self.nodePath = "/usr/local/bin/node"
        }
    }

    private static func findNodePath() -> String? {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/which")
        process.arguments = ["node"]

        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = FileHandle.nullDevice

        do {
            try process.run()
            process.waitUntilExit()

            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            if let output = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines),
               !output.isEmpty {
                return output
            }
        } catch {
            print("Failed to find node path: \(error)")
        }

        return nil
    }

    func calculateChart(birthData: [String: Any]) throws -> ChartData {
        let input = try JSONSerialization.data(withJSONObject: birthData)
        let output = try runNodeScript(script: """
            const engine = require('@parashari/core');
            const birthData = JSON.parse(require('fs').readFileSync(0, 'utf8'));
            console.log(JSON.stringify(engine.calculateChart(birthData)));
            """, input: input)

        return try JSONDecoder().decode(ChartData.self, from: output)
    }

    func calculateVargas(birthData: [String: Any]) throws -> [VargaChart] {
        let input = try JSONSerialization.data(withJSONObject: birthData)
        let output = try runNodeScript(script: """
            const engine = require('@parashari/core');
            const birthData = JSON.parse(require('fs').readFileSync(0, 'utf8'));
            console.log(JSON.stringify(engine.calculateVargas(birthData)));
            """, input: input)

        return try JSONDecoder().decode([VargaChart].self, from: output)
    }

    func calculateDashas(birthData: [String: Any]) throws -> [DashaPeriod] {
        let input = try JSONSerialization.data(withJSONObject: birthData)
        let output = try runNodeScript(script: """
            const engine = require('@parashari/core');
            const birthData = JSON.parse(require('fs').readFileSync(0, 'utf8'));
            console.log(JSON.stringify(engine.calculateDashas(birthData)));
            """, input: input)

        return try JSONDecoder().decode([DashaPeriod].self, from: output)
    }

    private func runNodeScript(script: String, input: Data) throws -> Data {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: nodePath)
        process.arguments = ["-e", script]

        let inputPipe = Pipe()
        let outputPipe = Pipe()
        let errorPipe = Pipe()

        process.standardInput = inputPipe
        process.standardOutput = outputPipe
        process.standardError = errorPipe

        inputPipe.fileHandleForWriting.write(input)
        inputPipe.fileHandleForWriting.closeFile()

        try process.run()
        process.waitUntilExit()

        let outputData = outputPipe.fileHandleForReading.readDataToEndOfFile()

        if process.terminationStatus != 0 {
            let errorData = errorPipe.fileHandleForReading.readDataToEndOfFile()
            if let errorString = String(data: errorData, encoding: .utf8) {
                print("Node.js error: \(errorString)")
            }
            throw AstrologyCoreError.calculationFailed
        }

        return outputData
    }
}

// MARK: - Errors
enum AstrologyCoreError: Error, LocalizedError {
    case bundleNotFound
    case invalidInput
    case invalidResponse
    case calculationFailed

    var errorDescription: String? {
        switch self {
        case .bundleNotFound:
            return "parashari-core.js not found in bundle"
        case .invalidInput:
            return "Invalid birth data input"
        case .invalidResponse:
            return "Invalid response from calculation engine"
        case .calculationFailed:
            return "Chart calculation failed"
        }
    }
}