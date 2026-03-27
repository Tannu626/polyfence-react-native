import { NativeEventEmitter, NativeModules } from 'react-native';
import type {
  GeofenceEvent,
  GeofenceEventType,
  PolyfenceLocation,
  PolyfenceError,
  RuntimeStatus,
  Subscription,
} from './types';

const { Polyfence: NativePolyfence } = NativeModules;
const emitter = new NativeEventEmitter(NativePolyfence);

function addListener<T>(eventName: string, callback: (data: T) => void): Subscription {
  const sub = emitter.addListener(eventName, callback);
  return {
    remove: () => {
      sub.remove();
    },
  };
}

function normalizeGeofenceEvent(raw: Record<string, unknown>): GeofenceEvent {
  const eventType = (raw.eventType as string || '').toLowerCase() as GeofenceEventType;
  return {
    zoneId: raw.zoneId as string,
    zoneName: raw.zoneName as string,
    type: eventType,
    location: {
      latitude: raw.latitude as number,
      longitude: raw.longitude as number,
      accuracy: (raw.gpsAccuracy as number) ?? 0,
      speed: raw.speedMps as number | undefined,
      timestamp: (raw.timestamp as number) ?? Date.now(),
    },
    timestamp: (raw.timestamp as number) ?? Date.now(),
    confidence: raw.confidence as number | undefined,
    dwellDurationMs: raw.dwellDurationMs as number | undefined,
  };
}

export function onLocation(callback: (location: PolyfenceLocation) => void): Subscription {
  return addListener('onLocation', callback);
}

export function onGeofenceEvent(callback: (event: GeofenceEvent) => void): Subscription {
  return addListener('onGeofenceEvent', (raw: Record<string, unknown>) => {
    callback(normalizeGeofenceEvent(raw));
  });
}

export function onError(callback: (error: PolyfenceError) => void): Subscription {
  return addListener('onError', callback);
}

export function onPerformance(callback: (status: RuntimeStatus) => void): Subscription {
  return addListener('onPerformance', callback);
}

export function removeAllListeners(): void {
  emitter.removeAllListeners('onLocation');
  emitter.removeAllListeners('onGeofenceEvent');
  emitter.removeAllListeners('onError');
  emitter.removeAllListeners('onPerformance');
}
