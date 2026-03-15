'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Check,
  Search,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { createProfile, searchLocation, type GeocodeSuggestion } from '@/lib/api';
import { debounce } from '@/lib/utils';

// ============================================================
// Types
// ============================================================

interface FormData {
  name: string;
  date: string;
  time: string;
  seconds: string;
  locationName: string;
  latitude: string;
  longitude: string;
  timezone: string;
  ayanamsaId: string;
}

interface FormErrors {
  name?: string;
  date?: string;
  time?: string;
  location?: string;
}

// ============================================================
// DST Warning Detection
// ============================================================

function isDSTEdge(dateStr: string, timeStr: string): boolean {
  if (!dateStr || !timeStr) return false;
  const [h, m] = timeStr.split(':').map(Number);
  if (h === undefined || m === undefined) return false;
  // DST changes typically happen at 2:00 AM
  const hoursFromMidnight = h + m / 60;
  const isNearMidnight = hoursFromMidnight < 0.5 || hoursFromMidnight > 23.5;
  const isNearDSTChange = Math.abs(hoursFromMidnight - 2) < 1;
  return isNearMidnight || isNearDSTChange;
}

// ============================================================
// Step Indicator
// ============================================================

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 ${
              i + 1 < step
                ? 'bg-gold-500 text-stone-950'
                : i + 1 === step
                ? 'bg-gold-500/20 border border-gold-500 text-gold-400'
                : 'bg-cosmic-elevated border border-cosmic-border text-stone-500'
            }`}
          >
            {i + 1 < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className={`h-px w-12 transition-all duration-300 ${
                i + 1 < step ? 'bg-gold-500' : 'bg-cosmic-border'
              }`}
            />
          )}
        </div>
      ))}
      <span className="text-xs text-stone-500 ml-2">
        Step {step} of {total}
      </span>
    </div>
  );
}

// ============================================================
// Location Autocomplete
// ============================================================

function LocationSearch({
  value,
  onSelect,
  error,
}: {
  value: string;
  onSelect: (suggestion: GeocodeSuggestion) => void;
  error?: string;
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(!!value);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(
    debounce(async (q: string) => {
      if (q.length < 2) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const results = await searchLocation(q);
        setSuggestions(results.slice(0, 6));
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350) as (q: string) => void,
    [],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    setSelected(false);
    void search(q);
  };

  const handleSelect = (s: GeocodeSuggestion) => {
    setQuery(s.display_name);
    setSelected(true);
    setOpen(false);
    setSuggestions([]);
    onSelect(s);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-stone-300 mb-1.5">
        Birth Location
      </label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Search city, country..."
          className={`input-base pl-10 pr-10 ${error ? 'border-red-500/50 focus:ring-red-500' : ''}`}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 animate-spin" />
        )}
        {selected && !loading && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
        )}
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-cosmic-elevated border border-cosmic-border rounded-xl shadow-2xl overflow-hidden">
          {suggestions.map((s) => (
            <button
              key={s.place_id}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-cosmic-surface transition-colors duration-100 cursor-pointer border-b border-cosmic-border last:border-0"
            >
              <MapPin className="w-4 h-4 text-stone-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-stone-200 truncate">{s.display_name}</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {parseFloat(s.lat).toFixed(4)}°, {parseFloat(s.lon).toFixed(4)}°
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main Form
// ============================================================

export function ProfileForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    name: '',
    date: '',
    time: '',
    seconds: '00',
    locationName: '',
    latitude: '',
    longitude: '',
    timezone: '',
    ayanamsaId: 'Lahiri',
  });

  const setField = (key: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const dstWarning = isDSTEdge(form.date, form.time);

  // Step 1 validation
  const validateStep1 = (): boolean => {
    const errs: FormErrors = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.date) errs.date = 'Date of birth is required';
    if (!form.time) errs.time = 'Birth time is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 2 validation
  const validateStep2 = (): boolean => {
    const errs: FormErrors = {};
    if (!form.latitude || !form.longitude) {
      errs.location = 'Please select a location from the suggestions';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleLocationSelect = (s: GeocodeSuggestion) => {
    const tzOffset = s.timezone ?? '0';
    setForm((prev) => ({
      ...prev,
      locationName: s.display_name,
      latitude: s.lat,
      longitude: s.lon,
      timezone: tzOffset,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    setApiError(null);

    try {
      const secs = form.seconds.padStart(2, '0');
      const localDateTime = `${form.date}T${form.time}:${secs}`;
      const tzH = parseFloat(form.timezone);
      const tzSign = tzH >= 0 ? '+' : '-';
      const tzAbs = Math.abs(tzH);
      const tzHH = Math.floor(tzAbs).toString().padStart(2, '0');
      const tzMM = Math.round((tzAbs % 1) * 60).toString().padStart(2, '0');
      const dateOfBirth = `${localDateTime}${tzSign}${tzHH}:${tzMM}`;

      const profile = await createProfile({
        name: form.name.trim(),
        dateOfBirth,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        timezone: tzH,
        locationName: form.locationName,
        ayanamsaId: form.ayanamsaId,
      });

      router.push(`/profile/${profile.id}`);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <StepIndicator step={step} total={2} />

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <Card padding="lg" className="animate-slide-up">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
                <User className="w-4 h-4 text-gold-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-stone-50">Birth Details</h2>
                <p className="text-xs text-stone-400">Name, date, and exact time of birth</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="e.g. Ramanujan Srinivasa"
                  className={`input-base ${errors.name ? 'border-red-500/50 focus:ring-red-500' : ''}`}
                  autoFocus
                />
                {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setField('date', e.target.value)}
                  className={`input-base ${errors.date ? 'border-red-500/50 focus:ring-red-500' : ''}`}
                  max={new Date().toISOString().split('T')[0]}
                />
                {errors.date && <p className="text-xs text-red-400 mt-1">{errors.date}</p>}
              </div>

              {/* Time + Seconds */}
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Birth Time
                  <span className="text-xs text-stone-500 font-normal">(include seconds for precision)</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="time"
                      value={form.time}
                      onChange={(e) => setField('time', e.target.value)}
                      className={`input-base ${errors.time ? 'border-red-500/50 focus:ring-red-500' : ''}`}
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={form.seconds}
                      onChange={(e) => setField('seconds', e.target.value)}
                      placeholder="SS"
                      className="input-base text-center"
                      title="Seconds"
                    />
                  </div>
                </div>
                {errors.time && <p className="text-xs text-red-400 mt-1">{errors.time}</p>}
                <p className="text-xs text-stone-600 mt-1">HH:MM : SS (seconds column)</p>
              </div>

              {/* DST Warning */}
              {dstWarning && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-400">DST Edge Case Warning</p>
                    <p className="text-xs text-amber-300/70 mt-1">
                      Birth time near midnight or 2:00 AM may fall on a DST changeover boundary.
                      Verify the correct UTC offset from historical records for this date and location.
                    </p>
                  </div>
                </div>
              )}

              {/* Ayanamsa */}
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1.5">
                  Ayanamsa System
                </label>
                <div className="flex gap-2">
                  {(['Lahiri', 'Raman', 'KP'] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setField('ayanamsaId', a)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer border ${
                        form.ayanamsaId === a
                          ? 'bg-gold-500/15 border-gold-500/40 text-gold-400'
                          : 'border-cosmic-border text-stone-400 hover:border-stone-500 hover:text-stone-300'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button
                type="button"
                variant="primary"
                onClick={handleNext}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Continue
              </Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card padding="lg" className="animate-slide-up">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-gold-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-stone-50">Birth Location</h2>
                <p className="text-xs text-stone-400">City or town of birth for correct house calculation</p>
              </div>
            </div>

            <div className="space-y-5">
              <LocationSearch
                value={form.locationName}
                onSelect={handleLocationSelect}
                error={errors.location}
              />

              {/* Confirmation of coordinates */}
              {form.latitude && form.longitude && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium text-emerald-400 mb-1">Location confirmed</p>
                    <p className="text-stone-400">
                      Lat: {parseFloat(form.latitude).toFixed(6)}° ·{' '}
                      Lon: {parseFloat(form.longitude).toFixed(6)}°
                    </p>
                    {form.timezone && (
                      <p className="text-stone-500 mt-0.5">
                        UTC offset: {parseFloat(form.timezone) >= 0 ? '+' : ''}{form.timezone}h
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="p-4 rounded-lg bg-cosmic-elevated border border-cosmic-border">
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-3">
                  Chart Summary
                </p>
                <div className="space-y-2">
                  {[
                    { label: 'Name', value: form.name },
                    { label: 'Date', value: form.date },
                    { label: 'Time', value: form.time ? `${form.time}:${form.seconds}` : '—' },
                    { label: 'Ayanamsa', value: form.ayanamsaId },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span className="text-stone-500">{label}</span>
                      <span className="text-stone-300 font-medium">{value || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* API Error */}
              {apiError && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{apiError}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(1)}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={!form.latitude || !form.longitude}
              >
                Calculate Chart
              </Button>
            </div>
          </Card>
        )}
      </form>
    </div>
  );
}
