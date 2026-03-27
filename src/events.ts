import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import type {
  GeofenceEvent,
  PolyfenceLocation,
  PolyfenceError,
  RuntimeStatus,
  Subscription,
} from './types';

const { Polyfence: NativePolyfence } = NativeModules;
const emitter = new NativeEventEmitter(NativePolyfence);

// Track listener count to manage native event observation
let listenerCount = 0;

function addListener<T>(eventName: string, callback: (data: T) => void): Subscription {
  listenerCount++;
  const sub = emitter.addListener(eventName, callback);
  return {
    remove: () => {
      sub.remove();
      listenerCount--;
    },
  };
}

export function onLocation(callback: (location: PolyfenceLocation) => void): Subscription {
  return addListener('onLocation', callback);
}

export function onGeofenceEvent(callback: (event: GeofenceEvent) => void): Subscription {
  return addListener('onGeofenceEvent', callback);
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
  listenerCount = 0;
}
