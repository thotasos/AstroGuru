/**
 * API client for Parashari Precision
 * All calls proxy to /api/* which Next.js rewrites to http://localhost:3001/api/*
 */

// ============================================================
// Types
// ============================================================

// API response types (snake_case from database)
interface ApiProfile {
  id: string;
  name: string;
  dob_utc: string;
  lat: number;
  lon: number;
  timezone: string;
  utc_offset_hours: number;
  place_name: string | null;
  ayanamsa_id: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Frontend types (camelCase)
export interface Profile {
  id: string;
  name: string;
  dateOfBirth: string;   // ISO 8601 UTC
  latitude: number;
  longitude: number;
  timezone: number;
  locationName: string;
  ayanamsaId: string;
  createdAt: string;
  updatedAt: string;
}

// Transform API response to frontend type
function transformProfile(apiProfile: ApiProfile): Profile {
  return {
    id: apiProfile.id,
    name: apiProfile.name,
    dateOfBirth: apiProfile.dob_utc,
    latitude: apiProfile.lat,
    longitude: apiProfile.lon,
    timezone: apiProfile.utc_offset_hours,
    locationName: apiProfile.place_name ?? '',
    ayanamsaId: String(apiProfile.ayanamsa_id),
    createdAt: apiProfile.created_at,
    updatedAt: apiProfile.updated_at,
  };
}

export interface CreateProfilePayload {
  name: string;
  dateOfBirth: string;
  latitude: number;
  longitude: number;
  timezone: number;
  locationName: string;
  ayanamsaId?: string;
}

export interface LifeEvent {
  id: string;
  profileId: string;
  date: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
}

export interface CreateEventPayload {
  profileId: string;
  date: string;
  title: string;
  description?: string;
  category?: string;
}

export interface GeocodeSuggestion {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  timezone?: string;
}

// ============================================================
// HTTP helpers
// ============================================================

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json() as { message?: string; error?: string };
      message = body.message ?? body.error ?? message;
    } catch {
      // ignore parse error
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ============================================================
// Profiles
// ============================================================

export async function getAllProfiles(): Promise<Profile[]> {
  const response = await request<{ data: ApiProfile[] }>('/profiles');
  return response.data.map(transformProfile);
}

export async function getProfile(id: string): Promise<Profile> {
  const response = await request<{ data: ApiProfile }>(`/profiles/${id}`);
  return transformProfile(response.data);
}

export async function createProfile(data: CreateProfilePayload): Promise<Profile> {
  // Transform camelCase to snake_case for API
  const apiData = {
    name: data.name,
    dob_utc: data.dateOfBirth,
    lat: data.latitude,
    lon: data.longitude,
    timezone: String(data.timezone), // API expects IANA timezone string
    utc_offset_hours: data.timezone, // This might be wrong - need to check
    place_name: data.locationName,
    ayanamsa_id: data.ayanamsaId ? parseInt(data.ayanamsaId) : undefined,
  };
  const response = await request<{ data: ApiProfile }>('/profiles', {
    method: 'POST',
    body: JSON.stringify(apiData),
  });
  return transformProfile(response.data);
}

export async function updateProfile(
  id: string,
  data: Partial<CreateProfilePayload>,
): Promise<Profile> {
  // Transform camelCase to snake_case for API
  const apiData: Record<string, unknown> = {};
  if (data.name !== undefined) apiData.name = data.name;
  if (data.dateOfBirth !== undefined) apiData.dob_utc = data.dateOfBirth;
  if (data.latitude !== undefined) apiData.lat = data.latitude;
  if (data.longitude !== undefined) apiData.lon = data.longitude;
  if (data.timezone !== undefined) {
    apiData.timezone = String(data.timezone);
    apiData.utc_offset_hours = data.timezone;
  }
  if (data.locationName !== undefined) apiData.place_name = data.locationName;
  if (data.ayanamsaId !== undefined) apiData.ayanamsa_id = parseInt(data.ayanamsaId);

  const response = await request<{ data: ApiProfile }>(`/profiles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(apiData),
  });
  return transformProfile(response.data);
}

export async function deleteProfile(id: string): Promise<void> {
  return request<void>(`/profiles/${id}`, { method: 'DELETE' });
}

// ============================================================
// Charts
// ============================================================

export async function fetchChart(profileId: string, varga = 'D1'): Promise<unknown> {
  return request('/calculations/chart', {
    method: 'POST',
    body: JSON.stringify({ profile_id: profileId, varga }),
  });
}

export async function fetchVargas(profileId: string): Promise<Record<string, unknown>> {
  return request('/calculations/vargas', {
    method: 'POST',
    body: JSON.stringify({ profile_id: profileId }),
  });
}

// ============================================================
// Dashas
// ============================================================

export interface DashaInfo {
  mahadasha: {
    planet: number;
    startDate: string;
    endDate: string;
    level: 1;
  };
  antardasha: {
    planet: number;
    startDate: string;
    endDate: string;
    level: 2;
  };
  pratyantardasha: {
    planet: number;
    startDate: string;
    endDate: string;
    level: 3;
  };
  sookshma: {
    planet: number;
    startDate: string;
    endDate: string;
    level: 4;
  };
  prana: {
    planet: number;
    startDate: string;
    endDate: string;
    level: 5;
  };
}

export interface MahadashaGroup {
  planet: number;
  startDate: string;
  endDate: string;
  antardashas: {
    planet: number;
    startDate: string;
    endDate: string;
  }[];
}

export async function fetchDashas(profileId: string): Promise<{
  current: DashaInfo;
  mahadashas: MahadashaGroup[];
}> {
  const data = await request<{ data: DashaInfo[] }>('/calculations/dashas', {
    method: 'POST',
    body: JSON.stringify({ profile_id: profileId }),
  });

  // Transform raw array to expected format
  const now = new Date();
  const dashas = data.data;

  // Find current dasha (where now is between mahadasha start and end)
  const current = dashas.find(d => {
    const start = new Date(d.mahadasha.startDate);
    const end = new Date(d.mahadasha.endDate);
    return now >= start && now < end;
  }) ?? dashas[0];

  // Build mahadasha list - take the first entry for each mahadasha planet (that's the start)
  // and collect ALL antardashas for that mahadasha
  const mahadashasMap = new Map<number, MahadashaGroup>();
  const seenMahadashaPlanets = new Set<number>();

  for (const d of dashas) {
    const mdPlanet = d.mahadasha.planet;

    // Only process each mahadasha planet once (first occurrence has correct start/end)
    if (!seenMahadashaPlanets.has(mdPlanet)) {
      seenMahadashaPlanets.add(mdPlanet);
      mahadashasMap.set(mdPlanet, {
        planet: mdPlanet,
        startDate: d.mahadasha.startDate,
        endDate: d.mahadasha.endDate,
        antardashas: [],
      });
    }

    // Add antardasha if not already added
    const md = mahadashasMap.get(mdPlanet)!;
    const adExists = md.antardashas.some(
      ad => ad.planet === d.antardasha.planet && ad.startDate === d.antardasha.startDate
    );
    if (!adExists) {
      md.antardashas.push({
        planet: d.antardasha.planet,
        startDate: d.antardasha.startDate,
        endDate: d.antardasha.endDate,
      });
    }
  }

  // Sort mahadashas by start date
  const mahadashas = Array.from(mahadashasMap.values()).sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  return {
    current,
    mahadashas,
  };
}

// ============================================================
// Yogas
// ============================================================

export interface YogaResult {
  name: string;
  description: string;
  isPresent: boolean;
  planets: number[];
  houses: number[];
  strength: number;
  category: string;
}

export async function fetchYogas(profileId: string): Promise<YogaResult[]> {
  const response = await request<{ data: YogaResult[] }>('/calculations/yogas', {
    method: 'POST',
    body: JSON.stringify({ profile_id: profileId }),
  });
  return response.data;
}

// ============================================================
// Strengths (Shadbala)
// ============================================================

export interface ShadbalaResult {
  planet: number;
  sthanabala: number;
  digbala: number;
  kalabala: number;
  chestabala: number;
  naisargikabala: number;
  drigbala: number;
  total: number;
  totalRupas: number;
  ishtaPhala: number;
  kashtaPhala: number;
}

export async function fetchShadbala(profileId: string): Promise<ShadbalaResult[]> {
  const response = await request<{ data: ShadbalaResult[] }>('/calculations/shadbala', {
    method: 'POST',
    body: JSON.stringify({ profile_id: profileId }),
  });
  return response.data;
}

// ============================================================
// Ashtakavarga
// ============================================================

export interface AshtakavargaData {
  planetBav: Record<number, number[]>;
  sav: number[];
}

export async function fetchAshtakavarga(profileId: string): Promise<AshtakavargaData> {
  const response = await request<{ data: AshtakavargaData }>('/calculations/ashtakavarga', {
    method: 'POST',
    body: JSON.stringify({ profile_id: profileId }),
  });
  return response.data;
}

// ============================================================
// Life Events
// ============================================================

export async function getEvents(profileId: string): Promise<LifeEvent[]> {
  const response = await request<{ data: LifeEvent[] }>(`/events/${profileId}`);
  return response.data;
}

export async function createEvent(data: CreateEventPayload): Promise<LifeEvent> {
  const response = await request<{ data: LifeEvent }>(`/events/${data.profileId}`, {
    method: 'POST',
    body: JSON.stringify({
      event_date: data.date,
      title: data.title,
      description: data.description,
      category: data.category,
    }),
  });
  return response.data;
}

export async function updateEvent(
  id: string,
  data: Partial<CreateEventPayload>,
): Promise<LifeEvent> {
  return request(`/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteEvent(id: string): Promise<void> {
  return request<void>(`/events/${id}`, { method: 'DELETE' });
}

// ============================================================
// Geocode
// ============================================================

export async function searchLocation(query: string): Promise<GeocodeSuggestion[]> {
  const params = new URLSearchParams({ q: query });
  const response = await request<{ data: Array<{ place_name: string; lat: number; lon: number; timezone?: string; utc_offset_hours: number }> }>(`/geocode/search?${params.toString()}`);
  return response.data.map(s => ({
    place_id: '',
    display_name: s.place_name,
    lat: String(s.lat),
    lon: String(s.lon),
    timezone: s.timezone,
  }));
}

// ============================================================
// Predictions
// ============================================================

export interface PredictionPeriod {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  activePlanet: number;
  subPlanet?: number;
  startDate: string;
  endDate: string;
  summary: string;
  keyInfluences: string[];
  activeYogas: string[];
  planetStrength: 'strong' | 'weak' | 'moderate';
  houseAffected: number;
  signPosition: number;
}

export interface PredictionsResponse {
  periods: PredictionPeriod[];
  startDate: string;
  endDate: string;
  level: number;
}

export async function fetchPredictions(
  profileId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    level?: 1 | 2 | 3 | 4 | 5;
  }
): Promise<PredictionsResponse> {
  const body: Record<string, unknown> = { profile_id: profileId };
  if (options?.startDate) body.start_date = options.startDate;
  if (options?.endDate) body.end_date = options.endDate;
  if (options?.level) body.level = options.level;

  const response = await request<{ data: PredictionsResponse }>('/calculations/predictions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return response.data;
}
