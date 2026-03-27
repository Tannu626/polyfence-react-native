# Polyfence React Native — Peer Review

**Review date:** 2026-03-27
**Scope:** Full bridge review — TypeScript, Android (Kotlin), iOS (Swift/ObjC), API parity with Flutter, tests, docs, packaging

---

## Critical

### C1. Android PolyfenceCoreDelegate signature mismatch

- **File:** `android/src/main/kotlin/io/polyfence/reactnative/PolyfenceModule.kt`
- **Lines:** 443–469, 474–484
- **Issue:** `PolyfenceCoreDelegate` defines `onGeofenceEvent(eventData: Map<String, Any>)` and `onError(errorData: Map<String, Any>)` — single Map parameters. The module implements multi-parameter overloads (`onGeofenceEvent(zoneId, zoneName, eventType, ...)` and `onError(errorCode, errorMessage, details)`). These don't satisfy the interface. Will not compile against polyfence-core 1.0.0.
- **Fix:** Implement the actual interface signatures:
  ```kotlin
  override fun onGeofenceEvent(eventData: Map<String, Any>) { sendGeofenceEvent(eventData) }
  override fun onError(errorData: Map<String, Any>) { sendErrorEvent(errorData) }
  ```

### C2. iOS PolyfenceCoreDelegate signature mismatch

- **File:** `ios/PolyfenceModule.swift`
- **Lines:** 383–409, 411–421
- **Issue:** Same as C1. Protocol defines `func onGeofenceEvent(_ eventData: [String: Any])` and `func onError(_ errorData: [String: Any])` but module implements multi-parameter versions. Will not compile.
- **Fix:** Match the protocol signatures exactly.

### C3. Native method name mismatch — battery APIs

- **File:** `src/Polyfence.ts:145–151`, `PolyfenceModule.kt:374,405`
- **Issue:** TypeScript calls `NativePolyfence.batteryOptimizationStatus()` and `NativePolyfence.requestBatteryOptimizationExemption()`, but Android @ReactMethod names are `checkBatteryOptimization` and `requestBatteryOptimization`. JS calls will throw "method not found" at runtime.
- **Fix:** Rename Kotlin methods to `batteryOptimizationStatus` and `requestBatteryOptimizationExemption` to match the public API.

### C4. iOS missing battery and dispose methods

- **File:** `ios/PolyfenceModule.swift`, `ios/PolyfenceModule.m`
- **Issue:** No `batteryOptimizationStatus`, `requestBatteryOptimizationExemption`, or `dispose` methods exist in Swift or the ObjC bridge. Calling these from JS on iOS crashes with "method not found".
- **Fix:** Add iOS stubs — `batteryOptimizationStatus` returns `{ isIgnoringOptimizations: true, manufacturer: "Apple" }` (no battery optimization on iOS), `requestBatteryOptimizationExemption` returns `true`, `dispose` tears down locationTracker and clears state. Export all three in PolyfenceModule.m.

### C5. Android missing dispose @ReactMethod

- **File:** `android/src/main/kotlin/io/polyfence/reactnative/PolyfenceModule.kt`
- **Issue:** `Polyfence.dispose()` calls `NativePolyfence.dispose()` but no `@ReactMethod fun dispose(promise: Promise)` exists.
- **Fix:** Add a `dispose` method that stops tracking, removes the delegate, and cleans up state.

### C6. Geofence event field name mismatch (native → JS)

- **File:** `PolyfenceModule.kt:455–467`, `PolyfenceModule.swift:395–407`, `src/types.ts:29–37`
- **Issue:** Native sends `eventType` but TypeScript `GeofenceEvent` expects `type`. Native sends flat `latitude`/`longitude` but TS expects a nested `location: PolyfenceLocation` object. Every geofence event arrives with wrong field names — `event.type` and `event.location` are both `undefined` on the JS side.
- **Fix:** Either restructure native event maps to match the TS interface (nest location fields, rename `eventType` → `type`), or add a JS-side transformation in `events.ts`.

---

## Major

### M1. requestPermissions doesn't actually request (Android)

- **File:** `PolyfenceModule.kt:269–277`
- **Issue:** Calls `hasAllRequiredPerms()` — a read-only check. Never triggers the system permission dialog. Flutter's equivalent calls the platform request. The method name is misleading.
- **Fix:** Either use `ActivityCompat.requestPermissions()` to trigger the dialog, or rename to accurately reflect it's a check, and document that consumers should use a RN permissions library.

### M2. requestPermissions returns wrong value (iOS)

- **File:** `ios/PolyfenceModule.swift:232–235`
- **Issue:** After calling `tracker.requestPermissions(always:)`, immediately checks `CLLocationManager.authorizationStatus()`. Permission dialogs are async — status won't have changed yet. Also treats `.notDetermined` as granted (line 234), which is incorrect.
- **Fix:** Use a delegate callback to wait for the actual authorization response. Remove `.notDetermined` from the granted check.

### M3. iOS events silently dropped before JS subscribes

- **File:** `ios/PolyfenceModule.swift:430–447`
- **Issue:** All `send*Event` methods have `guard hasListeners else { return }`. Events between `initialize()` and when JS registers listeners are silently lost — including geofence events during the startup window. Android has no such guard and will crash calling `emit` with no JS module loaded.
- **Fix:** On iOS, either queue events before listeners attach or document the behavior. On Android, add a `hasListeners` guard to `sendEvent()` to prevent crashes.

### M4. sendStatus on iOS ignores actual tracking state

- **File:** `ios/PolyfenceModule.swift:449–460`
- **Issue:** `sendStatus(trackingEnabled: nil)` is called from `addZone`, `removeZone`, `removeAllZones`. When nil, line 453 falls back to `false`. JS side always sees `trackingEnabled: false` after zone operations, even if tracking is active.
- **Fix:** Query actual tracking state from `locationTracker` instead of accepting a parameter.

### M5. Flutter API parity gaps

- **File:** `src/Polyfence.ts`
- **Issue:** Missing vs Flutter:
  - No `_isDisposed` guard — use after `dispose()` is not prevented
  - No `zones` getter (local zone cache)
  - No `currentConfiguration` getter
  - No `enableIntelligentOptimization()`, `enableProximityOptimization()`, `enableMovementOptimization()` convenience methods

  The convenience methods are fine to skip for v0.1.0 if documented. The missing disposal guard is a real gap — Flutter checks `_isDisposed` on every public method.
- **Fix:** At minimum add an `_isDisposed` guard. Document missing convenience methods in CHANGELOG.

---

## Minor

### m1. listenerCount is dead code

- **File:** `src/events.ts:14`
- **Issue:** Incremented/decremented but never read. If meant to drive `startObserving`/`stopObserving` on iOS, it's not wired up.
- **Fix:** Use it or remove it.

### m2. getErrorHistory TS type doesn't match Android

- **File:** `src/Polyfence.ts:153`, `PolyfenceModule.kt:421–431`
- **Issue:** TS accepts `{ limit?: number }` but Android reads `timeRangeMs` and `errorTypes`. iOS reads `limit`. Interfaces are inconsistent across platforms.
- **Fix:** Align the TS type with what both platforms actually support.

### m3. iOS do/catch around non-throwing code

- **File:** `ios/PolyfenceModule.swift` (multiple methods)
- **Issue:** Many methods wrap non-throwing calls in `do/catch`. Valid because `guard` throws `NSError`, but methods like `getDebugInfo` catch from `collectDebugInfo()` which may not throw, making the pattern misleading.
- **Fix:** Use `do/catch` only where called code actually throws. Use `guard` + `reject` for validation paths.

### m4. npm pack includes source .ts files

- **File:** `.npmignore`
- **Issue:** Pack includes both `lib/` (compiled) and `src/` (TypeScript source). Doubles the TS layer size. The `.d.ts` files in `lib/typescript/` are sufficient for consumers.
- **Fix:** Add `src/` to `.npmignore` unless raw TS source is intentionally shipped.

### m5. Example app references nonexistent style

- **File:** `example/src/App.tsx:421`
- **Issue:** `styles.small` doesn't exist in the styles export. Confirmed by tsc error TS2339. Will crash at runtime.
- **Fix:** Add `small` to styles or use an existing text style.

### m6. Example app unused imports/declarations

- **File:** `example/src/App.tsx:8,14,56`
- **Issue:** `Alert`, `Zone`, and `isInitialized` are imported/declared but never used. Confirmed by tsc.
- **Fix:** Remove unused imports and declarations.

---

## Nit

### N1. Duplicated sendEvent helper pattern (Android)

- **File:** `PolyfenceModule.kt:496–583`
- **Issue:** Four nearly identical `send*Event` methods with the same `when (value)` map-to-WritableMap conversion. ~90 lines of copy-paste.
- **Fix:** Extract a `mapToWritableMap(data: Map<String, Any>): WritableMap` helper.

### N2. iOS LocationTracker() vs LocationTracker.shared

- **File:** `ios/PolyfenceModule.swift:38,41`
- **Issue:** Line 38 creates `LocationTracker()` but line 41 calls `LocationTracker.shared.setBridgePlatform(...)`. If `LocationTracker` is a singleton via `.shared`, the delegate may be set on the wrong instance.
- **Fix:** Verify whether `LocationTracker` is a singleton. If so, use `.shared` consistently.

### N3. pendingBridgePlatform is dead code (Android)

- **File:** `PolyfenceModule.kt:44,68–73`
- **Issue:** `pendingBridgePlatform` is a companion property that's never set (only cleared). The `?: run` fallback on line 72 always executes, making the entire pattern dead code.
- **Fix:** Remove `pendingBridgePlatform` or document when it would be set externally.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 6 |
| Major | 5 |
| Minor | 6 |
| Nit | 3 |
| **Total** | **20** |

**Ready to merge:** No

The six critical issues mean this bridge will not compile against polyfence-core 1.0.0 (delegate signature mismatches), will crash at runtime on missing native methods (dispose, battery APIs on iOS), and will deliver malformed event data to JS consumers (field name mismatches). The architecture and patterns are sound — the problems are all in the wiring between layers.

**Recommended path:**
1. Fix all Critical issues (C1–C6) — these are compile/runtime blockers
2. Fix all Major issues (M1–M5) — these affect correctness and API contract
3. Re-review after fixes
4. Minor and Nit issues can be addressed in follow-up PRs
