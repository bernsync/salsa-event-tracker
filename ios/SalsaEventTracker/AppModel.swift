// ios/SalsaEventTracker/AppModel.swift
import Foundation
import Observation

@MainActor
@Observable
final class AppModel {
    // MARK: - Data
    var events: [Event] = []
    var danceStyles: [DanceStyle] = []
    var schengenCountries: Set<String> = []
    var trips: [Trip] = []
    var reviews: [Review] = []

    // MARK: - Auth
    var authService = AuthService()
    var isSignedIn: Bool { authService.session != nil }
    var currentUserId: String? { authService.session?.userId }

    // MARK: - UI State
    var selectedTab: Tab = .calendar
    var searchQuery: String = ""
    var isLoading: Bool = false
    var appError: AppError?          // surfaced to RootView alert; set via setError(_:)

    func setError(_ error: AppError) {
        appError = error
    }

    // Event list filters
    var eventSortOption: EventSortOption = .date
    var showHistoricalEvents: Bool = false
    var filterYear: String = ""
    var filterMonth: String = ""
    var filterCountry: String = ""
    var filterSize: String = ""

    // Calendar
    var selectedYearMonth: String = {
        let today = DateUtils.todayString()
        return String(today.prefix(7))
    }()
    var selectedCalendarDate: String = DateUtils.todayString()

    // Trips filters
    var showHistoricalTrips: Bool = false
    var showSchengenImpactingTrips: Bool = false
    var tripFilterCountry: String = ""
    var tripFilterYear: String = ""
    var tripFilterMonth: String = ""
    var schengenCheckDate: String = DateUtils.todayString()

    // MARK: - Derived
    var flatEvents: [FlatEvent] {
        events.flatMap { event in
            event.editions.map { FlatEvent(id: $0.id, event: event, edition: $0) }
        }
    }

    var reviewedEditionIds: Set<String> {
        Set(reviews.map(\.eventEditionId))
    }

    // MARK: - Services
    let supabase: any SupabaseServiceProtocol

    init(supabase: any SupabaseServiceProtocol = SupabaseService()) {
        self.supabase = supabase
    }

    // MARK: - Load

    func loadPublicData() async {
        isLoading = true
        appError = nil
        do {
            async let eventsTask = supabase.fetchEvents()
            async let stylesTask = supabase.fetchDanceStyles()
            async let schengenTask = supabase.fetchSchengenCountries()
            let (fetchedEvents, fetchedStyles, fetchedSchengen) = try await (eventsTask, stylesTask, schengenTask)
            events = fetchedEvents
            danceStyles = fetchedStyles
            schengenCountries = Set(fetchedSchengen.filter(\.isSchengen).map(\.countryName))
        } catch {
            setError(.loadFailed(error.localizedDescription))
        }
        isLoading = false
    }

    func loadPrivateData() async {
        guard let token = authService.session?.accessToken else { return }
        do {
            async let tripsTask = supabase.fetchTrips(token: token)
            async let reviewsTask = supabase.fetchReviews(token: token)
            let (fetchedTrips, fetchedReviews) = try await (tripsTask, reviewsTask)
            trips = fetchedTrips
            reviews = fetchedReviews
        } catch is SupabaseService.AuthError {
            // Token expired — clear session so sign-in sheet reappears
            setError(.authExpired)
            signOut()
        } catch {
            setError(.loadFailed(error.localizedDescription))
        }
    }

    func signIn(email: String, password: String) async throws {
        try await authService.signIn(email: email, password: password)
        await loadPrivateData()
    }

    func signOut() {
        authService.signOut()
        trips = []
        reviews = []
    }
}
