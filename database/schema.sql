-- Enable WAL mode for concurrent access (run after connection)
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
PRAGMA synchronous=NORMAL;

-- Ayanamsa reference table
CREATE TABLE IF NOT EXISTS ayanamsas (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,           -- 'Lahiri', 'Raman', 'KP'
  description TEXT
);

-- User profiles
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,          -- UUID v4
  name TEXT NOT NULL,
  dob_utc TEXT NOT NULL,        -- ISO 8601 datetime: '1974-09-20T06:30:00Z'
  lat REAL NOT NULL,            -- latitude, -90 to 90
  lon REAL NOT NULL,            -- longitude, -180 to 180
  timezone TEXT NOT NULL,       -- IANA timezone e.g. 'Asia/Kolkata'
  utc_offset_hours REAL NOT NULL, -- offset at birth time
  place_name TEXT,              -- display name: 'Bangalore, India'
  ayanamsa_id INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'new',
  FOREIGN KEY (ayanamsa_id) REFERENCES ayanamsas(id)
);

-- Calculation cache (heavy computations cached as JSON)
CREATE TABLE IF NOT EXISTS calculations_cache (
  profile_id TEXT NOT NULL,
  cache_version INTEGER NOT NULL DEFAULT 1,
  julian_day REAL NOT NULL,
  ayanamsa_value REAL NOT NULL,     -- ayanamsa at birth date
  chart_json TEXT NOT NULL,          -- D1 ChartData JSON
  vargas_json TEXT,                  -- Map<Varga, VargaChart> JSON
  shadbala_json TEXT,                -- ShadbalaResult[] JSON
  ashtakavarga_json TEXT,            -- AshtakavargaResult JSON
  dashas_json TEXT,                  -- DashaPeriod[] JSON (full 120yr)
  yogas_json TEXT,                   -- YogaResult[] JSON
  predictions_json TEXT,            -- PredictionsResult JSON
  computed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (profile_id),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Life events journal (for life-event mapping to dashas)
CREATE TABLE IF NOT EXISTS events_journal (
  id TEXT PRIMARY KEY,          -- UUID v4
  profile_id TEXT NOT NULL,
  event_date TEXT NOT NULL,     -- ISO 8601 date: '2003-06-15'
  category TEXT NOT NULL,       -- 'Career', 'Relationship', 'Health', 'Finance', 'Travel', 'Education', 'Other'
  title TEXT NOT NULL,
  description TEXT,
  sentiment INTEGER,            -- -1=negative, 0=neutral, 1=positive
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Hourly predictions cache (30-day rolling window)
CREATE TABLE IF NOT EXISTS hourly_predictions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  date TEXT NOT NULL,           -- YYYY-MM-DD
  hour INTEGER NOT NULL,        -- 0-23
  timezone TEXT NOT NULL,       -- e.g., America/New_York

  -- Sookshma Dasha (Level 4 - days)
  sookshma_dasha_planet INTEGER,
  sookshma_dasha_start TEXT,
  sookshma_dasha_end TEXT,

  -- Prana Dasha (Level 5 - hours)
  prana_dasha_planet INTEGER,
  prana_dasha_start TEXT,
  prana_dasha_end TEXT,

  -- Transit positions
  moon_nakshatra INTEGER,
  moon_sign INTEGER,
  moon_degree REAL,
  transit_lagna REAL,
  transit_lagna_sign INTEGER,

  -- Prediction data
  hourly_score INTEGER,
  prediction_text TEXT,

  created_at TEXT NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hourly_profile_date
  ON hourly_predictions(profile_id, date);

-- App settings (key-value)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Profile processing status
CREATE TABLE IF NOT EXISTS profile_status (
  id TEXT PRIMARY KEY,          -- 'new', 'processing', 'ready', 'error'
  name TEXT NOT NULL,
  description TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_profile_date ON events_journal(profile_id, event_date);
CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles(name);
CREATE INDEX IF NOT EXISTS idx_cache_profile ON calculations_cache(profile_id);

-- Schema migrations for existing databases
-- predictions_json column check (SQLite doesn't support ADD COLUMN IF NOT EXISTS)
-- Only add if it doesn't exist (idempotent approach)
ALTER TABLE calculations_cache ADD COLUMN predictions_json TEXT;
-- Note: This will fail gracefully if column exists - handled by migration runner

INSERT OR IGNORE INTO profile_status VALUES ('new', 'New', 'Profile created, not yet processed');
INSERT OR IGNORE INTO profile_status VALUES ('processing', 'Processing', 'Chart calculations in progress');
INSERT OR IGNORE INTO profile_status VALUES ('ready', 'Ready', 'Chart fully calculated and cached');
INSERT OR IGNORE INTO profile_status VALUES ('error', 'Error', 'Processing failed');

-- Default data
INSERT OR IGNORE INTO ayanamsas VALUES (1, 'Lahiri', 'Chitrapaksha ayanamsa, official Indian standard');
INSERT OR IGNORE INTO ayanamsas VALUES (2, 'Raman', 'B.V. Raman ayanamsa');
INSERT OR IGNORE INTO ayanamsas VALUES (3, 'KP', 'Krishnamurti Paddhati ayanamsa');

INSERT OR IGNORE INTO settings VALUES ('default_ayanamsa', '1', datetime('now'));
INSERT OR IGNORE INTO settings VALUES ('app_version', '1.0.0', datetime('now'));
INSERT OR IGNORE INTO settings VALUES ('ephemeris_path', '', datetime('now'));
