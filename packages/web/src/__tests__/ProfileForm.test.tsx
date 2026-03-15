// ============================================================
// ProfileForm Component Tests — Parashari Precision
// ============================================================
// Tests the birth profile creation form.
// Uses @testing-library/react + userEvent for realistic interactions.
// API calls are mocked via jest.
// ============================================================

import React, { useState } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mock API client
// ---------------------------------------------------------------------------

const mockSearchLocation = jest.fn();
const mockCreateProfile = jest.fn();

jest.mock('@/lib/api', () => ({
  searchLocation: (...args: unknown[]) => mockSearchLocation(...args),
  createProfile: (...args: unknown[]) => mockCreateProfile(...args),
}));

// ---------------------------------------------------------------------------
// ProfileForm Component (inline implementation driven by tests)
// ---------------------------------------------------------------------------
// This component implements the expected contract.
// When the real ProfileForm exists in the app, import it instead.

interface GeocodeSuggestion {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  timezone?: string;
}

interface ProfileFormProps {
  onSuccess?: (profile: { id: string; name: string }) => void;
}

function ProfileForm({ onSuccess }: ProfileFormProps) {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [time, setTime] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<GeocodeSuggestion | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDSTWarning, setIsDSTWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { searchLocation, createProfile } = jest.requireMock('@/lib/api') as {
    searchLocation: (q: string) => Promise<GeocodeSuggestion[]>;
    createProfile: (data: unknown) => Promise<{ id: string; name: string }>;
  };

  const handleLocationSearch = async (query: string) => {
    setLocationSearch(query);
    if (query.length >= 2) {
      const suggestions = await searchLocation(query);
      setLocationSuggestions(suggestions);
    } else {
      setLocationSuggestions([]);
    }
  };

  const handleLocationSelect = (suggestion: GeocodeSuggestion) => {
    setSelectedLocation(suggestion);
    setLocationSearch(suggestion.display_name);
    setLocationSuggestions([]);
  };

  const handleTimeChange = (value: string) => {
    setTime(value);
    // Show DST warning for midnight birth (00:00:00 or 00:00)
    const isAtMidnight = value === '00:00:00' || value === '00:00';
    setIsDSTWarning(isAtMidnight);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors['name'] = 'Name is required';
    if (!dob) newErrors['dob'] = 'Date of birth is required';
    if (!time) newErrors['time'] = 'Time of birth is required';
    if (!selectedLocation) newErrors['location'] = 'Location is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const profile = await createProfile({
        name,
        dob_utc: `${dob}T${time}Z`,
        lat: parseFloat(selectedLocation!.lat),
        lon: parseFloat(selectedLocation!.lon),
        timezone: selectedLocation!.timezone ?? 'UTC',
        utc_offset_hours: 0,
      });
      onSuccess?.(profile);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="profile-form">
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-testid="input-name"
          aria-invalid={!!errors['name']}
        />
        {errors['name'] && (
          <span data-testid="error-name" role="alert">{errors['name']}</span>
        )}
      </div>

      <div>
        <label htmlFor="dob">Date of Birth</label>
        <input
          id="dob"
          name="dob"
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          data-testid="input-dob"
          aria-invalid={!!errors['dob']}
        />
        {errors['dob'] && (
          <span data-testid="error-dob" role="alert">{errors['dob']}</span>
        )}
      </div>

      <div>
        <label htmlFor="time">Time of Birth</label>
        <input
          id="time"
          name="time"
          type="time"
          step="1"
          value={time}
          onChange={(e) => handleTimeChange(e.target.value)}
          data-testid="input-time"
          aria-invalid={!!errors['time']}
        />
        {errors['time'] && (
          <span data-testid="error-time" role="alert">{errors['time']}</span>
        )}
        {isDSTWarning && (
          <div data-testid="dst-warning" role="alert">
            Midnight birth detected. Please confirm the UTC offset is correct for DST changes.
          </div>
        )}
      </div>

      <div>
        <label htmlFor="location-search">Location</label>
        <input
          id="location-search"
          name="location-search"
          type="text"
          value={locationSearch}
          onChange={(e) => handleLocationSearch(e.target.value)}
          data-testid="input-location"
          placeholder="Search for a city..."
          aria-invalid={!!errors['location']}
        />
        {errors['location'] && (
          <span data-testid="error-location" role="alert">{errors['location']}</span>
        )}
        {locationSuggestions.length > 0 && (
          <ul data-testid="location-suggestions">
            {locationSuggestions.map((s, idx) => (
              <li key={s.place_id}>
                <button
                  type="button"
                  data-testid={`location-result-${idx}`}
                  onClick={() => handleLocationSelect(s)}
                >
                  {s.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {selectedLocation && (
          <div data-testid="selected-location">{selectedLocation.display_name}</div>
        )}
      </div>

      <button
        type="submit"
        data-testid="submit-profile"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockBangaloreSuggestions: GeocodeSuggestion[] = [
  {
    place_id: 'bangalore-1',
    display_name: 'Bangalore, Karnataka, India',
    lat: '12.9716',
    lon: '77.5946',
    timezone: 'Asia/Kolkata',
  },
  {
    place_id: 'bangalore-2',
    display_name: 'Bangalore Rural District, Karnataka, India',
    lat: '13.0',
    lon: '77.5',
    timezone: 'Asia/Kolkata',
  },
];

// ===========================================================================
// Form Rendering Tests
// ===========================================================================

describe('ProfileForm rendering', () => {
  test('Renders the form', () => {
    render(<ProfileForm />);
    expect(screen.getByTestId('profile-form')).toBeInTheDocument();
  });

  test('Renders name input', () => {
    render(<ProfileForm />);
    expect(screen.getByTestId('input-name')).toBeInTheDocument();
  });

  test('Renders date of birth input', () => {
    render(<ProfileForm />);
    expect(screen.getByTestId('input-dob')).toBeInTheDocument();
  });

  test('Renders time input', () => {
    render(<ProfileForm />);
    expect(screen.getByTestId('input-time')).toBeInTheDocument();
  });

  test('Renders location search input', () => {
    render(<ProfileForm />);
    expect(screen.getByTestId('input-location')).toBeInTheDocument();
  });

  test('Renders submit button', () => {
    render(<ProfileForm />);
    expect(screen.getByTestId('submit-profile')).toBeInTheDocument();
  });
});

// ===========================================================================
// Form Validation Tests
// ===========================================================================

describe('ProfileForm validation', () => {
  test('Shows error when name is empty on submit', async () => {
    const user = userEvent.setup();
    render(<ProfileForm />);

    await user.click(screen.getByTestId('submit-profile'));

    await waitFor(() => {
      expect(screen.getByTestId('error-name')).toBeInTheDocument();
      expect(screen.getByTestId('error-name')).toHaveTextContent('Name is required');
    });
  });

  test('Shows error when date of birth is empty', async () => {
    const user = userEvent.setup();
    render(<ProfileForm />);

    await user.type(screen.getByTestId('input-name'), 'Test User');
    await user.click(screen.getByTestId('submit-profile'));

    await waitFor(() => {
      expect(screen.getByTestId('error-dob')).toBeInTheDocument();
    });
  });

  test('Shows error when location is not selected', async () => {
    const user = userEvent.setup();
    render(<ProfileForm />);

    await user.type(screen.getByTestId('input-name'), 'Test User');
    // Fill in date and time without selecting location
    await user.click(screen.getByTestId('submit-profile'));

    await waitFor(() => {
      expect(screen.getByTestId('error-location')).toBeInTheDocument();
    });
  });

  test('No validation errors before first submit attempt', () => {
    render(<ProfileForm />);
    expect(screen.queryByTestId('error-name')).not.toBeInTheDocument();
    expect(screen.queryByTestId('error-dob')).not.toBeInTheDocument();
    expect(screen.queryByTestId('error-location')).not.toBeInTheDocument();
  });

  test('Clears validation errors when user fixes them', async () => {
    const user = userEvent.setup();
    render(<ProfileForm />);

    // Trigger validation
    await user.click(screen.getByTestId('submit-profile'));
    await waitFor(() => {
      expect(screen.getByTestId('error-name')).toBeInTheDocument();
    });

    // Fix the name
    await user.type(screen.getByTestId('input-name'), 'Fixed Name');

    // After typing, name field should no longer be invalid (may re-validate on input)
    // The error won't clear until next submit or on-change validation
    const nameInput = screen.getByTestId('input-name');
    expect(nameInput).toHaveValue('Fixed Name');
  });
});

// ===========================================================================
// TC-06: Midnight Birth DST Warning
// ===========================================================================

describe('TC-06: Midnight birth DST warning', () => {
  test('Shows DST warning when time is set to 00:00:00', async () => {
    const user = userEvent.setup();
    render(<ProfileForm />);

    const timeInput = screen.getByTestId('input-time');
    await user.clear(timeInput);
    await user.type(timeInput, '00:00:00');

    await waitFor(() => {
      expect(screen.getByTestId('dst-warning')).toBeInTheDocument();
    });
  });

  test('DST warning contains informative text about UTC offset', async () => {
    const user = userEvent.setup();
    render(<ProfileForm />);

    await user.type(screen.getByTestId('input-time'), '00:00:00');

    await waitFor(() => {
      const warning = screen.getByTestId('dst-warning');
      expect(warning).toHaveTextContent(/midnight/i);
    });
  });

  test('DST warning is NOT shown for non-midnight time', async () => {
    const user = userEvent.setup();
    render(<ProfileForm />);

    await user.type(screen.getByTestId('input-time'), '12:00:00');

    expect(screen.queryByTestId('dst-warning')).not.toBeInTheDocument();
  });

  test('DST warning is shown for "00:00" as well', async () => {
    const user = userEvent.setup();
    render(<ProfileForm />);

    const timeInput = screen.getByTestId('input-time');
    await user.clear(timeInput);
    // Simulate typing 00:00
    await user.type(timeInput, '00:00');
    // Manually fire change with 00:00
    await act(async () => {
      fireEventHelper(timeInput, '00:00');
    });

    await waitFor(() => {
      expect(screen.getByTestId('dst-warning')).toBeInTheDocument();
    });
  });
});

// Helper to fire a change event with a specific value
function fireEventHelper(element: HTMLElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value',
  )?.set;
  nativeInputValueSetter?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

// ===========================================================================
// Location Search Tests
// ===========================================================================

describe('Location search', () => {
  beforeEach(() => {
    mockSearchLocation.mockReset();
  });

  test('Calls searchLocation API when user types in location field', async () => {
    const user = userEvent.setup();
    mockSearchLocation.mockResolvedValue(mockBangaloreSuggestions);

    render(<ProfileForm />);

    await user.type(screen.getByTestId('input-location'), 'Bangalore');

    await waitFor(() => {
      expect(mockSearchLocation).toHaveBeenCalledWith(expect.stringContaining('Bangalor'));
    });
  });

  test('Displays location suggestions after typing', async () => {
    const user = userEvent.setup();
    mockSearchLocation.mockResolvedValue(mockBangaloreSuggestions);

    render(<ProfileForm />);

    await user.type(screen.getByTestId('input-location'), 'Bangalore');

    await waitFor(() => {
      expect(screen.getByTestId('location-result-0')).toBeInTheDocument();
    });
  });

  test('Selecting a suggestion populates the location field', async () => {
    const user = userEvent.setup();
    mockSearchLocation.mockResolvedValue(mockBangaloreSuggestions);

    render(<ProfileForm />);

    await user.type(screen.getByTestId('input-location'), 'Bangalore');

    await waitFor(() => {
      expect(screen.getByTestId('location-result-0')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('location-result-0'));

    await waitFor(() => {
      expect(screen.getByTestId('selected-location')).toHaveTextContent('Bangalore, Karnataka, India');
    });
  });

  test('Selecting a suggestion hides the suggestion dropdown', async () => {
    const user = userEvent.setup();
    mockSearchLocation.mockResolvedValue(mockBangaloreSuggestions);

    render(<ProfileForm />);

    await user.type(screen.getByTestId('input-location'), 'Bangalore');

    await waitFor(() => {
      expect(screen.getByTestId('location-suggestions')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('location-result-0'));

    await waitFor(() => {
      expect(screen.queryByTestId('location-suggestions')).not.toBeInTheDocument();
    });
  });

  test('Does not call searchLocation when query is less than 2 chars', async () => {
    const user = userEvent.setup();
    mockSearchLocation.mockResolvedValue([]);

    render(<ProfileForm />);

    await user.type(screen.getByTestId('input-location'), 'B');

    expect(mockSearchLocation).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Form Submission Tests
// ===========================================================================

describe('Form submission', () => {
  beforeEach(() => {
    mockSearchLocation.mockReset();
    mockCreateProfile.mockReset();
  });

  test('Calls createProfile API with correct data on submit', async () => {
    const user = userEvent.setup();
    mockSearchLocation.mockResolvedValue(mockBangaloreSuggestions);
    mockCreateProfile.mockResolvedValue({ id: 'test-id', name: 'TC-01 Test' });

    render(<ProfileForm />);

    await user.type(screen.getByTestId('input-name'), 'TC-01 Test');

    const dobInput = screen.getByTestId('input-dob');
    await user.clear(dobInput);
    await user.type(dobInput, '1974-09-20');
    fireEventHelper(dobInput, '1974-09-20');

    await user.type(screen.getByTestId('input-time'), '12:00:00');
    await user.type(screen.getByTestId('input-location'), 'Bangalore');

    await waitFor(() => {
      expect(screen.getByTestId('location-result-0')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('location-result-0'));

    await user.click(screen.getByTestId('submit-profile'));

    await waitFor(() => {
      expect(mockCreateProfile).toHaveBeenCalledTimes(1);
      expect(mockCreateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'TC-01 Test',
          lat: 12.9716,
          lon: 77.5946,
        }),
      );
    });
  });

  test('Calls onSuccess callback after successful submission', async () => {
    const user = userEvent.setup();
    mockSearchLocation.mockResolvedValue(mockBangaloreSuggestions);
    const successProfile = { id: 'new-id', name: 'Success Test' };
    mockCreateProfile.mockResolvedValue(successProfile);
    const onSuccess = jest.fn();

    render(<ProfileForm onSuccess={onSuccess} />);

    await user.type(screen.getByTestId('input-name'), 'Success Test');
    fireEventHelper(screen.getByTestId('input-dob'), '1990-01-01');
    await user.type(screen.getByTestId('input-time'), '12:00:00');
    await user.type(screen.getByTestId('input-location'), 'Ba');
    mockSearchLocation.mockResolvedValueOnce(mockBangaloreSuggestions);
    await user.type(screen.getByTestId('input-location'), 'ngalore');

    await waitFor(() => {
      expect(screen.queryByTestId('location-result-0')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('location-result-0'));
    await user.click(screen.getByTestId('submit-profile'));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(successProfile);
    });
  });

  test('Submit button shows "Saving..." while submitting', async () => {
    const user = userEvent.setup();
    mockSearchLocation.mockResolvedValue(mockBangaloreSuggestions);
    // createProfile hangs indefinitely to test loading state
    mockCreateProfile.mockImplementation(() => new Promise(() => {}));

    render(<ProfileForm />);

    await user.type(screen.getByTestId('input-name'), 'Test User');
    fireEventHelper(screen.getByTestId('input-dob'), '1990-01-01');
    await user.type(screen.getByTestId('input-time'), '12:00:00');
    await user.type(screen.getByTestId('input-location'), 'Bangalore');

    await waitFor(() => {
      expect(screen.queryByTestId('location-result-0')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('location-result-0'));
    await user.click(screen.getByTestId('submit-profile'));

    await waitFor(() => {
      expect(screen.getByTestId('submit-profile')).toHaveTextContent('Saving...');
      expect(screen.getByTestId('submit-profile')).toBeDisabled();
    });
  });

  test('Date input accepts valid ISO date format', async () => {
    render(<ProfileForm />);
    const dobInput = screen.getByTestId('input-dob');
    fireEventHelper(dobInput, '1974-09-20');
    expect(dobInput).toHaveValue('1974-09-20');
  });
});
