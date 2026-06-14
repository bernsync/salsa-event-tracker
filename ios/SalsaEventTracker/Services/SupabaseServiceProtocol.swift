// ios/SalsaEventTracker/Services/SupabaseServiceProtocol.swift
import Foundation

protocol SupabaseServiceProtocol: Actor {
    func fetchEvents() async throws -> [Event]
    func fetchDanceStyles() async throws -> [DanceStyle]
    func fetchSchengenCountries() async throws -> [SchengenCountryRow]
    func fetchTrips(token: String) async throws -> [Trip]
    func fetchReviews(token: String) async throws -> [Review]
    func createTrip(_ body: [String: Any], token: String) async throws -> Trip
    func updateTrip(id: String, body: [String: Any], token: String) async throws
    func deleteTrip(id: String, token: String) async throws
    func replaceTripPlaces(tripId: String, places: [[String: Any]], token: String) async throws
    func replacePTODays(tripId: String, ptoDays: [[String: Any]], token: String) async throws
    func createReview(_ body: [String: Any], token: String) async throws -> Review
    func updateReview(id: String, body: [String: Any], token: String) async throws
    func deleteReview(id: String, token: String) async throws
}
