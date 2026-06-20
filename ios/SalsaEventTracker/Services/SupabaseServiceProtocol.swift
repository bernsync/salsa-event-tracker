// ios/SalsaEventTracker/Services/SupabaseServiceProtocol.swift
import Foundation

protocol SupabaseServiceProtocol: Actor {
    func fetchEvents() async throws -> [Event]
    func fetchDanceStyles() async throws -> [DanceStyle]
    func fetchSchengenCountries() async throws -> [SchengenCountryRow]
    func fetchTrips(token: String) async throws -> [Trip]
}
