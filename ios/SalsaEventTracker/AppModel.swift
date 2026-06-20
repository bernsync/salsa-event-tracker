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

    // MARK: - Derived (memoized)
    //
    // `flatEvents` and `attendingEditionIds` are read many times per render (each
    // list view recomputes several filter/option properties off them). They are
    // memoized against a token that is bumped only when `events` / `trips` change,
    // so repeated reads in one render pass are O(1). The getters still read the
    // backing stored property so SwiftUI observation continues to track changes.

    @ObservationIgnored private var flatEventsCache: [FlatEvent]?
    @ObservationIgnored private var flatEventsToken = 0
    @ObservationIgnored private var flatEventsCachedToken = -1

    var flatEvents: [FlatEvent] {
        let snapshot = events  // read to register the observation dependency
        if let cache = flatEventsCache, flatEventsCachedToken == flatEventsToken {
            return cache
        }
        let computed = snapshot.flatMap { event in
            event.editions.map { FlatEvent(id: $0.id, event: event, edition: $0) }
        }
        flatEventsCache = computed
        flatEventsCachedToken = flatEventsToken
        return computed
    }

    @ObservationIgnored private var attendingCache: Set<String>?
    @ObservationIgnored private var attendingToken = 0
    @ObservationIgnored private var attendingCachedToken = -1

    /// Edition IDs the user has a trip place for. Built once per `trips` change.
    var attendingEditionIds: Set<String> {
        let snapshot = trips  // read to register the observation dependency
        if let cache = attendingCache, attendingCachedToken == attendingToken {
            return cache
        }
        var ids = Set<String>()
        for trip in snapshot {
            for place in trip.places {
                if let editionId = place.eventEditionId { ids.insert(editionId) }
            }
        }
        attendingCache = ids
        attendingCachedToken = attendingToken
        return ids
    }

    func isAttending(editionId: String) -> Bool {
        guard isSignedIn else { return false }
        return attendingEditionIds.contains(editionId)
    }

    /// Call whenever `events` is replaced so `flatEvents` recomputes.
    private func invalidateFlatEvents() { flatEventsToken &+= 1 }

    /// Call whenever `trips` is replaced so `attendingEditionIds` recomputes.
    private func invalidateAttending() { attendingToken &+= 1 }

    func tripPlacesOn(_ dateStr: String) -> [(place: TripPlace, trip: Trip)] {
        return trips.flatMap { trip in
            trip.places
                .filter { $0.startDate <= dateStr && $0.endDate >= dateStr }
                .map { (place: $0, trip: trip) }
        }.sorted {
            if $0.place.startDate != $1.place.startDate { return $0.place.startDate < $1.place.startDate }
            return ($0.place.sequence ?? Int.max) < ($1.place.sequence ?? Int.max)
        }
    }

    func ptoDaysOn(_ dateStr: String) -> [(ptoDay: PTODay, trip: Trip)] {
        return trips.flatMap { trip in
            trip.ptoDays
                .filter { $0.ptoDate == dateStr }
                .map { (ptoDay: $0, trip: trip) }
        }
    }

    // MARK: - Services
    let supabase: any SupabaseServiceProtocol
    private let publicDataCache: PublicDataCache?

    init(supabase: any SupabaseServiceProtocol = SupabaseService(),
         authService: (any AuthServiceProtocol)? = nil,
         publicDataCache: PublicDataCache? = .shared) {
        self.supabase = supabase
        self.authService = authService ?? AuthService()
        self.publicDataCache = publicDataCache
    }

    // MARK: - Load

    // Reference-counted so concurrent loads (e.g. launch public load + a Trips
    // pull-to-refresh) don't flip `isLoading` off early or clobber each other's
    // error. `appError` is cleared only when the first concurrent load begins.
    @ObservationIgnored private var loadingCount = 0

    private func beginLoading() {
        if loadingCount == 0 { appError = nil }
        loadingCount += 1
        isLoading = true
    }

    private func endLoading() {
        loadingCount = max(0, loadingCount - 1)
        if loadingCount == 0 { isLoading = false }
    }

    func loadPublicData() async {
        beginLoading()
        defer { endLoading() }
        var loadedFromCache = false
        if let publicDataCache, let cached = await publicDataCache.load() {
            applyPublicData(events: cached.events, danceStyles: cached.danceStyles, schengenRows: cached.schengenCountries)
            loadedFromCache = true
        }
        do {
            async let eventsTask = supabase.fetchEvents()
            async let stylesTask = supabase.fetchDanceStyles()
            async let schengenTask = supabase.fetchSchengenCountries()
            let (fetchedEvents, fetchedStyles, fetchedSchengen) = try await (eventsTask, stylesTask, schengenTask)
            applyPublicData(events: fetchedEvents, danceStyles: fetchedStyles, schengenRows: fetchedSchengen)
            if let publicDataCache {
                await publicDataCache.save(PublicDataSnapshot(
                    events: fetchedEvents,
                    danceStyles: fetchedStyles,
                    schengenCountries: fetchedSchengen,
                    savedAt: Date()
                ))
            }
        } catch {
            if !loadedFromCache {
                setError(.loadFailed("[Public] \(Self.decodeDetail(error))"))
            }
        }
    }

    private func applyPublicData(events: [Event], danceStyles: [DanceStyle], schengenRows: [SchengenCountryRow]) {
        self.events = events
        self.danceStyles = danceStyles
        self.schengenCountries = Set(schengenRows.filter(\.isSchengen).map(\.countryName))
        invalidateFlatEvents()
    }

    func loadPrivateData() async {
        guard authService.session != nil else { return }
        beginLoading()
        defer { endLoading() }
        do {
            // Refreshes the access token transparently if it has expired.
            let token = try await authService.validAccessToken()
            trips = try await supabase.fetchTrips(token: token)
            invalidateAttending()
        } catch is ServiceAuthError {
            // No valid session / refresh failed — clear session so sign-in reappears
            setError(.authExpired)
            signOut()
        } catch {
            setError(.loadFailed("[Private] \(Self.decodeDetail(error))"))
        }
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
        invalidateAttending()
    }
}

struct PublicDataSnapshot: Codable {
    let events: [Event]
    let danceStyles: [DanceStyle]
    let schengenCountries: [SchengenCountryRow]
    let savedAt: Date
}

actor PublicDataCache {
    static let shared = PublicDataCache()

    private var cacheURL: URL? {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first?
            .appendingPathComponent("salsa-events-public-cache.json")
    }

    func load() -> PublicDataSnapshot? {
        guard let cacheURL, let data = try? Data(contentsOf: cacheURL) else { return nil }
        return try? JSONDecoder().decode(PublicDataSnapshot.self, from: data)
    }

    func save(_ snapshot: PublicDataSnapshot) {
        guard let cacheURL else { return }
        do {
            try FileManager.default.createDirectory(
                at: cacheURL.deletingLastPathComponent(),
                withIntermediateDirectories: true
            )
            let data = try JSONEncoder().encode(snapshot)
            // `.complete`: the cache is only ever read in the foreground, so it can
            // stay encrypted-at-rest whenever the device is locked.
            try data.write(to: cacheURL, options: [.atomic, .completeFileProtection])
            try? (cacheURL as NSURL).setResourceValue(
                URLFileProtection.complete,
                forKey: .fileProtectionKey
            )
            var excludedURL = cacheURL
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            try? excludedURL.setResourceValues(values)
        } catch {
            // Public cache failures should never block live app data.
        }
    }
}
