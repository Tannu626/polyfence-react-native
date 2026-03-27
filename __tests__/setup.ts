const mockEventEmitterInstance = {
  addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  removeAllListeners: jest.fn(),
};

jest.mock('react-native', () => ({
  NativeModules: {
    Polyfence: {
      initialize: jest.fn().mockResolvedValue(null),
      startTracking: jest.fn().mockResolvedValue(null),
      stopTracking: jest.fn().mockResolvedValue(null),
      addZone: jest.fn().mockResolvedValue(null),
      removeZone: jest.fn().mockResolvedValue(null),
      removeAllZones: jest.fn().mockResolvedValue(null),
      getZoneStates: jest.fn().mockResolvedValue([]),
      getDebugInfo: jest.fn().mockResolvedValue({}),
      getSessionTelemetry: jest.fn().mockResolvedValue({}),
      setTrackingSchedule: jest.fn().mockResolvedValue(null),
      clearTrackingSchedule: jest.fn().mockResolvedValue(null),
      requestPermissions: jest.fn().mockResolvedValue(true),
      isLocationServiceEnabled: jest.fn().mockResolvedValue(true),
      getConfiguration: jest.fn().mockResolvedValue({}),
      updateConfiguration: jest.fn().mockResolvedValue(null),
      resetConfiguration: jest.fn().mockResolvedValue(null),
      setAccuracyProfile: jest.fn().mockResolvedValue(null),
      batteryOptimizationStatus: jest.fn().mockResolvedValue({
        isIgnoringOptimizations: true,
        manufacturer: 'test',
      }),
      requestBatteryOptimizationExemption: jest.fn().mockResolvedValue(true),
      getErrorHistory: jest.fn().mockResolvedValue([]),
      dispose: jest.fn().mockResolvedValue(null),
    },
  },
  NativeEventEmitter: jest.fn().mockImplementation(() => mockEventEmitterInstance),
  Platform: { OS: 'ios' },
}));

export const getMockEventEmitter = () => mockEventEmitterInstance;
