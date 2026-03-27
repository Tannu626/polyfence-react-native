package io.polyfence.reactnative

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.SharedPreferences
import android.location.LocationManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import io.polyfence.core.LocationTracker
import io.polyfence.core.PolyfenceCoreDelegate
import io.polyfence.core.PolyfenceErrorManager
import io.polyfence.core.PolyfenceDebugCollector
import io.polyfence.core.ZonePersistence
import io.polyfence.core.configuration.ActivitySettings
import io.polyfence.core.configuration.SmartGpsConfig
import io.polyfence.core.configuration.SmartGpsConfigFactory
import java.util.Locale

/**
 * React Native module for Polyfence geofencing bridge.
 * Implements PolyfenceCoreDelegate to receive events from LocationTracker.
 * Single responsibility: React ↔ LocationTracker communication.
 */
class PolyfenceModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), PolyfenceCoreDelegate {

    companion object {
        private const val PREFS_NAME = "polyfence_state"
        private const val KEY_TRACKING_ENABLED = "tracking_enabled"
        private var pendingBridgePlatform: String? = null
    }

    private val context: Context = reactContext
    private var locationTracker: LocationTracker? = null

    override fun getName(): String = "Polyfence"

    @ReactMethod
    fun initialize(config: ReadableMap?, promise: Promise) {
        try {
            val configMap = config?.toHashMap() ?: mapOf()

            val version = (configMap["config"] as? Map<*, *>)?.get("pluginVersion") as? String
            if (version != null) {
                PolyfenceDebugCollector.setPluginVersion(version)
            }

            val disableAlerts = (configMap["config"] as? Map<*, *>)?.get("disableAlertNotifications") as? Boolean ?: false
            LocationTracker.setAlertNotificationsEnabled(!disableAlerts)

            locationTracker = LocationTracker.getInstance(context)
            locationTracker?.setDelegate(this)

            pendingBridgePlatform?.let { platform ->
                LocationTracker.setBridgePlatform(platform)
                pendingBridgePlatform = null
            } ?: run {
                LocationTracker.setBridgePlatform("react-native")
            }

            PolyfenceErrorManager.initialize { errorMap ->
                sendErrorEvent(errorMap)
            }

            promise.resolve(null)
        } catch (e: Exception) {
            Log.e("PolyfenceModule", "Initialization failed: ${e.message}")
            promise.reject("INITIALIZATION_FAILED", e.message)
        }
    }

    @ReactMethod
    fun startTracking(promise: Promise) {
        try {
            setTrackingEnabled(context, true)
            val intent = Intent(context, LocationTracker::class.java).apply {
                action = LocationTracker.ACTION_START_TRACKING
            }
            context.startForegroundService(intent)
            sendStatus(context)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e("PolyfenceModule", "Failed to start tracking: ${e.message}")
            promise.reject("START_TRACKING_FAILED", e.message)
        }
    }

    @ReactMethod
    fun stopTracking(promise: Promise) {
        try {
            setTrackingEnabled(context, false)
            val intent = Intent(context, LocationTracker::class.java).apply {
                action = LocationTracker.ACTION_STOP_TRACKING
            }
            context.startService(intent)
            sendStatus(context)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e("PolyfenceModule", "Failed to stop tracking: ${e.message}")
            promise.reject("STOP_TRACKING_FAILED", e.message)
        }
    }

    @ReactMethod
    fun addZone(zoneData: ReadableMap?, promise: Promise) {
        try {
            val zoneMap = zoneData?.toHashMap() ?: run {
                promise.reject("INVALID_ZONE", "Zone data is required")
                return
            }

            val zoneId = zoneMap["id"] as? String ?: run {
                promise.reject("INVALID_ZONE", "Zone ID is required")
                return
            }

            val zoneName = zoneMap["name"] as? String ?: "Unknown Zone"

            if (!isTrackingEnabled(context)) {
                try {
                    val persistence = ZonePersistence(context)
                    persistence.saveZone(zoneId, zoneName, zoneMap)
                } catch (e: Exception) {
                    Log.w("PolyfenceModule", "Failed to persist zone $zoneId: ${e.message}")
                }
                sendStatus(context)
                promise.resolve(null)
                return
            }

            val intent = Intent(context, LocationTracker::class.java).apply {
                action = LocationTracker.ACTION_ADD_ZONE
                putExtra("zoneId", zoneId)
                putExtra("zoneName", zoneName)
                putExtra("zoneData", HashMap(zoneMap))
            }
            context.startService(intent)
            sendStatus(context)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e("PolyfenceModule", "Failed to add zone: ${e.message}")
            promise.reject("ADD_ZONE_FAILED", e.message)
        }
    }

    @ReactMethod
    fun removeZone(zoneId: String?, promise: Promise) {
        try {
            if (zoneId.isNullOrBlank()) {
                promise.reject("INVALID_ZONE_ID", "Zone ID is required")
                return
            }

            val intent = Intent(context, LocationTracker::class.java).apply {
                action = LocationTracker.ACTION_REMOVE_ZONE
                putExtra("zoneId", zoneId)
            }
            context.startService(intent)
            sendStatus(context)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e("PolyfenceModule", "Failed to remove zone: ${e.message}")
            promise.reject("REMOVE_ZONE_FAILED", e.message)
        }
    }

    @ReactMethod
    fun removeAllZones(promise: Promise) {
        try {
            val intent = Intent(context, LocationTracker::class.java).apply {
                action = LocationTracker.ACTION_CLEAR_ZONES
            }
            context.startService(intent)
            sendStatus(context)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e("PolyfenceModule", "Failed to clear all zones: ${e.message}")
            promise.reject("CLEAR_ZONES_FAILED", e.message)
        }
    }

    @ReactMethod
    fun getZoneStates(promise: Promise) {
        try {
            val states = LocationTracker.getCurrentZoneStates()
            promise.resolve(states)
        } catch (e: Exception) {
            Log.e("PolyfenceModule", "Failed to get zone states: ${e.message}")
            promise.reject("ZONE_STATES_FAILED", e.message)
        }
    }

    @ReactMethod
    fun getDebugInfo(promise: Promise) {
        try {
            val debugInfo = PolyfenceDebugCollector.collectDebugInfo(context)
            promise.resolve(debugInfo)
        } catch (e: Exception) {
            Log.e("PolyfenceModule", "Failed to get debug info: ${e.message}")
            promise.reject("DEBUG_INFO_FAILED", e.message)
        }
    }

    @ReactMethod
    fun getSessionTelemetry(promise: Promise) {
        try {
            val telemetry = LocationTracker.getSessionTelemetry()
            val sessionData = HashMap(telemetry)
            sessionData["deviceCategory"] = getDeviceCategory()
            sessionData["osVersionMajor"] = Build.VERSION.SDK_INT
            promise.resolve(sessionData)
        } catch (e: Exception) {
            Log.e("PolyfenceModule", "Failed to get session telemetry: ${e.message}")
            promise.reject("TELEMETRY_FAILED", e.message)
        }
    }

    @ReactMethod
    fun setTrackingSchedule(schedule: ReadableMap?, promise: Promise) {
        try {
            if (schedule == null) {
                promise.reject("INVALID_SCHEDULE", "Schedule is required")
                return
            }

            val scheduleMap = schedule.toHashMap()
            val intent = Intent(context, LocationTracker::class.java).apply {
                action = LocationTracker.ACTION_UPDATE_CONFIG
                putExtra("schedule", HashMap(scheduleMap))
            }
            context.startService(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e("PolyfenceModule", "Failed to set tracking schedule: ${e.message}")
            promise.reject("SCHEDULE_FAILED", e.message)
        }
    }

    @ReactMethod
    fun clearTrackingSchedule(promise: Promise) {
        try {
            val intent = Intent(context, LocationTracker::class.java).apply {
                action = LocationTracker.ACTION_UPDATE_CONFIG
                putExtra("clearSchedule", true)
            }
            context.startService(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e("PolyfenceModule", "Failed to clear tracking schedule: ${e.message}")
            promise.reject("CLEAR_SCHEDULE_FAILED", e.message)
        }
    }

    /**
     * PolyfenceCoreDelegate implementation: receive location updates from LocationTracker
     */
    override fun onLocationUpdate(locationData: Map<String, Any>) {
        sendLocationEvent(locationData)
    }

    /**
     * PolyfenceCoreDelegate implementation: receive geofence events from LocationTracker
     */
    override fun onGeofenceEvent(
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
        val event = mapOf(
            "zoneId" to zoneId,
            "zoneName" to zoneName,
            "eventType" to eventType,
            "timestamp" to System.currentTimeMillis(),
            "latitude" to latitude,
            "longitude" to longitude,
            "detectionTimeMs" to detectionTimeMs,
            "gpsAccuracy" to gpsAccuracy,
            "speedMps" to speedMps,
            "activityAtEvent" to activityAtEvent,
            "distanceToBoundaryM" to distanceToBoundaryM
        )
        sendGeofenceEvent(event)
    }

    /**
     * PolyfenceCoreDelegate implementation: receive error events from LocationTracker
     */
    override fun onError(errorCode: String, errorMessage: String, details: Map<String, Any>?) {
        val errorMap = mutableMapOf(
            "code" to errorCode,
            "message" to errorMessage,
            "timestamp" to System.currentTimeMillis()
        )
        if (details != null) {
            errorMap.putAll(details)
        }
        sendErrorEvent(errorMap)
    }

    /**
     * PolyfenceCoreDelegate implementation: receive performance events from LocationTracker
     */
    override fun onPerformanceEvent(event: Map<String, Any>) {
        sendPerformanceEvent(event)
    }

    /**
     * Send location event via onLocation event name
     */
    private fun sendLocationEvent(locationData: Map<String, Any>) {
        try {
            val event = Arguments.createMap()
            for ((key, value) in locationData) {
                when (value) {
                    is String -> event.putString(key, value)
                    is Int -> event.putInt(key, value)
                    is Double -> event.putDouble(key, value)
                    is Boolean -> event.putBoolean(key, value)
                    is Long -> event.putDouble(key, value.toDouble())
                    null -> event.putNull(key)
                    else -> event.putString(key, value.toString())
                }
            }
            sendEvent("onLocation", event)
        } catch (e: Exception) {
            Log.e("PolyfenceModule", "Failed to send location event: ${e.message}")
        }
    }

    /**
     * Send geofence event via onGeofenceEvent event name
     */
    private fun sendGeofenceEvent(eventData: Map<String, Any>) {
        try {
            val event = Arguments.createMap()
            for ((key, value) in eventData) {
                when (value) {
                    is String -> event.putString(key, value)
                    is Int -> event.putInt(key, value)
                    is Double -> event.putDouble(key, value)
                    is Boolean -> event.putBoolean(key, value)
                    is Long -> event.putDouble(key, value.toDouble())
                    null -> event.putNull(key)
                    else -> event.putString(key, value.toString())
                }
            }
            sendEvent("onGeofenceEvent", event)
        } catch (e: Exception) {
            Log.e("PolyfenceModule", "Failed to send geofence event: ${e.message}")
        }
    }

    /**
     * Send error event via onError event name
     */
    private fun sendErrorEvent(errorData: Map<String, Any>) {
        try {
            val event = Arguments.createMap()
            for ((key, value) in errorData) {
                when (value) {
                    is String -> event.putString(key, value)
                    is Int -> event.putInt(key, value)
                    is Double -> event.putDouble(key, value)
                    is Boolean -> event.putBoolean(key, value)
                    is Long -> event.putDouble(key, value.toDouble())
                    null -> event.putNull(key)
                    else -> event.putString(key, value.toString())
                }
            }
            sendEvent("onError", event)
        } catch (e: Exception) {
            Log.e("PolyfenceModule", "Failed to send error event: ${e.message}")
        }
    }

    /**
     * Send performance event via onPerformance event name
     */
    private fun sendPerformanceEvent(eventData: Map<String, Any>) {
        try {
            val event = Arguments.createMap()
            for ((key, value) in eventData) {
                when (value) {
                    is String -> event.putString(key, value)
                    is Int -> event.putInt(key, value)
                    is Double -> event.putDouble(key, value)
                    is Boolean -> event.putBoolean(key, value)
                    is Long -> event.putDouble(key, value.toDouble())
                    null -> event.putNull(key)
                    else -> event.putString(key, value.toString())
                }
            }
            sendEvent("onPerformance", event)
        } catch (e: Exception) {
            Log.e("PolyfenceModule", "Failed to send performance event: ${e.message}")
        }
    }

    /**
     * Helper: send event to React Native listeners
     */
    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    /**
     * Send status event (zone count, tracking enabled) to onPerformance
     */
    private fun sendStatus(context: Context) {
        val tracking = isTrackingEnabled(context)
        val zonesCount = try {
            val persistence = ZonePersistence(context)
            persistence.getZoneCount()
        } catch (e: Exception) { 0 }

        val statusMap = Arguments.createMap().apply {
            putString("type", "status")
            putBoolean("trackingEnabled", tracking)
            putInt("zonesCount", zonesCount)
            putNull("profile")
            putNull("lastAccuracy")
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
        sendEvent("onPerformance", statusMap)
    }

    /**
     * Device category bucketing (not exact model) for ML telemetry
     */
    private fun getDeviceCategory(): String {
        val manufacturer = Build.MANUFACTURER.lowercase(Locale.ROOT)
        val model = Build.MODEL.lowercase(Locale.ROOT)
        return when {
            manufacturer.contains("samsung") -> when {
                model.contains("sm-s9") || model.contains("sm-s24") || model.contains("sm-s23") || model.contains("sm-f") -> "samsung_flagship"
                model.contains("sm-a5") || model.contains("sm-a7") || model.contains("sm-a3") -> "samsung_mid"
                else -> "samsung_other"
            }
            manufacturer.contains("google") || manufacturer.contains("pixel") -> "google_pixel"
            manufacturer.contains("xiaomi") || manufacturer.contains("redmi") -> "xiaomi"
            manufacturer.contains("huawei") -> "huawei"
            manufacturer.contains("oneplus") -> "oneplus"
            manufacturer.contains("oppo") -> "oppo"
            manufacturer.contains("vivo") -> "vivo"
            else -> "android_other"
        }
    }

    /**
     * Tracking state helpers
     */
    private fun isTrackingEnabled(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getBoolean(KEY_TRACKING_ENABLED, false)
    }

    private fun setTrackingEnabled(context: Context, enabled: Boolean) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putBoolean(KEY_TRACKING_ENABLED, enabled).apply()
    }
}
