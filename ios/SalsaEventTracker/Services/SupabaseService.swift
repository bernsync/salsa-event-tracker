// ios/SalsaEventTracker/Services/SupabaseService.swift
import Foundation

actor SupabaseService: SupabaseServiceProtocol {
    private let baseURL: URL
    private let anonKey: String
    private let session: URLSession

    init(baseURL: URL = SupabaseConfig.url, anonKey: String = SupabaseConfig.anonKey) {
        self.baseURL = baseURL
        self.anonKey = anonKey
        self.session = URLSession.shared
    }

    // MARK: - Public

    func fetchEvents() async throws -> [Event] {
        let url = baseURL.appending(path: "/rest/v1/events")
            .appending(queryItems: [
                URLQueryItem(name: "select", value: "*,event_editions(*)"),
                URLQueryItem(name: "visibility", value: "eq.public")
            ])
        return try await get(url: url, token: nil)
    }

    func fetchDanceStyles() async throws -> [DanceStyle] {
        let url = baseURL.appending(path: "/rest/v1/dance_styles")
            .appending(queryItems: [URLQueryItem(name: "select", value: "name,slug,is_active,sort_order")])
        return try await get(url: url, token: nil)
    }

    func fetchSchengenCountries() async throws -> [SchengenCountryRow] {
        let url = baseURL.appending(path: "/rest/v1/schengen_countries")
            .appending(queryItems: [URLQueryItem(name: "select", value: "country_name,is_schengen")])
        return try await get(url: url, token: nil)
    }

    // MARK: - Authenticated

    func fetchTrips(token: String) async throws -> [Trip] {
        let url = baseURL.appending(path: "/rest/v1/personal_trips")
            .appending(queryItems: [
                URLQueryItem(name: "select", value: "*,personal_trip_places(*),personal_pto_days(*)")
            ])
        return try await get(url: url, token: token)
    }

    func fetchReviews(token: String) async throws -> [Review] {
        let url = baseURL.appending(path: "/rest/v1/reviews")
            .appending(queryItems: [URLQueryItem(name: "select", value: "*")])
        return try await get(url: url, token: token)
    }

    func createTrip(_ body: [String: Any], token: String) async throws -> Trip {
        let url = baseURL.appending(path: "/rest/v1/personal_trips")
        return try await post(url: url, body: body, token: token)
    }

    func updateTrip(id: String, body: [String: Any], token: String) async throws {
        let url = baseURL.appending(path: "/rest/v1/personal_trips")
            .appending(queryItems: [URLQueryItem(name: "id", value: "eq.\(id)")])
        try await patch(url: url, body: body, token: token)
    }

    func deleteTrip(id: String, token: String) async throws {
        let url = baseURL.appending(path: "/rest/v1/personal_trips")
            .appending(queryItems: [URLQueryItem(name: "id", value: "eq.\(id)")])
        try await delete(url: url, token: token)
    }

    func replaceTripPlaces(tripId: String, places: [[String: Any]], token: String) async throws {
        let delURL = baseURL.appending(path: "/rest/v1/personal_trip_places")
            .appending(queryItems: [URLQueryItem(name: "trip_id", value: "eq.\(tripId)")])
        try await delete(url: delURL, token: token)
        if !places.isEmpty {
            let insURL = baseURL.appending(path: "/rest/v1/personal_trip_places")
            try await postMany(url: insURL, body: places, token: token)
        }
    }

    func replacePTODays(tripId: String, ptoDays: [[String: Any]], token: String) async throws {
        let delURL = baseURL.appending(path: "/rest/v1/personal_pto_days")
            .appending(queryItems: [URLQueryItem(name: "trip_id", value: "eq.\(tripId)")])
        try await delete(url: delURL, token: token)
        if !ptoDays.isEmpty {
            let insURL = baseURL.appending(path: "/rest/v1/personal_pto_days")
            try await postMany(url: insURL, body: ptoDays, token: token)
        }
    }

    func createReview(_ body: [String: Any], token: String) async throws -> Review {
        let url = baseURL.appending(path: "/rest/v1/reviews")
        return try await post(url: url, body: body, token: token)
    }

    func updateReview(id: String, body: [String: Any], token: String) async throws {
        let url = baseURL.appending(path: "/rest/v1/reviews")
            .appending(queryItems: [URLQueryItem(name: "id", value: "eq.\(id)")])
        try await patch(url: url, body: body, token: token)
    }

    func deleteReview(id: String, token: String) async throws {
        let url = baseURL.appending(path: "/rest/v1/reviews")
            .appending(queryItems: [URLQueryItem(name: "id", value: "eq.\(id)")])
        try await delete(url: url, token: token)
    }

    // MARK: - Private helpers

    private func headers(token: String?) -> [String: String] {
        var h = ["apikey": anonKey, "Content-Type": "application/json"]
        if let t = token { h["Authorization"] = "Bearer \(t)" }
        return h
    }

    private func get<T: Decodable>(url: URL, token: String?) async throws -> T {
        var req = URLRequest(url: url)
        headers(token: token).forEach { req.setValue($1, forHTTPHeaderField: $0) }
        let (data, resp) = try await session.data(for: req)
        try checkStatus(resp, data: data)
        return try JSONDecoder().decode(T.self, from: data)
    }

    private func post<T: Decodable>(url: URL, body: [String: Any], token: String) async throws -> T {
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        var h = headers(token: token); h["Prefer"] = "return=representation"
        h.forEach { req.setValue($1, forHTTPHeaderField: $0) }
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, resp) = try await session.data(for: req)
        try checkStatus(resp, data: data)
        // Supabase returns an array; take first
        let arr = try JSONDecoder().decode([T].self, from: data)
        guard let first = arr.first else { throw URLError(.badServerResponse) }
        return first
    }

    private func postMany(url: URL, body: [[String: Any]], token: String) async throws {
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        headers(token: token).forEach { req.setValue($1, forHTTPHeaderField: $0) }
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, resp) = try await session.data(for: req)
        try checkStatus(resp, data: data)
    }

    private func patch(url: URL, body: [String: Any], token: String) async throws {
        var req = URLRequest(url: url)
        req.httpMethod = "PATCH"
        headers(token: token).forEach { req.setValue($1, forHTTPHeaderField: $0) }
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, resp) = try await session.data(for: req)
        try checkStatus(resp, data: data)
    }

    private func delete(url: URL, token: String) async throws {
        var req = URLRequest(url: url)
        req.httpMethod = "DELETE"
        headers(token: token).forEach { req.setValue($1, forHTTPHeaderField: $0) }
        let (_, resp) = try await session.data(for: req)
        try checkStatus(resp, data: nil)
    }

    private func checkStatus(_ response: URLResponse, data: Data?) throws {
        guard let http = response as? HTTPURLResponse,
              (200...299).contains(http.statusCode) else {
            if (response as? HTTPURLResponse)?.statusCode == 401 {
                throw ServiceAuthError.tokenExpired
            }
            let msg = data.flatMap { String(data: $0, encoding: .utf8) } ?? "Unknown error"
            throw NSError(domain: "SupabaseService", code: (response as? HTTPURLResponse)?.statusCode ?? 0,
                          userInfo: [NSLocalizedDescriptionKey: msg])
        }
    }
}

// Helper row type (not a full model — only used inside SupabaseService → AppModel)
struct SchengenCountryRow: Codable {
    let countryName: String
    let isSchengen: Bool
    enum CodingKeys: String, CodingKey {
        case countryName = "country_name"
        case isSchengen = "is_schengen"
    }
}

extension SchengenCountryRow {
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        countryName = try c.decode(String.self, forKey: .countryName)
        isSchengen = (try? c.decode(Bool.self, forKey: .isSchengen)) ?? false
    }
}
