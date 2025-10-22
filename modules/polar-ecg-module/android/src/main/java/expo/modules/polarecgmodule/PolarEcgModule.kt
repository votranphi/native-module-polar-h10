package expo.modules.polarecgmodule

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.polar.sdk.api.PolarBleApi
import com.polar.sdk.api.PolarBleApiDefaultImpl
import com.polar.sdk.api.PolarBleApiCallback
import com.polar.sdk.api.model.PolarDeviceInfo
import com.polar.sdk.api.model.PolarEcgData
import com.polar.sdk.api.model.PolarSensorSetting
import com.polar.sdk.api.errors.PolarInvalidArgument
import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers
import io.reactivex.rxjava3.disposables.Disposable
import android.util.Log

class PolarEcgModule : Module() {
  private var api: PolarBleApi? = null
  private var ecgDisposable: Disposable? = null
  private val TAG = "PolarEcgModule"
  
  override fun definition() = ModuleDefinition {
    Name("PolarEcgModule")

    Events("onEcgData", "onDeviceConnected", "onDeviceDisconnected", "onError")

    Function("initialize") {
      val context = appContext.reactContext as Context
      api = PolarBleApiDefaultImpl.defaultImplementation(
        context,
        setOf(
          PolarBleApi.PolarBleSdkFeature.FEATURE_HR,
          PolarBleApi.PolarBleSdkFeature.FEATURE_POLAR_SDK_MODE,
          PolarBleApi.PolarBleSdkFeature.FEATURE_BATTERY_INFO,
          PolarBleApi.PolarBleSdkFeature.FEATURE_POLAR_ONLINE_STREAMING,
          PolarBleApi.PolarBleSdkFeature.FEATURE_DEVICE_INFO
        )
      )
      
      api?.setApiCallback(object : PolarBleApiCallback() {
        override fun deviceConnected(polarDeviceInfo: PolarDeviceInfo) {
          Log.d(TAG, "Device connected: ${polarDeviceInfo.deviceId}")
          sendEvent("onDeviceConnected", mapOf(
            "deviceId" to polarDeviceInfo.deviceId,
            "name" to polarDeviceInfo.name,
            "address" to polarDeviceInfo.address
          ))
        }

        override fun deviceDisconnected(polarDeviceInfo: PolarDeviceInfo) {
          Log.d(TAG, "Device disconnected: ${polarDeviceInfo.deviceId}")
          sendEvent("onDeviceDisconnected", mapOf(
            "deviceId" to polarDeviceInfo.deviceId
          ))
        }

        override fun blePowerStateChanged(powered: Boolean) {
          Log.d(TAG, "BLE power state changed: $powered")
        }

        override fun deviceConnecting(polarDeviceInfo: PolarDeviceInfo) {
          Log.d(TAG, "Device connecting: ${polarDeviceInfo.deviceId}")
        }
      })
      
      "Polar SDK Initialized"
    }

    AsyncFunction("connectToDevice") { deviceId: String ->
      try {
        api?.connectToDevice(deviceId)
        "Connecting to $deviceId"
      } catch (e: Exception) {
        sendEvent("onError", mapOf("message" to e.message))
        throw e
      }
    }

    AsyncFunction("disconnectFromDevice") { deviceId: String ->
      try {
        api?.disconnectFromDevice(deviceId)
        "Disconnected from $deviceId"
      } catch (e: Exception) {
        sendEvent("onError", mapOf("message" to e.message))
        throw e
      }
    }

    AsyncFunction("startEcgStreaming") { deviceId: String ->
      try {
        val isDisposed = ecgDisposable?.isDisposed ?: true
        
        if (isDisposed) {
          val polarApi = api
          if (polarApi != null) {
            ecgDisposable = polarApi.requestStreamSettings(deviceId, PolarBleApi.PolarDeviceDataType.ECG)
              .toFlowable()
              .flatMap { sensorSetting: PolarSensorSetting -> 
                Log.d(TAG, "Received sensor settings, starting ECG stream")
                polarApi.startEcgStreaming(deviceId, sensorSetting.maxSettings())
              }
              .observeOn(AndroidSchedulers.mainThread())
              .subscribe(
                { polarEcgData: PolarEcgData ->
                  Log.d(TAG, "ECG data received: ${polarEcgData.samples.size} samples")
                  
                  val samples = polarEcgData.samples.map { sample ->
                    mapOf(
                      "voltage" to sample.voltage,
                      "timeStamp" to sample.timeStamp
                    )
                  }
                  
                  sendEvent("onEcgData", mapOf(
                    "timeStamp" to polarEcgData.timeStamp,
                    "samples" to samples
                  ))
                },
                { error: Throwable ->
                  Log.e(TAG, "ECG stream failed: ${error.message}")
                  ecgDisposable = null
                  sendEvent("onError", mapOf("message" to "ECG stream failed: ${error.message}"))
                },
                {
                  Log.d(TAG, "ECG stream complete")
                  ecgDisposable = null
                }
              )
            
            "ECG streaming started for $deviceId"
          } else {
            throw Exception("Polar API not initialized")
          }
        } else {
          "ECG streaming already running"
        }
      } catch (e: PolarInvalidArgument) {
        Log.e(TAG, "Invalid argument: ${e.message}")
        sendEvent("onError", mapOf("message" to "Invalid argument: ${e.message}"))
        throw e
      } catch (e: Exception) {
        Log.e(TAG, "Error starting ECG stream: ${e.message}")
        sendEvent("onError", mapOf("message" to "Error: ${e.message}"))
        throw e
      }
    }

    AsyncFunction("stopEcgStreaming") {
      try {
        val isDisposed = ecgDisposable?.isDisposed ?: true
        
        if (!isDisposed) {
          ecgDisposable?.dispose()
          ecgDisposable = null
          Log.d(TAG, "ECG streaming stopped")
          "ECG streaming stopped"
        } else {
          "ECG streaming was not running"
        }
      } catch (e: Exception) {
        Log.e(TAG, "Error stopping ECG stream: ${e.message}")
        throw e
      }
    }

    OnDestroy {
      ecgDisposable?.dispose()
      api?.shutDown()
    }
  }
}