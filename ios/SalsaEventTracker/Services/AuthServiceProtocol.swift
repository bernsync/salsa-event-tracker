// ios/SalsaEventTracker/Services/AuthServiceProtocol.swift
import Foundation
import Observation

// Requires Observable so AppModel can hold it as `any AuthServiceProtocol` while
// SwiftUI's observation system still tracks session changes through the existential.
protocol AuthServiceProtocol: AnyObject, Observable {
    var session: AuthSession? { get }
    func signIn(email: String, password: String) async throws
    func signOut()
}
