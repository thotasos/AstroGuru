# ParashariPrecision — Complete Testing Script

> **Purpose:** End-to-end verification of every app feature using a fixed test profile.
> All expected values in this document were computed by running the app's own algorithms
> (SwissEphemeris.swift + CalculationEngine.swift) in Python so the numbers match exactly
> what the app produces — not what an external reference would show.
> Discrepancies between app output and external references are documented in the Gaps section.

---

## Test Environment

| Item | Value |
|------|-------|
| App | ParashariPrecision.app |
| Location | `~/Applications/myApps/ParashariPrecision.app` |
| macOS target | 14.0+ |
| Reference date | 2026-03-21 |
| External CLI | `swetest` (Swiss Ephemeris test binary) — install via `brew install swisseph` if available |

---

## Test Profile — "Asha Mehta"

Use this exact profile for every test run. All expected values below are pre-computed for it.

| Field | Value |
|-------|-------|
| Name | Asha Mehta |
| Date of birth | September 15, 1982 |
| Time of birth | 08:30 AM local (Chicago CDT = UTC−5) |
| UTC time | 13:30 UTC |
| Place name | Chicago, Illinois, USA |
| Latitude | 41.8781 |
| Longitude | −87.6298 |
| Timezone | America/Chicago |
| Ayanamsa | (see per-run below — default run uses Raman/id=1) |

> **Note on timezone entry:** The app interprets the DatePicker time as local birth timezone.
> When the picker shows 08:30 AM and timezone is America/Chicago, the stored dobUTC will be
> 1982-09-15T13:30:00Z. Verify the stored value matches by checking in the SQLite DB if needed.

---

## Part 1 — Profile Creation, Selection, and Chart Verification

### Step 1.1 — Create New Profile

1. Launch `ParashariPrecision.app`
2. Click **+** in the sidebar toolbar
3. Fill in the New Profile sheet:
   - Name: `Test Profile` (or a unique name for this test run)
   - Date of Birth: `September 15, 1982`
   - Time: `08:30 AM`
   - Place Name: `Chicago, Illinois, USA`
   - Latitude: `41.8781`
   - Longitude: `-87.6298`
   - Timezone: `America/Chicago`
   - Ayanamsa: `Raman` (first run)
   - Notes: (leave blank)
4. Click **Save**

**VERIFY:**
- [ ] Profile appears in sidebar with the new profile name and place "Chicago, Illinois, USA"
- [ ] Profile is **automatically selected** immediately after creation (sidebar row highlighted)
- [ ] Clicking profile selects it and shows Chart tab
- [ ] Chart tab shows a loading spinner, then a South Indian chart

### Step 1.2 — Verify Chart is Correct for New Profile

**Expected planet positions** (computed from app's own SwissEphemeris.swift algorithms):

| Planet | Sidereal Longitude | Sign | Degree in Sign |
|--------|--------------------|------|----------------|
| Sun | 148.544° | Leo | 28°32' |
| Moon | 125.498° | Leo | 5°29' |
| Mercury | 273.704° | Capricorn | 3°42' |
| Venus | 118.354° | Cancer | 28°21' |
| Mars | 261.024° | Sagittarius | 21°01' |
| Jupiter | 201.575° | Libra | 21°34' |
| Saturn | 171.161° | Virgo | 21°09' |
| Rahu | 236.610° | Scorpio | 26°36' |
| Ketu | 56.610° | Taurus | 26°36' |

**Expected Lagna (Ascendant):** Capricorn 8°45' (278.756°)
**Expected MC (Midheaven):** Sagittarius 23°44' (263.739°)
**Lahiri Ayanamsa used:** 23.8474° (23°50'50")

**VERIFY (Chart tab — Planet List):**
- [ ] Sun shown in Leo
- [ ] Moon shown in Leo
- [ ] Mercury shown in Capricorn
- [ ] Venus shown in Cancer
- [ ] Mars shown in Sagittarius
- [ ] Jupiter shown in Libra
- [ ] Saturn shown in Virgo
- [ ] Rahu shown in Scorpio
- [ ] Ketu shown in Taurus
- [ ] Ascendant shown in Capricorn

**VERIFY (South Indian Chart diagram):**
- [ ] "L" (Lagna marker) appears in the Capricorn cell (row 3, col 0 in the 4×4 grid)
- [ ] Sun and Moon symbols both appear in the Leo cell
- [ ] All 12 sign cells are visible in the 4×4 grid
- [ ] No sign cell is empty/missing (Leo must appear at row 3, col 1)

**VERIFY (Loading Indicator):**
- [ ] When profile is selected, a loading spinner appears while chart data is computed
- [ ] After chart loads, no "waiting" or stale indicator remains

### Step 1.3 — Switch Between Sample Profiles

1. In the sidebar, locate all other sample profiles (e.g., "Asha Mehta", "Ravi Sharma", or any pre-seeded profiles)
2. Click on each sample profile one by one

**VERIFY for each profile switch:**
- [ ] Chart tab updates to show the selected profile's planet positions
- [ ] Chart changes to reflect the different birth data (different signs for planets)
- [ ] Loading spinner appears briefly during recalculation
- [ ] No stale data from previous profile remains visible

### Step 1.4 — Return to New Profile and Verify All Tabs

1. Switch back to the newly created profile
2. Verify all tabs are accessible and load without crash

**VERIFY:**
- [ ] Dasha tab loads and shows correct Mahadasha sequence
- [ ] Shadbala tab loads and shows strength values
- [ ] Ashtakavarga tab loads and shows bindu grid
- [ ] Yogas tab loads and shows detected yogas
- [ ] Predictions tab loads and shows overview

---

### Step 1.2 — Chart Tab Verification

**Expected planet positions** (computed from app's own SwissEphemeris.swift algorithms):

| Planet | Sidereal Longitude | Sign | Degree in Sign |
|--------|--------------------|------|----------------|
| Sun | 148.544° | Leo | 28°32' |
| Moon | 125.498° | Leo | 5°29' |
| Mercury | 273.704° | Capricorn | 3°42' |
| Venus | 118.354° | Cancer | 28°21' |
| Mars | 261.024° | Sagittarius | 21°01' |
| Jupiter | 201.575° | Libra | 21°34' |
| Saturn | 171.161° | Virgo | 21°09' |
| Rahu | 236.610° | Scorpio | 26°36' |
| Ketu | 56.610° | Taurus | 26°36' |

**Expected Lagna (Ascendant):** Capricorn 8°45' (278.756°)
**Expected MC (Midheaven):** Sagittarius 23°44' (263.739°)
**Lahiri Ayanamsa used:** 23.8474° (23°50'50")

**VERIFY (Chart tab — Planet List):**
- [ ] Sun shown in Leo
- [ ] Moon shown in Leo
- [ ] Mercury shown in Capricorn
- [ ] Venus shown in Cancer
- [ ] Mars shown in Sagittarius
- [ ] Jupiter shown in Libra
- [ ] Saturn shown in Virgo
- [ ] Rahu shown in Scorpio
- [ ] Ketu shown in Taurus
- [ ] Ascendant shown in Capricorn

**VERIFY (South Indian Chart diagram):**
- [ ] "L" (Lagna marker) appears in the Capricorn cell (row 3, col 0 in the 4×4 grid)
- [ ] Sun and Moon symbols both appear in the Leo cell
- [ ] All 12 sign cells are visible in the 4×4 grid
- [ ] No sign cell is empty/missing (Leo must appear at row 3, col 1)

---

### Step 1.3 — CLI Cross-Reference (if swetest installed)

```bash
# Install Swiss Ephemeris if needed
brew install swisseph

# Run swetest for this exact birth moment (UTC)
# -b = date, -ut = Universal Time, -sid1 = Lahiri sidereal
# -p0123456789mtj = planets 0-9 + mean node + true node
swetest -b15.09.1982 -ut13:30 \
        -p0123456789 \
        -sid1 \
        -fPZSD \
        -head \
        -eswe

# Expected swetest output (Lahiri, standard Swiss Ephemeris):
# Sun      172.39° tropical → ~148.77° sidereal (Leo 28°46')
# Moon     149.36° tropical → ~125.74° sidereal (Leo 5°44')
# [etc.]
```

**Record swetest output and compare to app output. Expect ~14' difference in every planet**
due to the app's ayanamsa formula discrepancy (see Gaps section).

**CLI Ascendant verification:**
```bash
swetest -b15.09.1982 -ut13:30 -house41.8781,-87.6298,P -sid1 -fPZ
```

---

## Part 2 — Dasha Verification

### Step 2.1 — Dasha Tab

Click the **Dasha** tab for "Asha Mehta".

**Expected Vimshottari Dasha sequence** (from app's algorithms):

| Mahadasha Lord | Start | End | Duration |
|----------------|-------|-----|----------|
| Ketu (partial) | 1982.71 | 1986.82 | 4.11 years remaining |
| Venus | 1986.82 | 2006.82 | 20 years |
| Sun | 2006.82 | 2012.82 | 6 years |
| Moon | 2012.82 | 2022.82 | 10 years |
| Mars | 2022.82 | 2029.82 | 7 years |
| Rahu | 2029.82 | 2047.82 | 18 years |
| Jupiter | 2047.82 | 2063.82 | 16 years |
| Saturn | 2063.82 | 2082.82 | 19 years |
| Mercury | 2082.82 | 2099.82 | 17 years |

**Moon's Nakshatra:** Magha (#10), Pada 2
**Moon sidereal:** 125.498° (Leo 5°29')
**Dasha lord at birth:** Ketu (Ketu rules Magha's lord group at index 9 % 9 = 0)

> The display shows year-month ranges (YYYY-MM). Verify the start/end months align with the
> decimal year values above. E.g., Ketu partial ends at ~October 1986; Venus runs to ~October 2006.

**VERIFY:**
- [ ] Ketu Mahadasha shown as current at birth (partial)
- [ ] Venus follows Ketu for 20 years (~1986–2006)
- [ ] Sun follows Venus for 6 years (~2006–2012)
- [ ] Moon follows Sun for 10 years (~2012–2022)
- [ ] Mars is highlighted as **Current** (we are in 2026, Mars Mahadasha 2022–2029)
- [ ] Mars Mahadasha antardasha for today (Mar 2026) should be Mars–Jupiter antardasha
- [ ] Three nesting levels visible: Mahadasha → Antardasha → Pratyantardasha
- [ ] All rows expandable/collapsible

**CLI Cross-Reference:**
```bash
# Vimshottari Dasha verification requires Moon nakshatra degree
# Step 1: get Moon sidereal longitude from swetest
swetest -b15.09.1982 -ut13:30 -p1 -sid1 -fPZ
# Step 2: identify nakshatra (each is 13°20' = 13.333...)
# Moon at X° → nakshatra = floor(X / 13.333) → lord from table
# Ketu=0, Venus=1, Sun=2, Moon=3, Mars=4, Rahu=5, Jupiter=6, Saturn=7, Mercury=8
```

**Manual Verification:**
1. Moon sidereal = 125.498° (from app)
2. Nakshatra size = 360/27 = 13.333...°
3. Nakshatra index = floor(125.498 / 13.333) = floor(9.412) = **9** → Magha (0-indexed)
4. Lord cycle: Ketu(0), Venus(1), Sun(2), Moon(3), Mars(4), Rahu(5), Jupiter(6), Saturn(7), Mercury(8) repeating
5. Index 9 % 9 = 0 → **Ketu** ✓
6. Remainder in nakshatra: 125.498 % 13.333 = 125.498 - 9×13.333 = 125.498 - 119.997 = 5.501°
7. Fraction consumed: 5.501 / 13.333 = 0.4126
8. Ketu years consumed at birth: 0.4126 × 7 = **2.888 years** ✓ (matches app: 2.886)

---

## Part 3 — Predictions for Specific Dates

### Step 3.1 — Predictions Tab Setup

Click the **Predictions** tab.

**Expected dasha periods active on each reference date:**

| Date | Mahadasha | Antardasha | Notes |
|------|-----------|------------|-------|
| **P1: 2025-01-10** | Mars | Jupiter | Jupiter antardasha 2024.277–2025.210 |
| **P2: 2023-06-20** | Mars | Rahu | Rahu antardasha 2023.227–2024.277 |
| **P3: 2020-11-05** | Moon | Venus | Venus antardasha 2020.652–2022.319 |
| **F1: 2027-07-04** | Mars | Ketu | Ketu antardasha 2027.310–2027.719 |
| **F2: 2029-01-01** | Mars | Sun | Sun antardasha 2028.885–2029.235 |
| **F3: 2032-03-21** | Rahu | Rahu | Rahu–Rahu 2029.819–2032.519 |

> The Predictions tab generates text based on the current active dasha (as of today, 2026-03-21),
> not an arbitrary date selector. To verify a specific date's dasha, cross-check using the Dasha tab's
> timeline or the manual calculation above.

**VERIFY (Predictions tab — Overview sub-tab):**
- [ ] Overview text mentions Mars Mahadasha (currently active in 2026)
- [ ] Dasha sub-tab shows Mars as current period
- [ ] Timeline bar chart shows Mars period highlighted
- [ ] Planets sub-tab shows per-planet prediction cards for all 9 planets
- [ ] Yogas Impact sub-tab shows text (may be empty if no significant yogas detected)

**VERIFY (text highlighting):**
- [ ] Planet names (Sun, Moon, Mars, etc.) highlighted in **orange bold**
- [ ] Sign names (Leo, Cancer, Capricorn, etc.) highlighted in **blue bold**
- [ ] Yoga category names highlighted in **green bold**
- [ ] Only matched words highlighted — no text between matches colored

**VERIFY (Dasha Timeline):**
- [ ] Proportional horizontal bars visible for Mahadasha sequence
- [ ] Mars bar appears widest among recent dashas (7 years)
- [ ] Year labels shown at start and end of timeline
- [ ] Planet color legend visible below bars
- [ ] NO placeholder text "Visual timeline representation would appear here"

### Step 3.2 — Past Date Verification (P1: 2025-01-10)

**Manual check using Dasha tab:**
1. Locate Mars Mahadasha in the Dasha tab
2. Expand it to find Antardasha periods
3. Verify Jupiter antardasha started before January 2025 and ended after January 2025

**Expected:** Jupiter antardasha within Mars Mahadasha runs approximately Nov 2024 – Aug 2025
(Mars MD = 7 years, Jupiter AD = (16/120) × 7 = 0.933 years ≈ 11.2 months)

### Step 3.3 — Past Date Verification (P2: 2023-06-20)

**Expected:** Rahu antardasha within Mars Mahadasha
Duration: (18/120) × 7 = 1.05 years
Verify this period spans mid-2023 through mid-2024 in the Dasha tab.

### Step 3.4 — Past Date Verification (P3: 2020-11-05)

**Expected:** Moon Mahadasha, Venus antardasha
Moon MD started ~Oct 2012, Venus antardasha within Moon = (20/120) × 10 = 1.667 years
Verify Venus antardasha spans approximately Sep 2020 – May 2022.

### Step 3.5 — Future Date Verification (F1: 2027-07-04)

**Expected:** Mars Mahadasha, Ketu antardasha
Ketu AD within Mars = (7/120) × 7 = 0.408 years ≈ 4.9 months
Verify Ketu antardasha spans approximately Apr–Sep 2027.

### Step 3.6 — Future Date Verification (F2: 2029-01-01)

**Expected:** Mars Mahadasha, Sun antardasha
Sun AD within Mars = (6/120) × 7 = 0.35 years ≈ 4.2 months
Verify Sun antardasha spans approximately Nov 2028 – Mar 2029.

### Step 3.7 — Future Date Verification (F3: 2032-03-21)

**Expected:** Rahu Mahadasha, Rahu antardasha
Rahu MD starts ~Oct 2029. Rahu–Rahu AD = (18/120) × 18 = 2.7 years
Verify Rahu–Rahu antardasha spans approximately Oct 2029 – Jun 2032.

---

### Step 3.8 — Day Prediction (Hourly Breakdown) — Reference Date 2026-03-21

Click the **Day** sub-tab inside the Predictions tab.

#### 3.8.1 — UI Structure

**VERIFY:**
- [ ] **Date picker** is shown at the top of the tab (defaults to today)
- [ ] Header row shows "Day Lord: ☿ Mercury" (2026-03-21 is a Wednesday; Mercury rules Wednesday)
- [ ] Two callout cards appear: **Best Hour** (green) and **Challenging Hour** (red)
- [ ] Summary text is shown (e.g., "Mercury-ruled day brings a [quality] influence under the Mars–Saturn dasha period...")
- [ ] **24 rows** are shown in the hourly table — one per civil hour (00:00–23:00)
- [ ] Each row contains: hour range | hora lord symbol | Career bar | Finance bar | Health bar | Relationships bar | Spirituality bar
- [ ] Rows with overall score ≥ 70 % have a **green tint**; rows < 50 % have a **red tint**

#### 3.8.2 — Planetary Hora Sequence for Wednesday (2026-03-21)

Hora lords follow the Chaldean sequence (Sun, Venus, Mercury, Moon, Saturn, Jupiter, Mars) cycling from the day lord. Wednesday = Mercury starts the 00:00 hora.

| Hour | Expected Hora Lord | Symbol |
|------|--------------------|--------|
| 00:00–01:00 | Mercury | ☿ |
| 01:00–02:00 | Moon | 🌙 |
| 02:00–03:00 | Saturn | ♄ |
| 03:00–04:00 | Jupiter | ♃ |
| 04:00–05:00 | Mars | ♂ |
| 05:00–06:00 | Sun | ☀️ |
| 06:00–07:00 | Venus | ♀ |
| 07:00–08:00 | Mercury | ☿ |
| 08:00–09:00 | Moon | 🌙 |
| 09:00–10:00 | Saturn | ♄ |
| 10:00–11:00 | Jupiter | ♃ |
| 11:00–12:00 | Mars | ♂ |
| 12:00–13:00 | Sun | ☀️ |
| 13:00–14:00 | Venus | ♀ |
| 14:00–15:00 | Mercury | ☿ |
| 15:00–16:00 | Moon | 🌙 |
| 16:00–17:00 | Saturn | ♄ |
| 17:00–18:00 | Jupiter | ♃ |
| 18:00–19:00 | Mars | ♂ |
| 19:00–20:00 | Sun | ☀️ |
| 20:00–21:00 | Venus | ♀ |
| 21:00–22:00 | Mercury | ☿ |
| 22:00–23:00 | Moon | 🌙 |
| 23:00–00:00 | Saturn | ♄ |

**VERIFY:**
- [ ] Match hora lord symbols for at least 4 spot-check rows (e.g., 00:00, 05:00, 12:00, 19:00)
- [ ] The 7-planet Chaldean cycle repeats correctly (hour 00 = hour 07 = hour 14 = hour 21 = Mercury)

#### 3.8.3 — Date Picker Changes Content

1. Change the date picker to **Tuesday 2026-03-24** (Tuesday = Mars)
2. **VERIFY:**
   - [ ] Header updates to "Day Lord: ♂ Mars"
   - [ ] First hora (00:00) changes to ♂ Mars
   - [ ] Summary text updates for the new date
   - [ ] Best/worst hour callout cards update
3. Change back to **2026-03-21**

#### 3.8.4 — Trend Score Plausibility

The five trend scores (Career, Finance, Health, Relationships, Spirituality) are deterministic for each hour based on hora lord + dasha lords. They must satisfy:

- [ ] All bar values are between 0% and 100% — no overflow, no negative bars
- [ ] Best hour overall ≥ 60 % (green card shown)
- [ ] Challenging hour overall ≤ 55 % (red card shown)
- [ ] Overall % shown in each callout card matches the rendered bar widths visually

---

## Part 4 — Monthly Predictions (Daily Trend Breakdown)

### Step 4.0 — Month Tab UI Structure

Click the **Month** sub-tab inside the Predictions tab.

**VERIFY:**
- [ ] **Month/year header** with left `‹` and right `›` chevron navigation buttons
- [ ] Header shows the current month/year (e.g., "March 2026")
- [ ] Dasha label shows active period (e.g., "Dasha: Mars–Saturn")
- [ ] Summary text below header (e.g., "March 2026 is [quality] under the Mars–Saturn dasha period...")
- [ ] Column headers: **Day | Lord | Career | Finance | Health | Rels. | Spirit. | Overall**
- [ ] One row per calendar day (31 rows for March, 28/29 for February, etc.)
- [ ] Each row shows: `DD` + weekday abbrev | planet symbol | 5 coloured bars | `XX%`
- [ ] Rows with overall ≥ 70 % have a **green tint**; rows < 50 % have a **red tint**; others are plain

### Step 4.1 — March 2026 Daily Trend (Reference Month)

Navigate to **March 2026**.

#### Day Lord Spot Checks for March 2026

| Date | Weekday | Expected Day Lord | Symbol |
|------|---------|-------------------|--------|
| Mar 01 | Sun | Sun | ☀️ |
| Mar 02 | Mon | Moon | 🌙 |
| Mar 03 | Tue | Mars | ♂ |
| Mar 04 | Wed | Mercury | ☿ |
| Mar 05 | Thu | Jupiter | ♃ |
| Mar 06 | Fri | Venus | ♀ |
| Mar 07 | Sat | Saturn | ♄ |
| Mar 21 | Sat | Saturn | ♄ |
| Mar 31 | Tue | Mars | ♂ |

**VERIFY:**
- [ ] Match day lord symbols for at least 5 of the rows above
- [ ] 31 rows shown (March has 31 days)
- [ ] Overall % column is formatted as `XX%` (no decimals beyond 0)
- [ ] Navigation: click `‹` → jumps to **February 2026**, showing 28 rows

#### Trend Score Plausibility for March 2026

- [ ] At least one row is green-tinted (overall ≥ 70 %)
- [ ] At least one row is red-tinted (overall < 50 %)
- [ ] No row shows overall > 100 % or < 0 %
- [ ] Career, Finance, Health, Relationships, Spirituality bars each fill proportionally within their column

### Step 4.2 — Month Navigation Verification

1. From March 2026, click `›` twice → should show **May 2026** (31 days)
2. **VERIFY:** header shows "May 2026", row count = 31
3. Click `‹` three times → should show **February 2026** (28 days)
4. **VERIFY:** header shows "February 2026", row count = 28

### Step 4.3 — Future Monthly Predictions (Dasha Cross-Check)

**April 2027 (Future +13 months):** navigate using `›` to April 2027.

| Item | Expected |
|------|----------|
| Mahadasha | Mars |
| Antardasha | Mercury |
| Mercury AD duration | (17/120) × 7 = 0.992 years ≈ 11.9 months |
| Approximate span | ~Feb 2027 – Feb 2028 |

**VERIFY:**
- [ ] Month tab header shows "Dasha: Mars–Mercury"
- [ ] Summary text references Mars–Mercury period
- [ ] Dasha tab (switch tabs) confirms Mercury antardasha active in April 2027

**September 2029 (Future +42 months):** navigate to September 2029.

| Item | Expected |
|------|----------|
| Mahadasha | Mars |
| Antardasha | Moon |
| Moon AD duration | (10/120) × 7 = 0.583 years ≈ 7 months |
| Approximate span | ~Jun 2029 – Jan 2030 |

**VERIFY:**
- [ ] Month tab header shows "Dasha: Mars–Moon"
- [ ] Dasha tab confirms Moon antardasha active in Sept 2029

### Step 4.4 — Past Monthly Predictions (Dasha Cross-Check)

**June 2024 (Past −21 months):** navigate back to June 2024.

| Item | Expected |
|------|----------|
| Mahadasha | Mars |
| Antardasha | Jupiter |
| Jupiter AD span | ~Nov 2024 – Aug 2025 |

> **Note:** June 2024 falls in Mars–Rahu antardasha (~Mar 2023 – Mar 2024) *or* Mars–Jupiter depending
> on exact Vimshottari boundary. Verify what the Dasha tab shows and confirm Month tab agrees.

**VERIFY:**
- [ ] Month tab "Dasha" label matches Dasha tab for June 2024
- [ ] 30 rows shown (June has 30 days)
- [ ] Day lord for June 01, 2024 (Monday) = 🌙 Moon

**January 2022 (Past −50 months):** navigate to January 2022.

| Item | Expected |
|------|----------|
| Mahadasha | Moon |
| Antardasha | Venus |
| Venus AD approx | ~Sep 2020 – May 2022 |

**VERIFY:**
- [ ] Month tab header shows "Dasha: Moon–Venus"
- [ ] 31 rows shown (January has 31 days)
- [ ] Day lord for Jan 01, 2022 (Saturday) = ♄ Saturn

---

## Part 5 — Shadbala Verification

Click the **Shadbala** tab.

**Expected column headers:** Planet | Sthana Bala | Dig Bala | Kala Bala | Chesta Bala | Naisargika Bala | Drig Bala | Total (Rupas) | Total (Virupas)

**Reference Naisargika Bala values (fixed by tradition — these never change by birth data):**

| Planet | Naisargika Bala (Virupas) |
|--------|--------------------------|
| Sun | 60.0 |
| Moon | 51.43 |
| Venus | 42.86 |
| Jupiter | 34.29 |
| Mercury | 25.71 |
| Mars | 17.14 |
| Saturn | 8.57 |

**VERIFY:**
- [ ] Table renders with 7 planet rows (Sun through Saturn; Rahu/Ketu excluded)
- [ ] Naisargika Bala column values match table above (±0.1 rounding)
- [ ] Total column sortable (click column header)
- [ ] Exalted planets show green up-arrow (⬆)
- [ ] Debilitated planets show red down-arrow (⬇)
- [ ] No force-unwrap crash when sorting

**Expected dignities for this chart:**
- Sun at Leo 28° — Sun owns Leo → **Own sign** (strong, not technically exalted)
- Moon at Leo 5° — Moon debilitated in Scorpio, exalted in Taurus → neutral in Leo
- Venus at Cancer 28° — Venus debilitated in Virgo, exalted in Pisces → neutral in Cancer
- Mars at Sagittarius 21° — Mars debilitated in Cancer, exalted in Capricorn → neutral
- Jupiter at Libra 21° — Jupiter debilitated in Capricorn → neutral in Libra
- Saturn at Virgo 21° — Saturn exalted in Libra → neutral in Virgo

**CLI Cross-Reference:**
```bash
# Dignity check for Sun in Leo
# Sun owns Leo (sign index 4). At 28° Leo it is in own sign (Swakshetra).
# Standard Sthana Bala for own sign = 15 virupas (half of exaltation 30)
```

---

## Part 6 — Ashtakavarga Verification

Click the **Ashtakavarga** tab.

> **KNOWN GAP:** The app's BAV algorithm counts the number of planets occupying each sign (max 1 per planet per sign). This is NOT the traditional Parashari Ashtakavarga which requires fixed relative-position lookup tables casting 0–8 bindus per cell. All bindu values will be 0 or 1. SAV totals will be 0–9 per sign, not the expected 18–48.

**With the test profile, expected raw counts (planet occupies sign):**
- Leo: Sun, Moon → 2 bindus
- Cancer: Venus → 1 bindu
- Capricorn: Mercury → 1 bindu
- Sagittarius: Mars → 1 bindu
- Libra: Jupiter → 1 bindu
- Virgo: Saturn → 1 bindu
- Scorpio: Rahu → 1 bindu
- Taurus: Ketu → 1 bindu
- All other signs: 0 bindus

**VERIFY:**
- [ ] 8 planet rows shown (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu)
- [ ] 12 sign columns shown
- [ ] Leo cell for Sun row shows 1 (or colored green)
- [ ] Leo cell for Moon row shows 1
- [ ] All other cells for each planet row show 0 or blank
- [ ] SAV Total row shows 2 for Leo, 1 for each of Cancer/Capricorn/Sagittarius/Libra/Virgo/Scorpio/Taurus, 0 elsewhere
- [ ] No crash on load

---

## Part 7 — Yogas Verification

Click the **Yogas** tab.

**Expected yoga detections** depend on the CalculationEngine's yoga logic. The key placements for this chart are:

| Yoga Type | Condition | This Chart |
|-----------|-----------|------------|
| Gajakesari | Moon + Jupiter in kendra (1,4,7,10) | Moon in Leo (Lagna=Capricorn: Leo is H8) — NOT a kendra. Likely absent. |
| Budhaditya | Sun + Mercury in same sign | Sun=Leo, Mercury=Capricorn — different signs. Absent. |
| Shasha | Saturn in own/exalted sign in kendra | Saturn in Virgo (H9) — not a kendra. Absent. |
| Vesi/Voshi | Planets in 2nd/12th from Sun | Check Mercury (Capricorn) is 6 signs from Sun (Leo). |
| Mahapurusha | Mars/Mercury/Jupiter/Venus/Saturn in own/exalt sign in kendra | Check each. |

**VERIFY:**
- [ ] Yogas tab loads without crash
- [ ] Filter picker (category dropdown) works — switching categories filters list
- [ ] Sort options (Strength, Name, Category) reorder the list
- [ ] Each yoga card shows: name, category, planets, houses, strength %, description
- [ ] "Rare" badge appears only on yogas with strength ≥ 0.9 OR category contains "rare"
- [ ] "Powerful" badge appears on yogas with 0.75 ≤ strength < 0.9
- [ ] If no yogas detected: message reads "No yoga formations were detected in this chart" (not "Select a profile")

---

## Part 8 — Profile Deletion

1. In the sidebar, right-click "Asha Mehta" (or use Edit menu if available)
2. Select Delete / press Delete key
3. Confirm deletion prompt

**VERIFY:**
- [ ] Profile removed from sidebar
- [ ] Detail pane shows "Select a Profile" ContentUnavailableView
- [ ] Re-creating the same profile starts fresh (no cached data persists)
- [ ] App does not crash on deletion

> **If deletion via UI is not available:** The current app version does not expose a delete action
> in the sidebar. Delete via SQLite directly for testing:
> ```bash
> sqlite3 ~/Library/Application\ Support/ParashariPrecision/astrology.sqlite \
>   "DELETE FROM profiles WHERE name='Asha Mehta';"
> ```
> Then restart the app to reload.

---

## Part 9 — Per-Ayanamsa Test Runs

Repeat Parts 1–7 and Part 12 for each ayanamsa. Create the same "Asha Mehta" profile each time,
selecting a different ayanamsa, observe and record results. Skip Part 8 (Profile Deletion) during per-ayanamsa runs.

> **CRITICAL NOTE:** As of this version, the CalculationEngine ignores the `ayanamsaId` parameter
> and **always uses Lahiri** (hard-coded in `calculateChart`). All ayanamsa runs will produce
> **identical charts**. This is a known gap (see Part 10).

### Ayanamsa Run Matrix

| Run | Picker Label | App ID | Expected behavior | Actual behavior |
|-----|-------------|--------|-------------------|-----------------|
| R1 | Raman | 1 | Raman correction (~22.78° for 1982) | Uses Lahiri 23.85° |
| R2 | Krishnamurti | 2 | KP ayanamsa (~23.80° for 1982) | Uses Lahiri 23.85° |
| R3 | Yukteshwar | 3 | Yukteshwar (~22.23° for 1982) | Uses Lahiri 23.85° |
| R4 | Sriballav | 4 | Sriballav variant | Uses Lahiri 23.85° |
| R5 | BN Bhasin | 5 | Bhasin variant | Uses Lahiri 23.85° |
| R6 | JM Arya | 6 | Arya variant | Uses Lahiri 23.85° |
| R7 | JM Sehgal | 7 | Sehgal variant | Uses Lahiri 23.85° |

**Record for each run:**
- [ ] Sun's sign shown: ________
- [ ] Moon's sign shown: ________
- [ ] Lagna shown: ________
- [ ] Moon's nakshatra shown: ________
- [ ] Current Mahadasha shown: ________
- [ ] Result matches R1 exactly: [ ] Yes / [ ] No

**Expected result:** All 7 runs produce identical output because the engine ignores ayanamsaId.

**Reference ayanamsa values** (from standard Jagannatha Hora / Swiss Ephemeris, for Sept 15, 1982):

| Ayanamsa | Standard value (1982) | Expected if implemented |
|----------|-----------------------|------------------------|
| Lahiri | 23°37'00" (23.6167°) | App shows 23°50'50" (23.8474°) — 13.8' off |
| Raman | 22°47'00" (22.7833°) | Would shift every planet ~1° earlier |
| Krishnamurti | 23°47'00" (23.7833°) | Very close to Lahiri |
| Yukteshwar | 22°14'00" (22.2333°) | Shifts planets ~1.4° earlier than Lahiri |

---

## Part 10 — Gap Register

All gaps identified during code review, QA, and testing. Use this for triage and roadmap planning.

---

### GAP-001 — CRITICAL: Ayanamsa selection has no effect

**Severity:** Critical — functional correctness
**Module:** CalculationEngine, NewProfileView
**Description:** The ayanamsa picker stores an integer ID (1–7) in `Profile.ayanamsaId`, but `CalculationEngine.calculateChart` always calls `swissEph.lahiriAyanamsa(jd)` regardless of the ID. The ID is stored in `ChartData.ayanamsaType` for display but is never used to select a different calculation.
**Evidence:** `CalculationEngine.swift:25` — `let ayanamsaValue = swissEph.lahiriAyanamsa(jd)` — no branching on `ayanamsaId`.
**Impact:** Users selecting Raman, KP, Yukteshwar, or any other ayanamsa get Lahiri results. Charts, dashas, and yogas are wrong for all non-Lahiri selections.
**Fix:** Add ayanamsa dispatch in `CalculationEngine.calculateChart` and implement separate ayanamsa formulas in SwissEphemeris.

---

### GAP-002 — CRITICAL: Lahiri ayanamsa formula 14 arcminutes off

**Severity:** Critical — astronomical accuracy
**Module:** SwissEphemeris.lahiriAyanamsa
**Description:** The app computes Lahiri ayanamsa at 23.8474° (23°50'50") for September 15, 1982. The standard Lahiri value from Jagannatha Hora / Swiss Ephemeris for the same date is 23.6167° (23°37'00"). The discrepancy is 0.2307° = 13.84 arcminutes.
**Root cause:** The formula uses `ayanamsaAtJ2000 = 23.85°` and a simplified single-term nutation correction. The real Lahiri value at J2000 is 23.8510° but accumulated with a more accurate IAU precession model, not the simplified 50.2"/year used here.
**Impact:** Every sidereal planet longitude is shifted by ~14'. This is enough to:
- Change nakshatra pada for planets near nakshatra boundaries (each pada = 3°20')
- Change nakshatra lord for planets within 14' of a nakshatra boundary
- Change the entire Vimshottari Dasha sequence if Moon is near a nakshatra boundary

**Verification:**
```python
# App ayanamsa for 1982-09-15 (JD 2445228.0625)
days_since_j2000 = 2445228.0625 - 2451545.0  # = -6316.9375
app_ayanamsa = 23.85 + (50.2 / (3600 * 36525)) * days_since_j2000  # ≈ 23.847°

# Standard Swiss Ephemeris Lahiri: 23.6167°
# Discrepancy: 0.23° = 13.8 arcmin
```

**Fix:** Replace the simplified formula with the IAU standard precession model or use pre-tabulated values from the Swiss Ephemeris Lahiri table.

---

### GAP-003 — HIGH: Planet positions use simplified Keplerian model

**Severity:** High — astronomical accuracy
**Module:** SwissEphemeris.planetPositionTropical
**Description:** Planet longitudes are computed using a single-term Kepler equation with simplified orbital elements. Standard Vedic software uses VSOP87 (for outer planets, thousands of perturbation terms) and ELP2000/82 (for Moon, 1365 terms). Errors:
- Sun: ±0.01° (acceptable)
- Mercury/Venus: ±0.1–0.5° (sign changes possible near cusps)
- Mars: ±0.5–1.0° (significant)
- Jupiter/Saturn: ±0.5–2.0° (significant — can change sign)
- Rahu/Ketu (mean node): ±1.5° (true node differs from mean node by up to 1.7°)

**Impact:** Jupiter or Saturn sign placement can be wrong by 1 sign near ingress points.
**Fix:** Integrate full Swiss Ephemeris binary (`libswe`) via C bridging header, or implement VSOP87 truncated series.

---

### GAP-004 — HIGH: House system is Equal, not Placidus

**Severity:** High — system mismatch
**Module:** SwissEphemeris.houseCusps
**Description:** Code comment says "Simplified Placidus" but implementation is `houseAngle = ascendant + i * 30.0` — pure Equal House system. True Placidus requires iterative trigonometric computation of semi-arcs for each house cusp. At high latitudes (Chicago: 41.88°N), Placidus cusps differ from equal houses by 5–15° per house, completely changing which planets occupy which houses.
**Impact:** Yoga detection, Shadbala Dig Bala, and house-based predictions all use incorrect house placement.
**Fix:** Implement Placidus cusp algorithm (Meeus, Astronomical Algorithms ch. 14) or use SwissEph `swe_houses()`.

---

### GAP-005 — HIGH: Moon position approximation error up to 1°

**Severity:** High — dasha accuracy
**Module:** SwissEphemeris.moonPositionTropical
**Description:** The Moon's position is computed using 6 perturbation terms. ELP2000/82 uses 1365 terms. The simplified formula can be off by 0.5–1.0° for the Moon.
**Critical consequence:** Moon's nakshatra boundary falls every 13°20'. A 1° Moon error can push the Moon into the wrong nakshatra, changing the Vimshottari Dasha lord and invalidating the entire lifetime dasha sequence.
**Fix:** Use full ELP2000/82 or at minimum the 50-term approximation from Meeus.

---

### GAP-006 — MEDIUM: Ashtakavarga algorithm is a stub

**Severity:** Medium — feature completeness
**Module:** AshtakavargaViewModel.calculateAshtakavargaFromChart
**Description:** BAV is computed by incrementing `bav[planet][planet.sign]` — placing 1 bindu only in the sign each planet already occupies. True Ashtakavarga uses 8 reference tables (one per contributing planet + Lagna) to cast bindus into each sign based on relative position offset. Expected bindu range is 0–8 per cell with SAV totals of 18–48 per sign. The stub produces only 0 or 1 per cell with SAV totals of 0–9.
**Fix:** Implement the standard 8-planet Ashtakavarga reference tables as specified in BPHS (Brihat Parashara Hora Shastra).

---

### GAP-007 — MEDIUM: Prediction text non-deterministic

**Severity:** Medium — reproducibility
**Module:** LocalPredictionGenerator
**Description:** Multiple methods use `randomElement()` to select prediction phrases. The same profile shown twice produces different Overview, Planet, and Yoga Impact text.
**Impact:** Users cannot reliably reference their predictions, screenshots differ between sessions, and snapshot testing is impossible.
**Fix:** Seed a deterministic random generator with `profile.id` hash + current dasha period hash, or remove randomness by using deterministic rule-based selection.

---

### GAP-008 — MEDIUM: Planetary dignity signs had wrong values

**Severity:** Medium — interpretation accuracy
**Module:** LocalPredictionGenerator (exaltedSigns, debilitatedSigns, ownSigns)
**Status:** Fixed in commit `1623533`.
**Was wrong:** Moon exaltation = Cancer (3), Mars exaltation = Virgo (5), Jupiter exaltation = Gemini (2), Sun own sign = Aries (0).
**Now correct:** Moon exaltation = Taurus (1), Mars exaltation = Capricorn (9), Jupiter exaltation = Cancer (3), Sun own sign = Leo (4).

---

### GAP-009 — LOW: Profile editing not implemented

**Severity:** Low — UX completeness
**Module:** ProfilesViewModel, MainView
**Description:** Once a profile is saved, there is no edit action. Users who enter wrong birth time, coordinates, or timezone must delete and recreate the profile from scratch.
**Fix:** Add an Edit Profile sheet (reuse NewProfileView form pre-populated with existing values).

---

### GAP-010 — LOW: No location search or geocoding

**Severity:** Low — UX convenience
**Module:** NewProfileView
**Description:** Users must manually enter latitude and longitude as raw decimal numbers. Most users do not know their precise coordinates. The Place Name field is free-text with no auto-lookup.
**Fix:** Integrate MapKit's MKLocalSearch or a geocoding API to populate coordinates from city name.

---

### GAP-011 — LOW: Timezone list incomplete (34 of ~400 IANA zones)

**Severity:** Low — data completeness
**Status:** Improved from 14 to 34 timezones in latest commit.
**Remaining gap:** Users born in Brazil, most of Africa, Central Asia, and Oceania still cannot find their timezone. 34 of ~400 standard IANA timezone identifiers are covered.
**Fix:** Populate the picker from `TimeZone.knownTimeZoneIdentifiers` with optional search/filter.

---

### GAP-012 — LOW: Dasha row expand-all by default

**Severity:** Low — performance
**Module:** DashaView, DashaRowView
**Description:** All 9 Mahadasha rows start fully expanded. With 9 Mahadashas × 9 Antardashas × 9 Pratyantardashas, up to 729 rows render on load. On first appearance this creates a large layout pass.
**Fix:** Default all Mahadasha rows to collapsed; expand only the current Mahadasha automatically.

---

### GAP-013 — LOW: Non-current Dasha rows not selectable

**Severity:** Low — UX
**Module:** DashaRowView
**Description:** `onTapGesture` inside DashaRowView only fires when `isCurrent == true`. Users cannot tap non-current periods to inspect them. The `selectedDasha` binding is effectively unused.
**Fix:** Remove the `isCurrent` guard from the tap gesture.

---

### GAP-014 — LOW: Yoga description truncated at 2 lines, no expand

**Severity:** Low — UX completeness
**Module:** YogaRowView
**Description:** `.lineLimit(2)` truncates yoga descriptions with no "Read more" or detail sheet.
**Fix:** Add a disclosure group or sheet to show full description.

---

## Part 12 — Comprehensive Tab-by-Tab Verification (New Profile)

> **Profile under test:** The newly created profile from Part 1. All steps in this section use this profile exclusively.
> **Reference date:** 2026-03-21

### Step 12.1 — Dasha Tab Verification

1. Click the **Dasha** tab while the new profile is selected.

**VERIFY:**
- [ ] Dasha tab loads without crash
- [ ] Ketu Mahadasha shown as partial at birth
- [ ] Venus follows Ketu for 20 years (~1986–2006)
- [ ] Sun follows Venus for 6 years (~2006–2012)
- [ ] Moon follows Sun for 10 years (~2012–2022)
- [ ] Mars is highlighted as **Current** (we are in 2026, Mars Mahadasha 2022–2029)
- [ ] Mars Mahadasha antardasha for today (Mar 2026) shows Mars–Jupiter or current sub-period
- [ ] Three nesting levels visible: Mahadasha → Antardasha → Pratyantardasha
- [ ] All rows expandable/collapsible
- [ ] **Keyboard shortcut** `⌘+D` or `⌃+D` jumps to Dasha tab (if implemented)
- [ ] **Tooltip** on Dasha tab icon shows "Dasha" (if implemented)
- [ ] Loading spinner appears if chart data is not yet cached

**Take screenshot** of Dasha tab.

---

### Step 12.2 — Shadbala Tab Verification

1. Click the **Shadbala** tab while the new profile is selected.

**VERIFY:**
- [ ] Shadbala tab loads without crash
- [ ] Table renders with 7 planet rows (Sun through Saturn; Rahu/Ketu excluded)
- [ ] Naisargika Bala column values are present and plausible (Sun=60, Moon≈51, Venus≈43, etc.)
- [ ] Total column shows sortable values
- [ ] Exalted planets show green up-arrow (⬆) indicator
- [ ] Debilitated planets show red down-arrow (⬇) indicator
- [ ] No force-unwrap crash when sorting
- [ ] **Keyboard shortcut** `⌘+S` or `⌃+S` jumps to Shadbala tab (if implemented)
- [ ] **Tooltip** on Shadbala tab icon shows "Shadbala" (if implemented)
- [ ] Loading spinner appears if chart data is not yet cached

**Reference Naisargika Bala values (fixed by tradition):**

| Planet | Naisargika Bala (Virupas) |
|--------|--------------------------|
| Sun | 60.0 |
| Moon | 51.43 |
| Venus | 42.86 |
| Jupiter | 34.29 |
| Mercury | 25.71 |
| Mars | 17.14 |
| Saturn | 8.57 |

**Take screenshot** of Shadbala tab.

---

### Step 12.3 — Ashtakavarga Tab Verification

1. Click the **Ashtakavarga** tab while the new profile is selected.

**VERIFY:**
- [ ] Ashtakavarga tab loads without crash
- [ ] 8 planet rows shown (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu)
- [ ] 12 sign columns shown
- [ ] Bindu values appear in grid cells (0 or 1 for current stub implementation)
- [ ] SAV Total row shows correct sums per sign
- [ ] **Keyboard shortcut** `⌘+A` or `⌃+A` jumps to Ashtakavarga tab (if implemented)
- [ ] **Tooltip** on Ashtakavarga tab icon shows "Ashtakavarga" (if implemented)
- [ ] Loading spinner appears if chart data is not yet cached

**Expected raw counts for this chart (stub implementation):**
- Leo: Sun, Moon → 2 bindus
- Cancer: Venus → 1 bindu
- Capricorn: Mercury → 1 bindu
- Sagittarius: Mars → 1 bindu
- Libra: Jupiter → 1 bindu
- Virgo: Saturn → 1 bindu
- Scorpio: Rahu → 1 bindu
- Taurus: Ketu → 1 bindu
- All other signs: 0 bindus

**Take screenshot** of Ashtakavarga tab.

---

### Step 12.4 — Yogas Tab Verification

1. Click the **Yogas** tab while the new profile is selected.

**VERIFY:**
- [ ] Yogas tab loads without crash
- [ ] Filter picker (category dropdown) works — switching categories filters the list
- [ ] Sort options (Strength, Name, Category) reorder the list
- [ ] Each yoga card shows: name, category, planets, houses, strength %, description
- [ ] "Rare" badge appears only on yogas with strength ≥ 0.9 OR category contains "rare"
- [ ] "Powerful" badge appears on yogas with 0.75 ≤ strength < 0.9
- [ ] If no yogas detected: message reads "No yoga formations were detected in this chart"
- [ ] **Keyboard shortcut** `⌘+Y` or `⌃+Y` jumps to Yogas tab (if implemented)
- [ ] **Tooltip** on Yogas tab icon shows "Yogas" (if implemented)
- [ ] Loading spinner appears if chart data is not yet cached

**Take screenshot** of Yogas tab.

---

### Step 12.5 — Predictions Tab Overview Verification

1. Click the **Predictions** tab while the new profile is selected.

**VERIFY:**
- [ ] Predictions tab loads without crash
- [ ] Overview sub-tab is shown by default
- [ ] Overview text mentions Mars Mahadasha (currently active in 2026)
- [ ] Dasha sub-tab, Planets sub-tab, Yogas sub-tab, Day sub-tab, Month sub-tab are all visible/accessible
- [ ] **Keyboard shortcut** `⌘+P` or `⌃+P` jumps to Predictions tab (if implemented)
- [ ] **Tooltip** on Predictions tab icon shows "Predictions" (if implemented)
- [ ] Loading spinner appears if predictions are being generated
- [ ] If predictions are not ready, a wait symbol (spinner) is shown

**Text highlighting verification:**
- [ ] Planet names (Sun, Moon, Mars, etc.) highlighted in **orange bold**
- [ ] Sign names (Leo, Cancer, Capricorn, etc.) highlighted in **blue bold**
- [ ] Yoga category names highlighted in **green bold**
- [ ] Only matched words highlighted — no text between matches colored

**Take screenshot** of Predictions Overview.

---

### Step 12.6 — Predictions: Dasha Sub-Tab

1. Inside the Predictions tab, click the **Dasha** sub-tab.

**VERIFY:**
- [ ] Dasha sub-tab content loads
- [ ] Mars is shown as the current Mahadasha period
- [ ] Timeline bar chart shows Mars period highlighted
- [ ] Proportional horizontal bars visible for Mahadasha sequence
- [ ] Planet color legend visible below bars
- [ ] NO placeholder text "Visual timeline representation would appear here"
- [ ] Loading spinner appears if computation is in progress

**Take screenshot** of Dasha sub-tab.

---

### Step 12.7 — Predictions: Planets Sub-Tab

1. Inside the Predictions tab, click the **Planets** sub-tab.

**VERIFY:**
- [ ] Planets sub-tab content loads
- [ ] Per-planet prediction cards visible for all 9 planets (Sun through Saturn)
- [ ] Each card shows planet name, current status, and prediction text
- [ ] No empty/blank cards for any planet
- [ ] Loading spinner appears if computation is in progress

**Take screenshot** of Planets sub-tab.

---

### Step 12.8 — Predictions: Yogas Sub-Tab

1. Inside the Predictions tab, click the **Yogas** sub-tab.

**VERIFY:**
- [ ] Yogas Impact sub-tab content loads
- [ ] Yoga predictions are shown (may be empty if no significant yogas detected)
- [ ] Loading spinner appears if computation is in progress

**Take screenshot** of Yogas sub-tab.

---

### Step 12.9 — Day Prediction: Summary and Hourly Breakdown

1. Inside the Predictions tab, click the **Day** sub-tab.

**VERIFY (Summary at Top):**
- [ ] **Date picker** is shown at the top of the tab (defaults to today)
- [ ] Header row shows "Day Lord: ☿ Mercury" (2026-03-21 is a Wednesday; Mercury rules Wednesday)
- [ ] Summary text is shown at the top (e.g., "Mercury-ruled day brings a [quality] influence under the Mars–Saturn dasha period...")
- [ ] Two callout cards appear below summary: **Best Hour** (green) and **Challenging Hour** (red)

**VERIFY (Best/Worst Hour per Category):**
- [ ] Each category (Career, Finance, Health, Relationships, Spirituality) has a **best hour** identified and highlighted
- [ ] Each category (Career, Finance, Health, Relationships, Spirituality) has a **challenging/worst hour** identified and highlighted
- [ ] Best hour card shows the hour and category score
- [ ] Worst hour card shows the hour and category score

**VERIFY (24-Hour Table):**
- [ ] **24 rows** are shown in the hourly table — one per civil hour (00:00–23:00)
- [ ] Each row contains: hour range | hora lord symbol | Career bar | Finance bar | Health bar | Relationships bar | Spirituality bar | Overall %
- [ ] Rows with overall score ≥ 70% have a **green tint**; rows < 50% have a **red tint**
- [ ] Planetary hora symbols follow the Chaldean sequence (spot-check: 00:00 ☿, 05:00 ☀️, 12:00 ☀️, 19:00 ☀️)

**VERIFY (PDF Export):**
- [ ] **Export as PDF** button or menu item is present
- [ ] Clicking exports the day prediction as a PDF file
- [ ] PDF contains the full day table with all hours and categories
- [ ] PDF is named appropriately (e.g., "Day Prediction - 2026-03-21.pdf")

**VERIFY (Keyboard Shortcuts and Tooltips):**
- [ ] **Keyboard shortcut** `⌘+E` or similar triggers PDF export (if implemented)
- [ ] **Tooltip** on Export/PDF button shows "Export as PDF" (if implemented)
- [ ] **Menu item** File → Export Day Prediction (or similar) is present (if menus implemented)
- [ ] **Tooltip** on Day tab shows "Day predictions with hourly breakdown" (if implemented)

**VERIFY (Loading Indicator):**
- [ ] When profile is selected and day tab is opened before data is ready, a loading spinner is shown
- [ ] When date is changed and prediction is recalculating, a loading spinner is shown

**Take screenshot** of Day prediction tab with summary and hourly table.

---

### Step 12.10 — Day Prediction: Future Dates (13+ Months Apart)

1. In the Day tab, change the date picker to **3 future dates** that are at least 13 months apart from each other.

**Test future dates (example — adjust to current reference):**
- Date 1: **April 15, 2027** (13 months from Sep 1982 reference — future)
- Date 2: **July 20, 2028** (13+ months from Date 1)
- Date 3: **October 5, 2029** (13+ months from Date 2)

**For each future date, VERIFY:**
- [ ] Date picker updates to the selected future date
- [ ] Header updates to show the correct Day Lord for that date
- [ ] Summary text updates for the new date and dasha period
- [ ] Best/Challenging hour callout cards update for the new date
- [ ] 24-hour table updates with correct hora lord sequence
- [ ] Category best/worst hours are recalculated and displayed
- [ ] Loading spinner appears during recalculation
- [ ] Dasha label shows the correct Mahadasha–Antardasha for that future date
  - April 2027: Mars Mahadasha, Mercury Antardasha
  - July 2028: Mars Mahadasha, Moon Antardasha
  - October 2029: Mars Mahadasha, Sun Antardasha
- [ ] **Take screenshot** of each future date day prediction

---

### Step 12.11 — Day Prediction: Past Dates (2+ Years Apart)

1. In the Day tab, change the date picker to **3 past dates** that are at least 2 years apart from each other.

**Test past dates (example — adjust to current reference):**
- Date 1: **March 21, 2024** (2 years before reference)
- Date 2: **June 15, 2022** (2+ years from Date 1)
- Date 3: **September 10, 2020** (2+ years from Date 2)

**For each past date, VERIFY:**
- [ ] Date picker updates to the selected past date
- [ ] Header updates to show the correct Day Lord for that date
- [ ] Summary text updates for the new date and dasha period
- [ ] Best/Challenging hour callout cards update for the new date
- [ ] 24-hour table updates with correct hora lord sequence
- [ ] Category best/worst hours are recalculated and displayed
- [ ] Loading spinner appears during recalculation
- [ ] Dasha label shows the correct Mahadasha–Antardasha for that past date
  - March 2024: Mars Mahadasha, Jupiter Antardasha
  - June 2022: Moon Mahadasha, Venus Antardasha
  - September 2020: Moon Mahadasha, Venus Antardasha
- [ ] **Take screenshot** of each past date day prediction

---

### Step 12.12 — Month Prediction: Summary and Daily Breakdown

1. Inside the Predictions tab, click the **Month** sub-tab.

**VERIFY (Summary at Top):**
- [ ] **Month/year header** with left `‹` and right `›` chevron navigation buttons
- [ ] Header shows the current month/year (e.g., "March 2026")
- [ ] Dasha label shows active period (e.g., "Dasha: Mars–Saturn")
- [ ] **Summary text** is shown below header describing the month's overall quality
- [ ] Summary includes **best days** identified for each category (e.g., "Best days for Career: Mar 5, Mar 12")
- [ ] Summary includes **not so good days** for each category (e.g., "Challenging days for Health: Mar 8, Mar 21")

**VERIFY (Per-Category Good/Not So Good Days):**
- [ ] Career: best day(s) and challenging day(s) identified in summary or UI
- [ ] Finance: best day(s) and challenging day(s) identified in summary or UI
- [ ] Health: best day(s) and challenging day(s) identified in summary or UI
- [ ] Relationships: best day(s) and challenging day(s) identified in summary or UI
- [ ] Spirituality: best day(s) and challenging day(s) identified in summary or UI

**VERIFY (Daily Table):**
- [ ] Column headers: **Day | Lord | Career | Finance | Health | Rels. | Spirit. | Overall**
- [ ] One row per calendar day (31 rows for March)
- [ ] Each row shows: `DD` + weekday abbrev | planet symbol | 5 coloured bars | `XX%`
- [ ] Rows with overall ≥ 70% have a **green tint**; rows < 50% have a **red tint**; others are plain

**VERIFY (PDF Export):**
- [ ] **Export as PDF** button or menu item is present
- [ ] Clicking exports the month prediction as a PDF file
- [ ] PDF contains the full month table with all days and categories
- [ ] PDF is named appropriately (e.g., "Month Prediction - March 2026.pdf")
- [ ] PDF includes the summary section at the top

**VERIFY (Keyboard Shortcuts and Tooltips):**
- [ ] **Keyboard shortcut** for PDF export works (if implemented)
- [ ] **Tooltip** on Export/PDF button shows "Export as PDF" (if implemented)
- [ ] **Menu item** File → Export Month Prediction (or similar) is present (if menus implemented)
- [ ] **Tooltip** on Month tab shows "Month predictions with daily breakdown" (if implemented)

**VERIFY (Loading Indicator):**
- [ ] When month tab is opened before data is ready, a loading spinner is shown
- [ ] When month is changed and prediction is recalculating, a loading spinner is shown

**Take screenshot** of Month prediction tab with summary and daily table.

---

### Step 12.13 — Month Prediction: Future Months (2 Years Apart)

1. In the Month tab, navigate to **3 future months** that are approximately 2 years apart.

**Test future months (example):**
- Month 1: **April 2027** (13+ months from March 2026)
- Month 2: **July 2028** (15 months from April 2027)
- Month 3: **September 2029** (14 months from July 2028)

**For each future month, VERIFY:**
- [ ] Navigation `›` button changes to correct month
- [ ] Header shows correct month/year (e.g., "April 2027")
- [ ] Summary text updates for the new month and dasha period
- [ ] Best days / challenging days for each category update
- [ ] 30–31 rows shown (correct day count for the month)
- [ ] Loading spinner appears during recalculation
- [ ] Dasha label shows correct Mahadasha–Antardasha:
  - April 2027: Mars Mahadasha, Mercury Antardasha
  - July 2028: Mars Mahadasha, Moon Antardasha
  - September 2029: Mars Mahadasha, Sun Antardasha
- [ ] **Take screenshot** of each future month prediction

---

### Step 12.14 — Month Prediction: Past Months (3+ Years Apart)

1. In the Month tab, navigate to **3 past months** that are at least 3 years apart.

**Test past months (example):**
- Month 1: **January 2024** (26 months before March 2026)
- Month 2: **February 2022** (23 months from January 2024)
- Month 3: **March 2020** (23 months from February 2022)

**For each past month, VERIFY:**
- [ ] Navigation `‹` button changes to correct month
- [ ] Header shows correct month/year (e.g., "January 2024")
- [ ] Summary text updates for the new month and dasha period
- [ ] Best days / challenging days for each category update
- [ ] Correct number of rows shown for the month (31, 30, 28, etc.)
- [ ] Loading spinner appears during recalculation
- [ ] Dasha label shows correct Mahadasha–Antardasha:
  - January 2024: Mars Mahadasha, Jupiter Antardasha
  - February 2022: Moon Mahadasha, Venus Antardasha
  - March 2020: Moon Mahadasha, Venus Antardasha
- [ ] **Take screenshot** of each past month prediction

---

### Step 12.15 — Menu Items, Keyboard Shortcuts, and Tooltips Summary

For each tab and sub-tab, verify the following accessibility features are present:

| Tab | Keyboard Shortcut | Tooltip Text | Menu Item |
|-----|------------------|--------------|-----------|
| Chart | `⌘+1` (if numbered) | "Chart" or "Varga Chart" | View → Chart (if menus) |
| Dasha | `⌘+D` or `⌃+D` | "Dasha" | View → Dasha (if menus) |
| Shadbala | `⌘+B` or `⌃+B` | "Shadbala" | View → Shadbala (if menus) |
| Ashtakavarga | `⌘+K` or `⌃+K` | "Ashtakavarga" | View → Ashtakavarga (if menus) |
| Yogas | `⌘+Y` or `⌃+Y` | "Yogas" | View → Yogas (if menus) |
| Predictions | `⌘+P` or `⌃+P` | "Predictions" | View → Predictions (if menus) |
| Day Export | `⌘+E` or `⌃+E` | "Export as PDF" | File → Export Day Prediction (if menus) |
| Month Export | `⌘+⇧+E` or `⌃+⇧+E` | "Export as PDF" | File → Export Month Prediction (if menus) |
| Print | `⌘+P` | "Print" | File → Print (if menus) |

**VERIFY:**
- [ ] Each tab has a keyboard shortcut that navigates directly to it
- [ ] Each toolbar button has a tooltip describing its function
- [ ] Each export/print action has a keyboard shortcut
- [ ] Each export/print action has a tooltip
- [ ] Menu bar contains items for each tab and export action (if menus are implemented)

---

### Step 12.16 — Loading/Waiting Indicators Final Check

**VERIFY the following scenarios all show a loading spinner or wait symbol:**

| Scenario | Trigger | Expected Indicator |
|----------|---------|-------------------|
| Profile just selected | Click a different profile in sidebar | Spinner in main content area until chart loads |
| Chart not yet cached | Select new profile for first time | Spinner replaces empty content |
| Dasha computing | Click Dasha tab on new profile | Spinner until Dasha sequence computed |
| Predictions generating | Click Predictions tab | Spinner until overview text generated |
| Day prediction recalculating | Change date in Day tab | Spinner until hourly scores recalculated |
| Month prediction recalculating | Navigate to different month | Spinner until daily scores recalculated |
| PDF exporting | Click Export PDF button | Spinner or progress indicator during export |

**VERIFY no scenario leaves a blank/empty area without a spinner or "Loading..." text when data is being computed.**

---

## Part 11 — Testing Checklist Summary

Use this before each release:

### Functional
- [ ] Profile creation with valid North American 1980s birth data saves correctly
- [ ] Stored `dobUTC` round-trips correctly through `Profile.dobDate`
- [ ] All 7 tabs load without crash for the newly created profile
- [ ] Chart shows correct planet signs per expected table
- [ ] South Indian chart has all 12 sign cells (4×4 grid, no missing Leo)
- [ ] Lagna marker appears in Capricorn
- [ ] Dasha shows Ketu partial at birth → Venus → Sun → Moon → Mars (current)
- [ ] Mars Mahadasha highlighted as Current in 2026
- [ ] Shadbala table renders all 7 planets with positive values
- [ ] Ashtakavarga grid loads (even though values are stub)
- [ ] Yogas tab loads, filter and sort work
- [ ] Predictions shows Mars dasha text, no placeholder rectangles in timeline
- [ ] Text highlighting colors only matched words (not text between matches)
- [ ] Profile deletion removes profile from sidebar
- [ ] Switching profiles updates all tabs

### Part 12 Comprehensive (New Profile)
- [ ] Newly created profile is auto-selected after creation
- [ ] All 7 tabs (Chart, Dasha, Shadbala, Ashtakavarga, Yogas, Predictions + sub-tabs) accessible
- [ ] Day prediction shows summary at top with best/worst hour per category
- [ ] Day prediction: 3 future dates (13+ months apart) verified
- [ ] Day prediction: 3 past dates (2+ years apart) verified
- [ ] Month prediction shows summary at top with best/not-so-good days per category
- [ ] Month prediction: 3 future months (2+ years apart) verified
- [ ] Month prediction: 3 past months (3+ years apart) verified
- [ ] Day prediction PDF export works
- [ ] Month prediction PDF export works
- [ ] Keyboard shortcuts present on all tabs (toolbar)
- [ ] Tooltip texts present on all toolbar buttons
- [ ] Menu items present for all tabs and export actions
- [ ] Loading spinner appears when profile selected before data ready
- [ ] Loading spinner appears when date/month changed and recalculating
- [ ] Switching between sample profiles updates chart correctly

### Per-Ayanamsa
- [ ] All 7 ayanamsa options selectable in picker
- [ ] All 7 produce identical results (confirming GAP-001 is still present, or confirming it is fixed)

### Regression
- [ ] 182 unit tests pass: `xcodebuild test -only-testing:ParashariPrecisionTests`
- [ ] Release build succeeds: `xcodebuild -configuration Release`
- [ ] App launches from `~/Applications/myApps/ParashariPrecision.app`

---

## Appendix A — Manual Calculation Reference

### Julian Day
```
JD = floor(365.25 × (Y + 4716)) + floor(30.6001 × (M + 1)) + D + B − 1524.5
where B = 2 − A + floor(A/4), A = floor(Y/100)
For M ≤ 2: Y−=1, M+=12
```
For 1982-09-15 13:30 UTC: **JD = 2445228.0625**

### Lahiri Ayanamsa (app formula)
```
T = (JD − 2451545) / 36525
days_since_J2000 = JD − 2451545
precession = (50.2 / (3600 × 36525)) × days_since_J2000
nutation = −0.83 × sin(125° − 0.052 × days_since_J2000) / 3600
ayanamsa = 23.85 + precession + nutation
```
For 1982-09-15: **23.8474° = 23°50'50"**

### Nakshatra from Sidereal Longitude
```
nakshatra_size = 360 / 27 = 13.333...°
nakshatra_index = floor(moon_sid / 13.333)
lord_index = nakshatra_index % 9
lord_cycle = [Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury]
```
For Moon at 125.498°: index = 9 → lord_index = 0 → **Ketu**

### Antardasha Duration
```
antardasha_years = (AD_lord_total_years / 120) × MD_lord_total_years
```
Example: Jupiter AD within Mars MD = (16/120) × 7 = **0.933 years ≈ 11.2 months**

---

## Appendix B — External Reference Tools

| Tool | URL / Command | Use |
|------|--------------|-----|
| Swiss Ephemeris swetest | `brew install swisseph` → `swetest` | Planet position ground truth |
| Jagannatha Hora | Free Windows/Wine software | Full Vedic calculation reference |
| astro.com Extended Chart | Web — Natal + Vedic options | Secondary position verification |
| Drik Panchang | Web — Vimshottari calculator | Dasha sequence reference |
| Kala Occult Software | Commercial — accurate BAV | Ashtakavarga reference |

---

*Testing script generated 2026-03-21. Expected values computed from app's own SwissEphemeris.swift and CalculationEngine.swift source code.*
