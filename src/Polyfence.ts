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
  RuntimeStatus,
  Subscription,
} from './types';
import {
  onLocation,
  onGeofenceEvent,
  onError,
  onPerformance,
  removeAllListeners,
} from './events';

const { Polyfence: NativePolyfence } = NativeModules;

if (!NativePolyfence) {
  throw new Error(
    'polyfence-react-native: NativeModule not found. Make sure the native module is linked correctly.'
  );
}

export class Polyfence {
  private static _instance: Polyfence | null = null;

  static get instance(): Polyfence {
    if (!Polyfence._instance) {
      Polyfence._instance = new Polyfence();
    }
    return Polyfence._instance;
  }

  private constructor() {}

  async initialize(config?: PolyfenceConfiguration): Promise<void> {
    return NativePolyfence.initialize(config ?? {});
  }

  async startTracking(): Promise<void> {
    return NativePolyfence.startTracking();
  }

  async stopTracking(): Promise<void> {
    return NativePolyfence.stopTracking();
  }

  async addZone(zone: Zone): Promise<void> {
    return NativePolyfence.addZone(zone);
  }

  async removeZone(zoneId: string): Promise<void> {
    return NativePolyfence.removeZone(zoneId);
  }

  async removeAllZones(): Promise<void> {
    return NativePolyfence.removeAllZones();
  }

  async getZoneStates(): Promise<ZoneState[]> {
    return NativePolyfence.getZoneStates();
  }

  async getDebugInfo(): Promise<PolyfenceDebugInfo> {
    return NativePolyfence.getDebugInfo();
  }

  async getSessionTelemetry(): Promise<SessionTelemetry> {
    return NativePolyfence.getSessionTelemetry();
  }

  async setTrackingSchedule(schedule: TrackingSchedule): Promise<void> {
    return NativePolyfence.setTrackingSchedule(schedule);
  }

  async clearTrackingSchedule(): Promise<void> {
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

  onPerformance(callback: (status: RuntimeStatus) => void): Subscription {
    return onPerformance(callback);
  }

  removeAllListeners(): void {
    removeAllListeners();
  }
}
