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

    // Tokens stay on this device only and are readable only while it is unlocked;
    // this prevents them migrating to a new device via an encrypted backup.
    private let keychain = Keychain(service: "com.salsaeventtracker.ios")
        .accessibility(.whenUnlockedThisDeviceOnly)
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
        persist(newSession)
    }

    func signOut() {
        session = nil
        try? keychain.removeAll()
    }

    /// Returns a valid access token, refreshing it first when it is within 60s of
    /// (or past) expiry. A failed refresh throws `ServiceAuthError.tokenExpired`.
    func validAccessToken() async throws -> String {
        guard let current = session else { throw ServiceAuthError.tokenExpired }
        if current.expiresAt.timeIntervalSinceNow > 60 { return current.accessToken }
        return try await refresh(using: current.refreshToken, email: current.email)
    }

    private func refresh(using refreshToken: String, email: String) async throws -> String {
        let url = baseURL.appending(path: "/auth/v1/token")
            .appending(queryItems: [URLQueryItem(name: "grant_type", value: "refresh_token")])
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["refresh_token": refreshToken])

        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            // Refresh token revoked/expired — caller will sign out.
            throw ServiceAuthError.tokenExpired
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
        persist(newSession)
        return newSession.accessToken
    }

    private func persist(_ session: AuthSession) {
        try? keychain.set(session.accessToken, key: "accessToken")
        try? keychain.set(session.refreshToken, key: "refreshToken")
        try? keychain.set(String(session.expiresAt.timeIntervalSince1970), key: "expiresAt")
        try? keychain.set(session.userId, key: "userId")
        try? keychain.set(session.email, key: "email")
    }

    private func restoreSession() {
        guard
            let accessToken = try? keychain.get("accessToken"),
            let refreshToken = try? keychain.get("refreshToken"),
            let expiresAtStr = try? keychain.get("expiresAt"),
            let expiresAtTs = Double(expiresAtStr),
            let userId = try? keychain.get("userId"),
            let email = try? keychain.get("email")
        else { return }
        // Keep the session even if the access token is already expired —
        // `validAccessToken()` refreshes it on demand via the refresh token.
        // Only a missing refresh token (handled by the guard above) is fatal.
        session = AuthSession(accessToken: accessToken, refreshToken: refreshToken,
                              expiresAt: Date(timeIntervalSince1970: expiresAtTs),
                              userId: userId, email: email)
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
