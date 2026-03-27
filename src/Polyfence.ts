import { NativeModules } from 'react-native';
import type {
  PolyfenceConfiguration,
  Zone,
  ZoneState,
  PolyfenceDebugInfo,
  SessionTelemetry,
  TrackingSchedule,
  GeofenceEvent,
  PolyfenceLocation,
  PolyfenceError,
  PerformanceEventPayload,
  Subscription,
  AccuracyProfile,
  BatteryOptimizationStatus,
} from './types';
import {
  onLocation,
  onGeofenceEvent,
  onError,
  onPerformance,
  normalizePolyfenceError,
  removeAllListeners as removeAllEventListeners,
} from './events';

const { Polyfence: NativePolyfence } = NativeModules;

if (!NativePolyfence) {
  throw new Error(
    'polyfence-react-native: NativeModule not found. Make sure the native module is linked correctly.'
  );
}

export class Polyfence {
  private static _instance: Polyfence | null = null;
  private _isDisposed = false;

  static get instance(): Polyfence {
    if (!Polyfence._instance) {
      Polyfence._instance = new Polyfence();
    }
    return Polyfence._instance;
  }

  private constructor() {}

  private assertNotDisposed(): void {
    if (this._isDisposed) {
      throw new Error(
        'Polyfence instance has been disposed. Create a new instance or restart the app.'
      );
    }
  }

  async initialize(config?: PolyfenceConfiguration): Promise<void> {
    this.assertNotDisposed();
    return NativePolyfence.initialize(config ? { config } : {});
  }

  async startTracking(): Promise<void> {
    this.assertNotDisposed();
    return NativePolyfence.startTracking();
  }

  async stopTracking(): Promise<void> {
    this.assertNotDisposed();
    return NativePolyfence.stopTracking();
  }

  async addZone(zone: Zone): Promise<void> {
    this.assertNotDisposed();
    return NativePolyfence.addZone(zone);
  }

  async removeZone(zoneId: string): Promise<void> {
    this.assertNotDisposed();
    return NativePolyfence.removeZone(zoneId);
  }

  async removeAllZones(): Promise<void> {
    this.assertNotDisposed();
    return NativePolyfence.removeAllZones();
  }

  /**
   * Current inside/outside state per zone, joined with persisted zone names in the native bridge.
   */
  async getZoneStates(): Promise<ZoneState[]> {
    this.assertNotDisposed();
    return NativePolyfence.getZoneStates();
  }

  async getDebugInfo(): Promise<PolyfenceDebugInfo> {
    this.assertNotDisposed();
    return NativePolyfence.getDebugInfo();
  }

  async getSessionTelemetry(): Promise<SessionTelemetry> {
    this.assertNotDisposed();
    return NativePolyfence.getSessionTelemetry();
  }

  async setTrackingSchedule(schedule: TrackingSchedule): Promise<void> {
    this.assertNotDisposed();
    return NativePolyfence.setTrackingSchedule(schedule);
  }

  async clearTrackingSchedule(): Promise<void> {
    this.assertNotDisposed();
    return NativePolyfence.clearTrackingSchedule();
  }

  onLocation(callback: (location: PolyfenceLocation) => void): Subscription {
    return onLocation(callback);
  }

  onGeofenceEvent(callback: (event: GeofenceEvent) => void): Subscription {
    return onGeofenceEvent(callback);
  }

  onError(callback: (error: PolyfenceError) => void): Subscription {
    return onError(callback);
  }

  onPerformance(callback: (payload: PerformanceEventPayload) => void): Subscription {
    return onPerformance(callback);
  }

  onZoneEnter(callback: (event: GeofenceEvent) => void): Subscription {
    return onGeofenceEvent((event) => {
      if (event.type === 'enter' || event.type === 'recovery_enter') {
        callback(event);
      }
    });
  }

  onZoneExit(callback: (event: GeofenceEvent) => void): Subscription {
    return onGeofenceEvent((event) => {
      if (event.type === 'exit' || event.type === 'recovery_exit') {
        callback(event);
      }
    });
  }

  /**
   * Check the current location permission state.
   *
   * On iOS: Returns true if location access is already granted (always or while-in-use).
   * Does NOT show a permission dialog; the system dialog is shown by requestPermissions(always: true)
   * on the native side, but the JS promise resolves immediately with the current state.
   *
   * On Android: Only checks current permission state. Does NOT show a system dialog.
   * To trigger the system permission dialog, use a library like react-native-permissions,
   * then call this method to verify the result.
   *
   * @param options.always - iOS only: request "always" access (default: false, requests "while in use")
   * @returns true if all required location permissions are granted, false otherwise
   */
  async requestPermissions(options?: { always?: boolean }): Promise<boolean> {
    this.assertNotDisposed();
    return NativePolyfence.requestPermissions(options ?? {});
  }

  async isLocationServiceEnabled(): Promise<boolean> {
    this.assertNotDisposed();
    return NativePolyfence.isLocationServiceEnabled();
  }

  async getConfiguration(): Promise<PolyfenceConfiguration> {
    this.assertNotDisposed();
    return NativePolyfence.getConfiguration();
  }

  async updateConfiguration(config: PolyfenceConfiguration): Promise<void> {
    this.assertNotDisposed();
    return NativePolyfence.updateConfiguration(config);
  }

  async resetConfiguration(): Promise<void> {
    this.assertNotDisposed();
    return NativePolyfence.resetConfiguration();
  }

  async setAccuracyProfile(profile: AccuracyProfile): Promise<void> {
    this.assertNotDisposed();
    return NativePolyfence.setAccuracyProfile(profile);
  }

  async batteryOptimizationStatus(): Promise<BatteryOptimizationStatus> {
    this.assertNotDisposed();
    return NativePolyfence.batteryOptimizationStatus();
  }

  async requestBatteryOptimizationExemption(): Promise<boolean> {
    this.assertNotDisposed();
    return NativePolyfence.requestBatteryOptimizationExemption();
  }

  async getErrorHistory(options?: {
    limit?: number;
    timeRangeMs?: number;
    errorTypes?: string[];
  }): Promise<PolyfenceError[]> {
    this.assertNotDisposed();
    const raw: unknown = await NativePolyfence.getErrorHistory(options ?? {});
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.map((item) =>
      normalizePolyfenceError(item as Record<string, unknown>)
    );
  }

  async dispose(): Promise<void> {
    this._isDisposed = true;
    removeAllEventListeners();
    return NativePolyfence.dispose();
  }

  removeAllListeners(): void {
    removeAllEventListeners();
  }
}
