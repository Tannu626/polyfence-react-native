# Polyfence React Native — Staff engineer peer review

**Scope:** `polyfence-react-native` thin bridge vs **polyfence-core** (Kotlin/Swift) and **polyfence-flutter** API parity.  
**Review date:** 2026-03-27  
**Repositories referenced:** `polyfence-react-native`, `polyfence-core`, `polyfence-flutter` (local paths as reviewed).

---

## Critical

### Native delegate / tracker API mismatch (Android + iOS)

**Files:** `android/src/main/kotlin/io/polyfence/reactnative/PolyfenceModule.kt`, `ios/PolyfenceModule.swift`  
**Issue:** The bridge implements `PolyfenceCoreDelegate` with signatures such as `onGeofenceEvent(zoneId:, ...)`, `onError(errorCode:, errorMessage:, ...)`, and calls `locationTracker?.setDelegate(this)`. In **polyfence-core**, the delegate is **map-based** (`onGeofenceEvent(eventData: Map<String, Any>)`, `onError(errorData: Map<String, Any>)`, etc.), and `LocationTracker` exposes **`setCoreDelegate`**, not `setDelegate`.  
**Fix:** Implement the four map-based delegate methods, call the correct registration API (`setCoreDelegate` / assigning `coreDelegate`), and map payloads to RN events in one place.

### iOS: `LocationTracker.shared` and `setDelegate`

**File:** `ios/PolyfenceModule.swift`  
**Issue:** Uses `LocationTracker.shared.setBridgePlatform(...)` and `locationTracker?.setDelegate(self)`. In the reviewed **polyfence-core** tree, `LocationTracker` has **`weak var coreDelegate`** and **no** `shared` singleton or `setDelegate` in the searched sources.  
**Fix:** Use the instance you own: set `locationTracker?.coreDelegate = self`, call `setBridgePlatform` on that instance (or the pattern core documents for telemetry).

### `dispose()` missing on native modules

**Files:** `src/Polyfence.ts` vs `PolyfenceModule.kt`, `PolyfenceModule.swift`, `PolyfenceModule.m`  
**Issue:** TypeScript calls `NativePolyfence.dispose()` but there is no `@ReactMethod dispose` on Android, no `@objc` / `RCT_EXTERN_METHOD` for `dispose` on iOS. Runtime failure when used.  
**Fix:** Implement native `dispose` (stop tracking, clear delegate, release references) and export it on both platforms.

### Battery API: JS ↔ Android name mismatch

**Files:** `src/Polyfence.kt` (calls) vs `PolyfenceModule.kt` (`@ReactMethod` names)  
**Issue:** JS uses `batteryOptimizationStatus` and `requestBatteryOptimizationExemption`; Android exposes `checkBatteryOptimization` and `requestBatteryOptimization`. RN resolves native methods by name — these calls will not reach native code.  
**Fix:** Rename native methods to match the TypeScript surface (or add JS-named wrappers).

### Battery API missing on iOS

**Files:** `src/Polyfence.ts` vs `ios/PolyfenceModule.swift`, `ios/PolyfenceModule.m`  
**Issue:** No corresponding `@objc` methods or `RCT_EXTERN_METHOD` entries. Calling these from JS on iOS will throw.  
**Fix:** Implement documented no-op or stub behavior (e.g. return `{ isIgnoringOptimizations: true, manufacturer: "apple" }` and `true` for exemption) and export.

### Android `resetConfiguration` is a no-op

**File:** `android/.../PolyfenceModule.kt` (`resetConfiguration`) vs `polyfence-core` `LocationTracker.onStartCommand`  
**Issue:** Bridge sends an intent with `action = "RESET_CONFIG"`. Core’s `when (intent?.action)` only handles `START_TRACKING`, `STOP_TRACKING`, `ADD_ZONE`, `REMOVE_ZONE`, `CLEAR_ZONES`, `UPDATE_CONFIG`. **`RESET_CONFIG` is never handled.**  
**Fix:** Use a supported path (e.g. config via `UPDATE_CONFIG` with reset semantics) or add a real reset action in core and consume it here.

---

## Major

### Wire payloads vs exported TypeScript types

**Files:** `src/types.ts` vs native event maps and return values  
**Issue:**

- `getZoneStates`: core/Android return a **`Map<String, Boolean>`**-style shape; TS advertises **`ZoneState[]`**.
- Geofence events: native sends **flat** maps with **`eventType` in UPPERCASE** (`ENTER` / `EXIT`, etc.) and top-level coordinates; TS **`GeofenceEvent`** expects nested **`location`** and **lowercase** `type`.
- `onPerformance`: often receives `{ type: "status" | ..., trackingEnabled, zonesCount, ... }`, not **`RuntimeStatus`**.
- Errors: native uses **`code` / `message`**; TS expects **`PolyfenceError.type`**, etc.

**Fix:** Normalize in TS before invoking callbacks, or change public types + document raw shapes, or add explicit adapter functions in `Polyfence.ts`.

### iOS: `hasListeners` drops events

**File:** `ios/PolyfenceModule.swift`  
**Issue:** `sendLocationEvent` / `sendGeofenceEvent` / etc. return early when `hasListeners` is false. Events that fire before JS subscribes are **lost**. Android uses `DeviceEventEmitter` without this gate — behavior differs.  
**Fix:** Remove the guard, or buffer with a cap, or document a strict subscribe-before-start contract.

### Android `requestPermissions` does not request

**File:** `android/.../PolyfenceModule.kt`  
**Issue:** Only checks `hasAllRequiredPerms` and resolves; does not show the system permission UI. Misleading vs method name and vs Flutter behavior.  
**Fix:** Integrate real permission requests or rename to `checkPermissions` and update docs.

### iOS `requestPermissions` and `.notDetermined`

**File:** `ios/PolyfenceModule.swift`  
**Issue:** Treats `.notDetermined` as **granted** (`granted = true`). Callers may proceed as if permission was already given.  
**Fix:** Return `false` until status is determined, or use a tri-state / callback after the user responds.

### `initialize` config shape: nested `config` vs flat TS

**Files:** `src/Polyfence.ts`, native `initialize`  
**Issue:** Native reads `configMap["config"]` for `pluginVersion` and `disableAlertNotifications`, while TS passes a **flat** `PolyfenceConfiguration`. Those fields never reach native unless the app manually wraps `{ config: { ... } }`.  
**Fix:** Have TS merge/wrap to match Flutter/native contract, or read flat keys in native.

### `getErrorHistory` options differ by platform

**Files:** `src/Polyfence.ts`, Android `getErrorHistory`, iOS `getErrorHistory`  
**Issue:** TS passes `{ limit?: number }`. Android reads **`timeRangeMs`** and **`errorTypes`** — **`limit` is ignored**. iOS uses `limit`.  
**Fix:** Map `limit` on Android to core’s API or unify option shapes.

### Telemetry / README vs Flutter

**Files:** `README.md`, Flutter `AnalyticsConfig`  
**Issue:** README describes opt-out with `analyticsEnabled: false`; Flutter documents **`disableTelemetry`**. Cross-platform integrators can misconfigure.  
**Fix:** Align naming and behavior with Flutter and what core actually reads.

### `PolyfenceLocation.speed` units (docs vs core)

**Files:** `README.md`, `doc/API_SURFACE.md`, `polyfence-core` location maps  
**Issue:** Docs/types say **m/s**; core builds `speed` with a **m/s × 3.6** comment (km/h-style). Bridge forwards values without conversion.  
**Fix:** Normalize in bridge or correct docs/types.

### `dispose` / singleton lifecycle

**Files:** `src/Polyfence.ts`  
**Issue:** No **`_isDisposed`** guard (unlike Flutter). After `dispose()`, `Polyfence.instance` remains usable; combined with missing native `dispose`, lifecycle is unsafe.  
**Fix:** After native `dispose` exists, add explicit disposed state or document reuse rules.

---

## Minor

### Dead `pendingBridgePlatform` in Android module companion

**File:** `android/.../PolyfenceModule.kt`  
**Issue:** Companion `pendingBridgePlatform` is never assigned; only the null branch runs. Core already owns pending platform on `LocationTracker`.  
**Fix:** Remove duplicate pattern or wire it intentionally.

### Unused `listenerCount` in `events.ts`

**File:** `src/events.ts`  
**Issue:** Counter is incremented/decremented but never read; `removeAllListeners` resets it without reconciling edge cases.  
**Fix:** Delete or use for optional diagnostics.

### npm package contents

**File:** `package.json` `files`  
**Issue:** `npm pack` includes `README.md` / `LICENSE` / `src` / `lib` / natives but not **`doc/`** or **`CHANGELOG.md`**. Fine if intentional.  
**Fix:** Add to `files` if consumers should get local API docs from the tarball.

---

## Nit

### TypeScript `tsc --noEmit`

**Files:** `__tests__/`, `example/src/App.tsx`  
**Issue:** Full-project **`npx tsc --noEmit`** fails (unused imports, missing `styles.small`, strict optional issues). Jest still passes (tests may use a narrower `tsconfig`).  
**Fix:** Clean up tests and example so CI can run strict `tsc`.

### Example app teardown

**File:** `example/src/App.tsx`  
**Issue:** Unmount only removes subscriptions; does not call `stopTracking` / `dispose`. Acceptable for a demo until `dispose` exists natively.  
**Fix:** Demonstrate full teardown once native `dispose` is implemented.

---

## API parity: Flutter `polyfence_service.dart` vs RN `Polyfence.ts`

| Area | Notes |
|------|--------|
| ** richer / Flutter-only** | `initialize(licenseKey, analyticsConfig, …)`; stream controllers + `runtimeStatus` / `statusStream`; **`zones`** getter; **`currentConfiguration`** getter; **`clearAllZones`** naming; **`errorHistory(timeRange, errorTypes)`**; **`enableProximityOptimization` / `enableMovementOptimization` / `enableIntelligentOptimization`**; comprehensive **`dispose`** with `_platform.dispose()`. |
| **RN naming / extras** | **`removeAllZones`** (Flutter: `clearAllZones`); **`getErrorHistory({ limit })`**; event registration via **`onLocation` / `onPerformance`**. |
| **Event channel names (RN)** | **`onLocation`**, **`onGeofenceEvent`**, **`onError`**, **`onPerformance`** — matches the intended four-channel checklist; Flutter exposes streams instead of these names. |

**Payload parity:** Flutter normalizes geofence maps in **`_handleGeofenceEvent`**; RN currently forwards **raw** native maps — parity requires similar normalization or documented raw types.

---

## Tests

- **`npm test`:** 4 suites, **125 tests passed**.
- Mocks define **`dispose`** and battery methods on `NativeModules.Polyfence`, so tests **do not** catch missing native exports or wrong `@ReactMethod` names.
- **`removeAllListeners`:** Implementation calls `emitter.removeAllListeners` per event; **`Polyfence.ts`** aliases **`removeAllEventListeners`** — **consistent**.

---

## Configuration snapshot

| Artifact | Notes |
|----------|--------|
| `package.json` | `peerDependencies` `react` / `react-native` `*` — very loose; consider `react-native >= 0.71` per README/D033. |
| `polyfence-react-native.podspec` | iOS 14+, `PolyfenceCore ~> 1.0.0` — aligned with project rules. |
| `android/build.gradle` | `io.polyfence:polyfence-core:1.0.0` — aligned. |
| `.npmignore` + `files` | `npm pack --dry-run` excludes `__tests__/`, internal doc paths — good for publish hygiene. |

---

## Documentation accuracy

- **`README.md` / `doc/API_SURFACE.md`:** Assert **`dispose`**, battery APIs, **`ZoneState[]`**, and typed geofence/performance callbacks in ways that **do not match** current native wire behavior until fixes land.
- **`CHANGELOG.md`:** States broad “parity” and completeness — **overstated** relative to native gaps above.

---

## Summary

| Severity | Approx. count |
|----------|----------------|
| **Critical** | 6 themes (delegate/tracker API, iOS `shared`/`setDelegate`, missing `dispose`, battery JS↔native, Android `resetConfiguration` no-op) |
| **Major** | 9+ (payload vs types, iOS event dropping, permissions semantics, init nesting, `getErrorHistory`, docs/telemetry/speed, lifecycle) |
| **Minor** | 3 |
| **Nit** | 2+ |

### Verdict: **Not ready for v0.1.0**

Ship only after:

1. **Delegate alignment** with published **polyfence-core** (`PolyfenceCoreDelegate` map-based callbacks, correct `LocationTracker` hookup).
2. **Working `dispose`** on Android and iOS + bridge header exports.
3. **Battery** method names on Android + implementations on iOS.
4. **Android `resetConfiguration`** that actually resets per core’s service contract.
5. **Event/config normalization or type honesty** so JS developers aren’t misled by `GeofenceEvent`, `ZoneState[]`, `RuntimeStatus`, etc.
6. **`npx tsc --noEmit`** clean (or explicitly scoped) and native builds verified.

---

*This document is a review artifact for sharing; it is not part of the published npm API contract.*
