// ios/SalsaEventTrackerTests/AppModelTests.swift
import Foundation
import Observation
import Testing
@testable import SalsaEventTracker

// MARK: - Mock

actor MockSupabaseService: SupabaseServiceProtocol {
    var eventsToReturn: [Event] = []
    var tripsToReturn: [Trip] = []
    var reviewsToReturn: [Review] = []
    var shouldThrow: Error? = nil

    func setEventsToReturn(_ events: [Event]) { eventsToReturn = events }
    func setShouldThrow(_ error: Error?) { shouldThrow = error }

    func fetchEvents() async throws -> [Event] {
        if let e = shouldThrow { throw e }
        return eventsToReturn
    }
    func fetchDanceStyles() async throws -> [DanceStyle] { [] }
    func fetchSchengenCountries() async throws -> [SchengenCountryRow] { [] }
    func fetchTrips(token: String) async throws -> [Trip] {
        if let e = shouldThrow { throw e }
        return tripsToReturn
    }
    func fetchReviews(token: String) async throws -> [Review] {
        if let e = shouldThrow { throw e }
        return reviewsToReturn
    }
    func createTrip(_ body: [String: Any], token: String) async throws -> Trip { fatalError() }
    func updateTrip(id: String, body: [String: Any], token: String) async throws {}
    func deleteTrip(id: String, token: String) async throws {}
    func replaceTripPlaces(tripId: String, places: [[String: Any]], token: String) async throws {}
    func replacePTODays(tripId: String, ptoDays: [[String: Any]], token: String) async throws {}
    func createReview(_ body: [String: Any], token: String) async throws -> Review { fatalError() }
    func updateReview(id: String, body: [String: Any], token: String) async throws {}
    func deleteReview(id: String, token: String) async throws {}
}

@Observable
@MainActor
final class MockAuthService: AuthServiceProtocol {
    var session: AuthSession? = nil
    func signIn(email: String, password: String) async throws { }
    func signOut() { session = nil }
}

// MARK: - SchengenCalculator tests

@Suite("SchengenCalculator")
struct SchengenCalculatorTests {
    let schengen: Set<String> = ["France", "Germany", "Spain"]

    @Test("no stays → 0 days used")
    func emptyStays() {
        let used = SchengenCalculator.daysUsed(
            stays: [], checkDate: "2026-06-01")
        #expect(used == 0)
    }

    @Test("single 10-day stay within window")
    func singleStay() {
        let used = SchengenCalculator.daysUsed(
            stays: [("2026-05-22", "2026-05-31")],
            checkDate: "2026-06-01")
        #expect(used == 10)
    }

    @Test("stay outside 180-day window is excluded")
    func outsideWindow() {
        let used = SchengenCalculator.daysUsed(
            stays: [("2025-01-01", "2025-01-30")],
            checkDate: "2026-06-01")
        #expect(used == 0)
    }

    @Test("capped at 90")
    func capAt90() {
        let used = SchengenCalculator.daysUsed(
            stays: [("2026-03-01", "2026-06-08")],
            checkDate: "2026-06-01")
        #expect(used == 90)
    }
}

// MARK: - TextUtils tests

@Suite("TextUtils")
struct TextUtilsTests {
    let event = Event(id: "1", name: "Salsa Night", organizer: nil, website: nil,
                      instagram: nil, facebook: nil, styles: ["salsa"], watchlist: nil,
                      createdAt: "2026-01-01", editions: [])
    let edition = EventEdition.placeholder

    @Test("empty query matches everything")
    func emptyQuery() {
        #expect(TextUtils.matches(event: event, edition: edition, query: "") == true)
    }

    @Test("case-insensitive match on event name")
    func caseInsensitive() {
        #expect(TextUtils.matches(event: event, edition: edition, query: "SALSA") == true)
    }

    @Test("diacritic-insensitive match")
    func diacriticFolding() {
        #expect(TextUtils.matches(event: event, edition: edition, query: "sálsà") == true)
    }

    @Test("non-matching query returns false")
    func noMatch() {
        #expect(TextUtils.matches(event: event, edition: edition, query: "bachata") == false)
    }
}

// MARK: - AppModel loading tests

@Suite("AppModel data loading") @MainActor
struct AppModelLoadingTests {
    @Test("loadPublicData populates events from mock")
    func publicDataLoads() async {
        let mock = MockSupabaseService()
        let edition = EventEdition(id: "ed1", startDate: "2026-08-01", endDate: "2026-08-04",
            city: "Paris", country: "France", venue: nil, tickets: nil, price: nil,
            currency: nil, djs: nil, artists: nil, eventSize: nil, travel: nil,
            addedOn: nil, notes: nil, forceShowMonday: false, visibility: "public")
        let event = Event(id: "ev1", name: "Paris Salsa Fest", organizer: nil, website: nil,
            instagram: nil, facebook: nil, styles: ["salsa"], watchlist: nil,
            createdAt: "2026-01-01", editions: [edition])
        await mock.setEventsToReturn([event])
        let model = AppModel(supabase: mock, publicDataCache: nil)
        await model.loadPublicData()
        #expect(model.events.isEmpty == false)
        #expect(model.appError == nil)
    }

    @Test("loadPublicData sets appError on failure")
    func publicDataFailure() async {
        let mock = MockSupabaseService()
        await mock.setShouldThrow(NSError(domain: "test", code: 0))
        let model = AppModel(supabase: mock, publicDataCache: nil)
        await model.loadPublicData()
        #expect(model.appError != nil)
    }

    @Test("loadPrivateData clears auth and sets authExpired error when service returns 401")
    func authExpiryClearsState() async {
        let supabaseMock = MockSupabaseService()
        await supabaseMock.setShouldThrow(ServiceAuthError.tokenExpired)
        let authMock = MockAuthService()
        authMock.session = AuthSession(
            accessToken: "tok", refreshToken: "ref",
            expiresAt: Date().addingTimeInterval(3600),
            userId: "u1", email: "test@test.com")
        let model = AppModel(supabase: supabaseMock, authService: authMock, publicDataCache: nil)
        await model.loadPrivateData()
        #expect(model.isSignedIn == false)
        #expect(model.appError == .authExpired)
    }
}
