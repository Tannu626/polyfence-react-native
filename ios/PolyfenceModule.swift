import React
import UIKit
import CoreLocation
import PolyfenceCore

@objc(PolyfenceModule)
class PolyfenceModule: RCTEventEmitter, PolyfenceCoreDelegate {

    private var locationTracker: LocationTracker?
    private var zonePersistence: ZonePersistence?
    private var hasListeners = false

    override func supportedEvents() -> [String] {
        return ["onLocation", "onGeofenceEvent", "onError", "onPerformance"]
    }

    override static func requiresMainQueueSetup() -> Bool {
        return false
    }

    override func startObserving() {
        hasListeners = true
    }

    override func stopObserving() {
        hasListeners = false
    }

    @objc(initialize:resolver:rejecter:)
    func initialize(config: NSDictionary?, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            if let configDict = config?["config"] as? [String: Any],
               let version = configDict["pluginVersion"] as? String {
                PolyfenceDebugCollector.shared.setPluginVersion(version)
            }

            zonePersistence = ZonePersistence()
            locationTracker = LocationTracker()
            locationTracker?.setDelegate(self)

            LocationTracker.shared.setBridgePlatform("react-native")

            if let configDict = config?["config"] as? [String: Any],
               let disableAlerts = configDict["disableAlertNotifications"] as? Bool {
                locationTracker?.setAlertNotificationsEnabled(!disableAlerts)
            }

            resolve(nil)
        } catch {
            NSLog("PolyfenceModule: Initialize failed: %@", error.localizedDescription)
            reject("INITIALIZATION_FAILED", error.localizedDescription, error)
        }
    }

    @objc(startTracking:rejecter:)
    func startTracking(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            guard let tracker = locationTracker else {
                throw NSError(domain: "PolyfenceModule", code: 1, userInfo: [NSLocalizedDescriptionKey: "Location tracker not initialized"])
            }
            tracker.startTracking()
            sendStatus(trackingEnabled: true)
            resolve(nil)
        } catch {
            NSLog("PolyfenceModule: Start tracking failed: %@", error.localizedDescription)
            reject("START_TRACKING_FAILED", error.localizedDescription, error)
        }
    }

    @objc(stopTracking:rejecter:)
    func stopTracking(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            guard let tracker = locationTracker else {
                throw NSError(domain: "PolyfenceModule", code: 2, userInfo: [NSLocalizedDescriptionKey: "Location tracker not initialized"])
            }
            tracker.stopTracking()
            sendStatus(trackingEnabled: false)
            resolve(nil)
        } catch {
            NSLog("PolyfenceModule: Stop tracking failed: %@", error.localizedDescription)
            reject("STOP_TRACKING_FAILED", error.localizedDescription, error)
        }
    }

    @objc(addZone:resolver:rejecter:)
    func addZone(zoneData: NSDictionary?, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            guard let zoneDict = zoneData as? [String: Any],
                  let zoneId = zoneDict["id"] as? String,
                  let zoneName = zoneDict["name"] as? String else {
                throw NSError(domain: "PolyfenceModule", code: 3, userInfo: [NSLocalizedDescriptionKey: "Invalid zone data"])
            }

            guard let tracker = locationTracker else {
                throw NSError(domain: "PolyfenceModule", code: 4, userInfo: [NSLocalizedDescriptionKey: "Location tracker not initialized"])
            }

            tracker.addZone(zoneId: zoneId, zoneName: zoneName, zoneData: zoneDict)
            sendStatus(trackingEnabled: nil)
            resolve(nil)
        } catch {
            NSLog("PolyfenceModule: Add zone failed: %@", error.localizedDescription)
            reject("ADD_ZONE_FAILED", error.localizedDescription, error)
        }
    }

    @objc(removeZone:resolver:rejecter:)
    func removeZone(zoneId: String?, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            guard let zoneId = zoneId, !zoneId.isEmpty else {
                throw NSError(domain: "PolyfenceModule", code: 5, userInfo: [NSLocalizedDescriptionKey: "Zone ID is required"])
            }

            guard let tracker = locationTracker else {
                throw NSError(domain: "PolyfenceModule", code: 6, userInfo: [NSLocalizedDescriptionKey: "Location tracker not initialized"])
            }

            tracker.removeZone(zoneId: zoneId)
            sendStatus(trackingEnabled: nil)
            resolve(nil)
        } catch {
            NSLog("PolyfenceModule: Remove zone failed: %@", error.localizedDescription)
            reject("REMOVE_ZONE_FAILED", error.localizedDescription, error)
        }
    }

    @objc(removeAllZones:rejecter:)
    func removeAllZones(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            guard let tracker = locationTracker else {
                throw NSError(domain: "PolyfenceModule", code: 7, userInfo: [NSLocalizedDescriptionKey: "Location tracker not initialized"])
            }

            tracker.clearAllZones()
            sendStatus(trackingEnabled: nil)
            resolve(nil)
        } catch {
            NSLog("PolyfenceModule: Clear zones failed: %@", error.localizedDescription)
            reject("CLEAR_ZONES_FAILED", error.localizedDescription, error)
        }
    }

    @objc(getZoneStates:rejecter:)
    func getZoneStates(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            guard let tracker = locationTracker else {
                throw NSError(domain: "PolyfenceModule", code: 8, userInfo: [NSLocalizedDescriptionKey: "Location tracker not initialized"])
            }

            let states = tracker.getCurrentZoneStates()
            resolve(states)
        } catch {
            NSLog("PolyfenceModule: Get zone states failed: %@", error.localizedDescription)
            reject("ZONE_STATES_FAILED", error.localizedDescription, error)
        }
    }

    @objc(getDebugInfo:rejecter:)
    func getDebugInfo(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            let debugInfo = PolyfenceDebugCollector.shared.collectDebugInfo()
            resolve(debugInfo)
        } catch {
            NSLog("PolyfenceModule: Get debug info failed: %@", error.localizedDescription)
            reject("DEBUG_INFO_FAILED", error.localizedDescription, error)
        }
    }

    @objc(getSessionTelemetry:rejecter:)
    func getSessionTelemetry(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            guard let tracker = locationTracker else {
                throw NSError(domain: "PolyfenceModule", code: 9, userInfo: [NSLocalizedDescriptionKey: "Location tracker not initialized"])
            }

            var telemetry = tracker.getSessionTelemetryData()
            telemetry["deviceCategory"] = Self.getDeviceCategory()
            telemetry["osVersionMajor"] = ProcessInfo.processInfo.operatingSystemVersion.majorVersion
            telemetry["chargingDuringSession"] = UIDevice.current.batteryState == .charging || UIDevice.current.batteryState == .full
            resolve(telemetry)
        } catch {
            NSLog("PolyfenceModule: Get session telemetry failed: %@", error.localizedDescription)
            reject("TELEMETRY_FAILED", error.localizedDescription, error)
        }
    }

    @objc(setTrackingSchedule:resolver:rejecter:)
    func setTrackingSchedule(schedule: NSDictionary?, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            guard let scheduleDict = schedule as? [String: Any] else {
                throw NSError(domain: "PolyfenceModule", code: 10, userInfo: [NSLocalizedDescriptionKey: "Schedule is required"])
            }

            guard let tracker = locationTracker else {
                throw NSError(domain: "PolyfenceModule", code: 11, userInfo: [NSLocalizedDescriptionKey: "Location tracker not initialized"])
            }

            if let scheduleSettings = scheduleDict as? [String: Any] {
                tracker.setScheduleConfig(scheduleSettings)
            }

            resolve(nil)
        } catch {
            NSLog("PolyfenceModule: Set tracking schedule failed: %@", error.localizedDescription)
            reject("SCHEDULE_FAILED", error.localizedDescription, error)
        }
    }

    @objc(clearTrackingSchedule:rejecter:)
    func clearTrackingSchedule(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            guard let tracker = locationTracker else {
                throw NSError(domain: "PolyfenceModule", code: 12, userInfo: [NSLocalizedDescriptionKey: "Location tracker not initialized"])
            }

            tracker.clearScheduleConfig()
            resolve(nil)
        } catch {
            NSLog("PolyfenceModule: Clear tracking schedule failed: %@", error.localizedDescription)
            reject("CLEAR_SCHEDULE_FAILED", error.localizedDescription, error)
        }
    }

    // MARK: - PolyfenceCoreDelegate Implementation

    func onLocationUpdate(_ locationData: [String: Any]) {
        sendLocationEvent(locationData)
    }

    func onGeofenceEvent(
        zoneId: String,
        zoneName: String,
        eventType: String,
        latitude: Double,
        longitude: Double,
        detectionTimeMs: Double,
        gpsAccuracy: Double,
        speedMps: Double,
        activityAtEvent: String,
        distanceToBoundaryM: Double
    ) {
        let event: [String: Any] = [
            "zoneId": zoneId,
            "zoneName": zoneName,
            "eventType": eventType,
            "timestamp": Int64(Date().timeIntervalSince1970 * 1000),
            "latitude": latitude,
            "longitude": longitude,
            "detectionTimeMs": detectionTimeMs,
            "gpsAccuracy": gpsAccuracy,
            "speedMps": speedMps,
            "activityAtEvent": activityAtEvent,
            "distanceToBoundaryM": distanceToBoundaryM
        ]
        sendGeofenceEvent(event)
    }

    func onError(_ errorCode: String, errorMessage: String, details: [String: Any]?) {
        var errorMap: [String: Any] = [
            "code": errorCode,
            "message": errorMessage,
            "timestamp": Int64(Date().timeIntervalSince1970 * 1000)
        ]
        if let details = details {
            errorMap.merge(details) { _, new in new }
        }
        sendErrorEvent(errorMap)
    }

    func onPerformanceEvent(_ event: [String: Any]) {
        sendPerformanceEvent(event)
    }

    // MARK: - Private Event Sending Methods

    private func sendLocationEvent(_ locationData: [String: Any]) {
        guard hasListeners else { return }
        sendEvent(withName: "onLocation", body: locationData)
    }

    private func sendGeofenceEvent(_ eventData: [String: Any]) {
        guard hasListeners else { return }
        sendEvent(withName: "onGeofenceEvent", body: eventData)
    }

    private func sendErrorEvent(_ errorData: [String: Any]) {
        guard hasListeners else { return }
        sendEvent(withName: "onError", body: errorData)
    }

    private func sendPerformanceEvent(_ eventData: [String: Any]) {
        guard hasListeners else { return }
        sendEvent(withName: "onPerformance", body: eventData)
    }

    private func sendStatus(trackingEnabled: Bool?) {
        let zonesCount = (try? zonePersistence?.getZoneCount()) ?? 0
        let payload: [String: Any?] = [
            "type": "status",
            "trackingEnabled": trackingEnabled ?? false,
            "zonesCount": zonesCount,
            "profile": nil,
            "lastAccuracy": nil,
            "timestamp": Int64(Date().timeIntervalSince1970 * 1000)
        ]
        sendPerformanceEvent(payload as [String: Any])
    }

    // MARK: - Device Category Detection

    private static func getDeviceCategory() -> String {
        var systemInfo = utsname()
        uname(&systemInfo)
        let machine = withUnsafePointer(to: &systemInfo.machine) {
            $0.withMemoryRebound(to: CChar.self, capacity: 1) {
                String(validatingUTF8: $0) ?? "unknown"
            }
        }

        if machine.hasPrefix("iPhone") {
            let parts = machine.replacingOccurrences(of: "iPhone", with: "").split(separator: ",")
            if let first = parts.first {
                let modelNum = Int(first) ?? 0
                return categorizeIPhoneModel(modelNum)
            }
        } else if machine.hasPrefix("iPad") {
            return "ipad"
        }
        return "ios_other"
    }

    private static func categorizeIPhoneModel(_ modelNumber: Int) -> String {
        switch modelNumber {
        case 15, 16:
            return "iphone_15"
        case 14, 13:
            return "iphone_14_13"
        case 12, 11:
            return "iphone_12_11"
        default:
            return "iphone_older"
        }
    }
}
