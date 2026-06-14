// ios/SalsaEventTracker/Services/AuthServiceProtocol.swift
import Foundation

protocol AuthServiceProtocol: AnyObject {
    var session: AuthSession? { get }
    func signIn(email: String, password: String) async throws
    func signOut()
}
