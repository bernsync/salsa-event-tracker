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
    var authService: any AuthServiceProtocol
    var isSignedIn: Bool { authService.session != nil }
    var currentUserId: String? { authService.session?.userId }

    // MARK: - UI State
    var selectedTab: Tab = .calendar
    var searchQuery: String = ""
    var isLoading: Bool = false
    var appError: AppError?          // surfaced to RootView alert; set via setError(_:)
    var showLogin: Bool = false

    func setError(_ error: AppError) {
        appError = error
    }

    // Event list (Calendar List tab) filters
    var eventSortOption: EventSortOption = .date
    var showHistoricalEvents: Bool = false
    var filterYear: String = ""
    var filterMonth: String = ""
    var filterCountry: String = ""
    var filterSize: String = ""

    // Festival list (Event List tab) filters
    var festivalFilterYear: String = ""
    var festivalFilterMonth: String = ""
    var festivalFilterCountry: String = ""
    var festivalFilterSize: String = ""

    // Calendar
    var selectedYearMonth: String = {
        let today = DateUtils.todayString()
        return String(today.prefix(7))
    }()
    var selectedCalendarDate: String = DateUtils.todayString()
    // Calendar filters (matching web app toggles)
    var calendarAttendedOnly: Bool = false
    var calendarHideDuplicateAttended: Bool = false

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

    func isAttending(editionId: String) -> Bool {
        guard isSignedIn else { return false }
        return trips.contains { $0.places.contains { $0.eventEditionId == editionId } }
    }

    func reviewScore(for flat: FlatEvent) -> Double? {
        guard !reviews.isEmpty else { return nil }
        let relevant: [Review]
        if flat.edition.isHistorical {
            relevant = reviews.filter { $0.eventEditionId == flat.edition.id }
        } else {
            let normalizedName = flat.event.name.lowercased()
            let priorIds = Set(
                events
                    .filter { $0.name.lowercased() == normalizedName }
                    .flatMap { $0.editions }
                    .filter { $0.endDate < flat.edition.startDate }
                    .map { $0.id }
            )
            relevant = reviews.filter { priorIds.contains($0.eventEditionId) }
        }
        guard !relevant.isEmpty else { return nil }
        return relevant.reduce(0.0) { $0 + $1.totalScore } / Double(relevant.count)
    }

    func tripPlacesOn(_ dateStr: String) -> [(place: TripPlace, trip: Trip)] {
        guard isSignedIn else { return [] }
        return trips.flatMap { trip in
            trip.places
                .filter { $0.startDate <= dateStr && $0.endDate >= dateStr }
                .map { (place: $0, trip: trip) }
        }.sorted { $0.place.sequence ?? 0 < $1.place.sequence ?? 0 }
    }

    func ptoDaysOn(_ dateStr: String) -> [(ptoDay: PTODay, trip: Trip)] {
        guard isSignedIn else { return [] }
        return trips.flatMap { trip in
            trip.ptoDays
                .filter { $0.ptoDate == dateStr }
                .map { (ptoDay: $0, trip: trip) }
        }
    }

    // MARK: - Services
    let supabase: any SupabaseServiceProtocol

    init(supabase: any SupabaseServiceProtocol = SupabaseService(),
         authService: (any AuthServiceProtocol)? = nil) {
        self.supabase = supabase
        self.authService = authService ?? AuthService()
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
            setError(.loadFailed("[Public] \(Self.decodeDetail(error))"))
        }
        isLoading = false
    }

    func loadPrivateData() async {
        guard let token = authService.session?.accessToken else { return }
        isLoading = true
        appError = nil
        do {
            async let tripsTask = supabase.fetchTrips(token: token)
            async let reviewsTask = supabase.fetchReviews(token: token)
            let (fetchedTrips, fetchedReviews) = try await (tripsTask, reviewsTask)
            trips = fetchedTrips
            reviews = fetchedReviews
        } catch is ServiceAuthError {
            // Token expired — clear session so sign-in sheet reappears
            setError(.authExpired)
            signOut()
        } catch {
            setError(.loadFailed("[Private] \(Self.decodeDetail(error))"))
        }
        isLoading = false
    }

    private static func decodeDetail(_ error: Error) -> String {
        guard let de = error as? DecodingError else {
            return "\(type(of: error)): \(error.localizedDescription)"
        }
        switch de {
        case .keyNotFound(let key, let ctx):
            let path = ctx.codingPath.map(\.stringValue).joined(separator: ".")
            return "key '\(key.stringValue)' not found at '\(path)'"
        case .valueNotFound(_, let ctx):
            let path = ctx.codingPath.map(\.stringValue).joined(separator: ".")
            return "null value at '\(path)'"
        case .typeMismatch(_, let ctx):
            let path = ctx.codingPath.map(\.stringValue).joined(separator: ".")
            return "type mismatch at '\(path)'"
        case .dataCorrupted(let ctx):
            let path = ctx.codingPath.map(\.stringValue).joined(separator: ".")
            return "data corrupted at '\(path)'"
        @unknown default:
            return de.localizedDescription
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
