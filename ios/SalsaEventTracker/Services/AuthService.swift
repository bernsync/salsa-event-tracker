// ios/SalsaEventTracker/Services/AuthService.swift
import Foundation
import KeychainAccess
import Observation

struct AuthSession {
    let accessToken: String
    let refreshToken: String
    let expiresAt: Date
    let userId: String
    let email: String
}

@MainActor
@Observable
final class AuthService: AuthServiceProtocol {
    private(set) var session: AuthSession?

    private let keychain = Keychain(service: "com.salsaeventtracker.ios")
    private let baseURL: URL
    private let anonKey: String

    init(baseURL: URL = SupabaseConfig.url, anonKey: String = SupabaseConfig.anonKey) {
        self.baseURL = baseURL
        self.anonKey = anonKey
        restoreSession()
    }

    func signIn(email: String, password: String) async throws {
        let url = baseURL.appending(path: "/auth/v1/token")
            .appending(queryItems: [URLQueryItem(name: "grant_type", value: "password")])
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["email": email, "password": password])

        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw NSError(domain: "AuthService", code: 401,
                          userInfo: [NSLocalizedDescriptionKey: "Invalid email or password"])
        }

        let raw = try JSONDecoder().decode(RawAuthResponse.self, from: data)
        let decoded = try decodeJWT(raw.accessToken)
        let newSession = AuthSession(
            accessToken: raw.accessToken,
            refreshToken: raw.refreshToken,
            expiresAt: Date().addingTimeInterval(Double(raw.expiresIn)),
            userId: decoded.sub,
            email: decoded.email ?? email
        )
        session = newSession
        try? keychain.set(raw.accessToken, key: "accessToken")
        try? keychain.set(raw.refreshToken, key: "refreshToken")
        try? keychain.set(String(newSession.expiresAt.timeIntervalSince1970), key: "expiresAt")
        try? keychain.set(decoded.sub, key: "userId")
        try? keychain.set(decoded.email ?? email, key: "email")
    }

    func signOut() {
        session = nil
        try? keychain.removeAll()
    }

    private func restoreSession() {
        guard
            let accessTokenOpt = try? keychain.get("accessToken"),
            let accessToken = accessTokenOpt,
            let refreshTokenOpt = try? keychain.get("refreshToken"),
            let refreshToken = refreshTokenOpt,
            let expiresAtStrOpt = try? keychain.get("expiresAt"),
            let expiresAtStr = expiresAtStrOpt,
            let expiresAtTs = Double(expiresAtStr),
            let userIdOpt = try? keychain.get("userId"),
            let userId = userIdOpt,
            let emailOpt = try? keychain.get("email"),
            let email = emailOpt
        else { return }
        let expiresAt = Date(timeIntervalSince1970: expiresAtTs)
        guard expiresAt > Date() else { try? keychain.removeAll(); return }
        session = AuthSession(accessToken: accessToken, refreshToken: refreshToken,
                              expiresAt: expiresAt, userId: userId, email: email)
    }

    // Minimal JWT decode (base64url payload only — no signature verification needed,
    // Supabase enforces validity server-side)
    private func decodeJWT(_ token: String) throws -> JWTPayload {
        let parts = token.split(separator: ".")
        guard parts.count == 3 else { throw URLError(.badServerResponse) }
        var base64 = String(parts[1])
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        while base64.count % 4 != 0 { base64 += "=" }
        guard let data = Data(base64Encoded: base64) else { throw URLError(.badServerResponse) }
        return try JSONDecoder().decode(JWTPayload.self, from: data)
    }

    private struct RawAuthResponse: Decodable {
        let accessToken: String
        let refreshToken: String
        let expiresIn: Int
        enum CodingKeys: String, CodingKey {
            case accessToken = "access_token"
            case refreshToken = "refresh_token"
            case expiresIn = "expires_in"
        }
    }

    private struct JWTPayload: Decodable {
        let sub: String
        let email: String?
    }
}
