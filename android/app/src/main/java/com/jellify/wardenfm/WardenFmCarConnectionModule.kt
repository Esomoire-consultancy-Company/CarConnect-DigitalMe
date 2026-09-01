package com.jellify.wardenfm

import android.os.Handler
import android.os.Looper
import androidx.car.app.connection.CarConnection
import androidx.lifecycle.Observer
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class WardenFmCarConnectionModule(
  private val context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {
  private val mainHandler = Handler(Looper.getMainLooper())
  private var carConnection: CarConnection? = null
  private var currentType = CarConnection.CONNECTION_TYPE_NOT_CONNECTED
  private var listenerCount = 0

  private val observer = Observer<Int> { value ->
    currentType = value ?: CarConnection.CONNECTION_TYPE_NOT_CONNECTED
    if (listenerCount > 0) emit(currentType)
  }

  override fun getName(): String = NAME

  override fun initialize() {
    super.initialize()
    mainHandler.post { ensureConnection() }
  }

  @ReactMethod
  fun getConnectionType(promise: Promise) {
    mainHandler.post {
      ensureConnection()
      promise.resolve(currentType)
    }
  }

  @ReactMethod
  fun addListener(eventName: String) {
    if (eventName == EVENT_CONNECTION_CHANGED) listenerCount += 1
  }

  @ReactMethod
  fun removeListeners(count: Double) {
    listenerCount = (listenerCount - count.toInt()).coerceAtLeast(0)
  }

  override fun invalidate() {
    mainHandler.post {
      carConnection?.type?.removeObserver(observer)
      carConnection = null
    }
    super.invalidate()
  }

  private fun ensureConnection() {
    if (carConnection != null) return
    carConnection = CarConnection(context).also { connection ->
      currentType = connection.type.value ?: CarConnection.CONNECTION_TYPE_NOT_CONNECTED
      connection.type.observeForever(observer)
    }
  }

  private fun emit(connectionType: Int) {
    context
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(EVENT_CONNECTION_CHANGED, connectionType)
  }

  companion object {
    const val NAME = "WardenFmCarConnection"
    const val EVENT_CONNECTION_CHANGED = "WardenFmCarConnectionChanged"
  }
}
