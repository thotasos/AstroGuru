'use client';

import useSWR from 'swr';
import {
  getProfile,
  getAllProfiles,
  fetchChart,
  fetchDashas,
  fetchYogas,
  fetchShadbala,
  fetchAshtakavarga,
  fetchPredictions,
  getEvents,
  type Profile,
  type MahadashaGroup,
  type DashaInfo,
  type YogaResult,
  type ShadbalaResult,
  type AshtakavargaData,
  type LifeEvent,
  type PredictionsResponse,
} from './api';

// ============================================================
// Profiles
// ============================================================

export function useProfiles() {
  const { data, error, isLoading, mutate } = useSWR<Profile[]>(
    'profiles',
    () => getAllProfiles(),
    { revalidateOnFocus: false },
  );

  return {
    profiles: data ?? [],
    isLoading,
    error,
    mutate,
  };
}

export function useProfile(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Profile>(
    id ? `profiles/${id}` : null,
    () => getProfile(id!),
    { revalidateOnFocus: false },
  );

  return {
    profile: data,
    isLoading,
    error,
    mutate,
  };
}

// ============================================================
// Chart
// ============================================================

export function useChart(profileId: string | null, varga = 'D1') {
  const { data, error, isLoading } = useSWR(
    profileId ? `chart/${profileId}/${varga}` : null,
    () => fetchChart(profileId!, varga),
    { revalidateOnFocus: false },
  );

  return {
    chart: data,
    isLoading,
    error,
  };
}

// ============================================================
// Dashas
// ============================================================

export function useDashas(profileId: string | null) {
  const { data, error, isLoading } = useSWR<{
    current: DashaInfo;
    mahadashas: MahadashaGroup[];
  }>(
    profileId ? `dashas/${profileId}` : null,
    () => fetchDashas(profileId!),
    { revalidateOnFocus: false },
  );

  const now = new Date();

  // Find which mahadasha period contains today
  const currentMahadasha = data?.mahadashas.find(
    (md) => new Date(md.startDate) <= now && new Date(md.endDate) > now,
  );

  return {
    dashas: data,
    currentMahadasha,
    isLoading,
    error,
  };
}

// ============================================================
// Yogas
// ============================================================

export function useYogas(profileId: string | null) {
  const { data, error, isLoading } = useSWR<YogaResult[]>(
    profileId ? `yogas/${profileId}` : null,
    () => fetchYogas(profileId!),
    { revalidateOnFocus: false },
  );

  const active = data?.filter((y) => y.isPresent) ?? [];
  const inactive = data?.filter((y) => !y.isPresent) ?? [];

  return {
    yogas: data ?? [],
    activeYogas: active,
    inactiveYogas: inactive,
    isLoading,
    error,
  };
}

// ============================================================
// Shadbala
// ============================================================

export function useShadbala(profileId: string | null) {
  const { data, error, isLoading } = useSWR<ShadbalaResult[]>(
    profileId ? `shadbala/${profileId}` : null,
    () => fetchShadbala(profileId!),
    { revalidateOnFocus: false },
  );

  return {
    shadbala: data ?? [],
    isLoading,
    error,
  };
}

// ============================================================
// Ashtakavarga
// ============================================================

export function useAshtakavarga(profileId: string | null) {
  const { data, error, isLoading } = useSWR<AshtakavargaData>(
    profileId ? `ashtakavarga/${profileId}` : null,
    () => fetchAshtakavarga(profileId!),
    { revalidateOnFocus: false },
  );

  return {
    ashtakavarga: data,
    isLoading,
    error,
  };
}

// ============================================================
// Life Events
// ============================================================

export function useEvents(profileId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<LifeEvent[]>(
    profileId ? `events/${profileId}` : null,
    () => getEvents(profileId!),
    { revalidateOnFocus: false },
  );

  const sorted = [...(data ?? [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return {
    events: sorted,
    isLoading,
    error,
    mutate,
  };
}

// ============================================================
// Predictions
// ============================================================

export function usePredictions(
  profileId: string | null,
  options?: {
    startDate?: string;
    endDate?: string;
    level?: 1 | 2 | 3 | 4 | 5;
  }
) {
  const key = profileId ? `predictions/${profileId}/${options?.level ?? 1}` : null;

  const { data, error, isLoading } = useSWR<PredictionsResponse>(
    key,
    () => fetchPredictions(profileId!, options),
    { revalidateOnFocus: false },
  );

  // Group periods by mahadasha for timeline view
  const mahadashaPeriods = data?.periods.filter(p => p.level === 1) ?? [];

  // Current period (most recent past or present)
  const now = new Date();
  const currentPeriod = data?.periods.find(p => {
    const start = new Date(p.startDate);
    const end = new Date(p.endDate);
    return start <= now && end >= now;
  });

  return {
    predictions: data,
    mahadashaPeriods,
    currentPeriod,
    isLoading,
    error,
  };
}
