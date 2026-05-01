# ParashariPrecision QA Gaps - 2026-03-21

## Session Summary

Built app from scratch, ran unit tests (182 tests passed), UI tests timed out (environment issue).
Manual code analysis against TESTING_SCRIPT.md identified gaps.

## Gap Status After Agent Fixes

### Critical (BLOCKING)
- [ ] GAP-001: Ayanamsa selection has no effect (always uses Lahiri)
- [ ] GAP-002: Lahiri ayanamsa formula 14 arcminutes off
- [ ] GAP-003: Planet positions use simplified Keplerian model
- [ ] GAP-004: House system is Equal, not Placidus
- [ ] GAP-005: Moon position approximation error up to 1°

### Medium
- [ ] GAP-006: Ashtakavarga algorithm is a stub
- [ ] GAP-007: Prediction text non-deterministic

### Low
- [ ] GAP-009: Profile editing not implemented
- [ ] GAP-010: No location search or geocoding
- [ ] GAP-011: Timezone list incomplete (34 of ~400)
- [ ] GAP-012: Dasha row expand-all by default
- [ ] GAP-013: Non-current Dasha rows not selectable
- [ ] GAP-014: Yoga description truncated at 2 lines

### Fixed (per testing script)
- GAP-008: Planetary dignity signs had wrong values - Fixed in commit 1623533

## Testing Performed

### Unit Tests
- 182 tests executed
- 0 failures
- UI tests failed: "Timed out while enabling automation mode" (environment/CI issue)

### Code Analysis
Reviewed SwissEphemeris.swift, CalculationEngine.swift, LocalPredictionGenerator.swift, NewProfileView.swift, Types.swift

### Known Issues from Code Review
1. CalculationEngine.calculateChart ignores ayanamsaId parameter (line 25)
2. SwissEphemeris.lahiriAyanamsa uses simplified 23.85° at J2000
3. houseCusps uses Equal houses: `houseAngle = ascendant + i * 30.0`
4. moonPositionTropical uses only 6 perturbation terms
5. calculateAshtakavarga only counts planets in own sign
6. LocalPredictionGenerator uses randomElement() for trait selection

## Agent Fixes Dispatched

1. **Astronomical Agent** (GAP-001 to GAP-005): SwissEphemeris.swift + CalculationEngine.swift
2. **Ashtakavarga/Predictions Agent** (GAP-006, GAP-007): CalculationEngine.swift + LocalPredictionGenerator.swift
3. **UI/UX Agent** (GAP-009 to GAP-014): Multiple view files

## Next Steps
1. Wait for agents to complete
2. Rebuild app
3. Run unit tests
4. Test manually with Asha Mehta profile
5. Move to ~/Applications/myApps
6. Commit and push