// ios/SalsaEventTracker/Services/AuthServiceProtocol.swift
import Foundation
import Observation

// Requires Observable so AppModel can hold it as `any AuthServiceProtocol` while
// SwiftUI's observation system still tracks session changes through the existential.
protocol AuthServiceProtocol: AnyObject, Observable {
    var session: AuthSession? { get }
    func signIn(email: String, password: String) async throws
    func signOut()
    /// Returns a non-expired access token, transparently refreshing via the
    /// Supabase refresh-token grant when the current one is expired (or about to).
    /// Throws `ServiceAuthError.tokenExpired` if there is no session or the
    /// refresh token is no longer valid.
    func validAccessToken() async throws -> String
}
