package com.instalabel.bluetooth

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.IOException
import java.io.OutputStream
import java.util.*
import java.util.concurrent.ConcurrentHashMap

class PrintBridge(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    companion object {
        private const val TAG = "PrintBridge"
        private const val MODULE_NAME = "PrintBridge"
        
        // Classic Bluetooth SPP UUID
        private val SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
        
        // BLE Service UUIDs for common printer protocols
        private val PRINTER_SERVICE_UUIDS = listOf(
            UUID.fromString("0000FF00-0000-1000-8000-00805F9B34FB"), // Generic printer service
            UUID.fromString("0000FFE0-0000-1000-8000-00805F9B34FB"), // ESC/POS service
            UUID.fromString("0000FFE1-0000-1000-8000-00805F9B34FB"), // ESC/POS data
            UUID.fromString("0000FFE2-0000-1000-8000-00805F9B34FB"), // ESC/POS status
            UUID.fromString("0000FFE3-0000-1000-8000-00805F9B34FB"), // ESC/POS control
            UUID.fromString("0000FFE4-0000-1000-8000-00805F9B34FB"), // ESC/POS response
            UUID.fromString("0000FFE5-0000-1000-8000-00805F9B34FB"), // ESC/POS notification
            UUID.fromString("0000FFE6-0000-1000-8000-00805F9B34FB"), // ESC/POS command
            UUID.fromString("0000FFE7-0000-1000-8000-00805F9B34FB"), // ESC/POS data
            UUID.fromString("0000FFE8-0000-1000-8000-00805F9B34FB"), // ESC/POS status
            UUID.fromString("0000FFE9-0000-1000-8000-00805F9B34FB"), // ESC/POS control
            UUID.fromString("0000FFEA-0000-1000-8000-00805F9B34FB"), // ESC/POS response
            UUID.fromString("0000FFEB-0000-1000-8000-00805F9B34FB"), // ESC/POS notification
            UUID.fromString("0000FFEC-0000-1000-8000-00805F9B34FB"), // ESC/POS command
            UUID.fromString("0000FFED-0000-1000-8000-00805F9B34FB"), // ESC/POS data
            UUID.fromString("0000FFEE-0000-1000-8000-00805F9B34FB"), // ESC/POS status
            UUID.fromString("0000FFEF-0000-1000-8000-00805F9B34FB"), // ESC/POS control
            UUID.fromString("0000FFF0-0000-1000-8000-00805F9B34FB"), // ESC/POS response
            UUID.fromString("0000FFF1-0000-1000-8000-00805F9B34FB"), // ESC/POS notification
            UUID.fromString("0000FFF2-0000-1000-8000-00805F9B34FB"), // ESC/POS command
            UUID.fromString("0000FFF3-0000-1000-8000-00805F9B34FB"), // ESC/POS data
            UUID.fromString("0000FFF4-0000-1000-8000-00805F9B34FB"), // ESC/POS status
            UUID.fromString("0000FFF5-0000-1000-8000-00805F9B34FB"), // ESC/POS control
            UUID.fromString("0000FFF6-0000-1000-8000-00805F9B34FB"), // ESC/POS response
            UUID.fromString("0000FFF7-0000-1000-8000-00805F9B34FB"), // ESC/POS notification
            UUID.fromString("0000FFF8-0000-1000-8000-00805F9B34FB"), // ESC/POS command
            UUID.fromString("0000FFF9-0000-1000-8000-00805F9B34FB"), // ESC/POS data
            UUID.fromString("0000FFFA-0000-1000-8000-00805F9B34FB"), // ESC/POS status
            UUID.fromString("0000FFFB-0000-1000-8000-00805F9B34FB"), // ESC/POS control
            UUID.fromString("0000FFFC-0000-1000-8000-00805F9B34FB"), // ESC/POS response
            UUID.fromString("0000FFFD-0000-1000-8000-00805F9B34FB"), // ESC/POS notification
            UUID.fromString("0000FFFE-0000-1000-8000-00805F9B34FB"), // ESC/POS command
            UUID.fromString("0000FFFF-0000-1000-8000-00805F9B34FB")  // ESC/POS data
        )
    }

    // Connection types
    enum class ConnectionType {
        CLASSIC, BLE, DUAL, UNKNOWN
    }

    // Current connection state
    private var currentConnectionType: ConnectionType = ConnectionType.UNKNOWN
    private var classicSocket: BluetoothSocket? = null
    private var classicOutputStream: OutputStream? = null
    private var bleGatt: android.bluetooth.BluetoothGatt? = null
    private var bleWriteCharacteristic: android.bluetooth.BluetoothGattCharacteristic? = null
    private var bleConnectionState: Int = android.bluetooth.BluetoothProfile.STATE_DISCONNECTED

    // Bluetooth managers
    private val bluetoothManager: BluetoothManager by lazy {
        reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    }
    private val bluetoothAdapter: BluetoothAdapter? by lazy {
        bluetoothManager.adapter
    }
    private val bleScanner: BluetoothLeScanner? by lazy {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            bluetoothAdapter?.bluetoothLeScanner
        } else null
    }

    // Device cache for technology detection
    private val deviceTechnologyCache = ConcurrentHashMap<String, ConnectionType>()

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun isBluetoothEnabled(promise: Promise) {
        try {
            val enabled = bluetoothAdapter?.isEnabled == true
            promise.resolve(enabled)
        } catch (e: Exception) {
            promise.reject("BLUETOOTH_ERROR", "Failed to check Bluetooth status", e)
        }
    }

    @ReactMethod
    fun scanForDevices(promise: Promise) {
        val adapter = bluetoothAdapter
        if (adapter == null) {
            promise.reject("BLUETOOTH_ERROR", "Bluetooth not supported")
            return
        }

        try {
            val deviceList = Arguments.createArray()
            
            // Get paired devices
            val pairedDevices = adapter.bondedDevices
            pairedDevices.forEach { device ->
                val deviceMap = Arguments.createMap().apply {
                    putString("id", device.address)
                    putString("name", device.name ?: "Unknown Device")
                    putString("address", device.address)
                    putBoolean("paired", true)
                    putString("technology", getDeviceTechnology(device).name)
                }
                deviceList.pushMap(deviceMap)
            }

            // Start BLE scan for nearby devices
            val scanner = bleScanner
            if (scanner != null && hasBlePermissions()) {
                startBleScan()
            }

            promise.resolve(deviceList)
        } catch (e: Exception) {
            promise.reject("SCAN_ERROR", "Failed to scan for devices", e)
        }
    }

    @ReactMethod
    fun getPairedDevices(promise: Promise) {
        val adapter = bluetoothAdapter
        if (adapter == null) {
            promise.reject("BLUETOOTH_ERROR", "Bluetooth not supported")
            return
        }

        try {
            val deviceList = Arguments.createArray()
            
            // Get paired devices
            val pairedDevices = adapter.bondedDevices
            pairedDevices.forEach { device ->
                val deviceMap = Arguments.createMap().apply {
                    putString("id", device.address)
                    putString("name", device.name ?: "Unknown Device")
                    putString("address", device.address)
                    putBoolean("paired", true)
                    putString("technology", getDeviceTechnology(device).name)
                }
                deviceList.pushMap(deviceMap)
            }

            promise.resolve(deviceList)
        } catch (e: Exception) {
            promise.reject("SCAN_ERROR", "Failed to get paired devices", e)
        }
    }

    @ReactMethod
    fun connectToDevice(deviceAddress: String, promise: Promise) {
        try {
            Log.d(TAG, "Attempting to connect to device: $deviceAddress")
            val device = bluetoothAdapter?.getRemoteDevice(deviceAddress)
            if (device == null) {
                Log.e(TAG, "Device not found: $deviceAddress")
                promise.reject("CONNECTION_ERROR", "Device not found")
                return
            }

            val technology = getDeviceTechnology(device)
            Log.d(TAG, "Device technology detected: $technology")
            currentConnectionType = technology

            when (technology) {
                ConnectionType.CLASSIC -> {
                    Log.d(TAG, "Connecting via Classic Bluetooth")
                    connectClassic(device, promise)
                }
                ConnectionType.BLE -> {
                    Log.d(TAG, "Connecting via BLE")
                    connectBLE(device, promise)
                }
                ConnectionType.DUAL -> {
                    Log.d(TAG, "Connecting via Dual mode")
                    connectDual(device, promise)
                }
                ConnectionType.UNKNOWN -> {
                    Log.e(TAG, "Unknown device type")
                    promise.reject("CONNECTION_ERROR", "Unknown device type")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error connecting to device: $deviceAddress", e)
            promise.reject("CONNECTION_ERROR", "Failed to connect to device", e)
        }
    }

    @ReactMethod
    fun connectDual(deviceAddress: String, promise: Promise) {
        try {
            val device = bluetoothAdapter?.getRemoteDevice(deviceAddress)
            if (device == null) {
                promise.reject("CONNECTION_ERROR", "Device not found")
                return
            }

            val technology = getDeviceTechnology(device)
            currentConnectionType = technology

            when (technology) {
                ConnectionType.CLASSIC -> connectClassic(device, promise)
                ConnectionType.BLE -> connectBLE(device, promise)
                ConnectionType.DUAL -> {
                    // For dual devices, try BLE first, then fallback to classic
                    try {
                        connectBLE(device, promise)
                    } catch (e: Exception) {
                        // Fallback to classic if BLE fails
                        connectClassic(device, promise)
                    }
                }
                ConnectionType.UNKNOWN -> promise.reject("CONNECTION_ERROR", "Unknown device type")
            }
        } catch (e: Exception) {
            promise.reject("CONNECTION_ERROR", "Failed to connect to device", e)
        }
    }

    @ReactMethod
    fun disconnect(promise: Promise) {
        try {
            // Close classic connection
            classicOutputStream?.close()
            classicSocket?.close()
            classicOutputStream = null
            classicSocket = null

            // Close BLE connection
            bleGatt?.close()
            bleGatt = null
            bleWriteCharacteristic = null

            currentConnectionType = ConnectionType.UNKNOWN
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DISCONNECT_ERROR", "Failed to disconnect", e)
        }
    }

    @ReactMethod
    fun printTSPL(tsplCommands: String, promise: Promise) {
        when (currentConnectionType) {
            ConnectionType.CLASSIC -> printClassic(tsplCommands, promise)
            ConnectionType.BLE -> printBLE(tsplCommands, promise)
            ConnectionType.DUAL -> printDual(tsplCommands, promise)
            ConnectionType.UNKNOWN -> promise.reject("PRINT_ERROR", "No active connection")
        }
    }

    @ReactMethod
    fun printESC(escCommands: String, promise: Promise) {
        when (currentConnectionType) {
            ConnectionType.CLASSIC -> printClassic(escCommands, promise)
            ConnectionType.BLE -> printBLE(escCommands, promise)
            ConnectionType.DUAL -> printDual(escCommands, promise)
            ConnectionType.UNKNOWN -> promise.reject("PRINT_ERROR", "No active connection")
        }
    }

    @ReactMethod
    fun printZPL(zplCommands: String, promise: Promise) {
        when (currentConnectionType) {
            ConnectionType.CLASSIC -> printClassic(zplCommands, promise)
            ConnectionType.BLE -> printBLE(zplCommands, promise)
            ConnectionType.DUAL -> printDual(zplCommands, promise)
            ConnectionType.UNKNOWN -> promise.reject("PRINT_ERROR", "No active connection")
        }
    }

    @ReactMethod
    fun getConnectionStatus(promise: Promise) {
        val status = Arguments.createMap().apply {
            putString("type", currentConnectionType.name)
            putBoolean("connected", currentConnectionType != ConnectionType.UNKNOWN)
            putBoolean("classicConnected", classicSocket?.isConnected == true)
            putBoolean("bleConnected", bleConnectionState == android.bluetooth.BluetoothProfile.STATE_CONNECTED)
        }
        promise.resolve(status)
    }

    // Private helper methods

    private fun getDeviceTechnology(device: BluetoothDevice): ConnectionType {
        // Check cache first
        deviceTechnologyCache[device.address]?.let { return it }

        val technology = when (device.type) {
            BluetoothDevice.DEVICE_TYPE_CLASSIC -> ConnectionType.CLASSIC
            BluetoothDevice.DEVICE_TYPE_LE -> ConnectionType.BLE
            BluetoothDevice.DEVICE_TYPE_DUAL -> ConnectionType.DUAL
            else -> ConnectionType.UNKNOWN
        }

        // Cache the result
        deviceTechnologyCache[device.address] = technology
        return technology
    }

    private fun hasBlePermissions(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ActivityCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    private fun startBleScan() {
        val scanner = bleScanner
        if (scanner == null) return

        val scanSettings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()

        val scanFilter = ScanFilter.Builder()
            .build()

        scanner.startScan(listOf(scanFilter), scanSettings, bleScanCallback)
    }

    private val bleScanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            super.onScanResult(callbackType, result)
            
            // Send discovered device to React Native
            val deviceMap = Arguments.createMap().apply {
                putString("id", result.device.address)
                putString("name", result.device.name ?: "Unknown Device")
                putString("address", result.device.address)
                putBoolean("paired", false)
                putString("technology", "BLE")
            }
            
            sendEvent("deviceDiscovered", deviceMap)
        }
    }

    private fun connectClassic(device: BluetoothDevice, promise: Promise) {
        Thread {
            try {
                Log.d(TAG, "Creating classic Bluetooth socket for device: ${device.address}")
                val socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
                Log.d(TAG, "Attempting to connect classic socket...")
                socket.connect()
                Log.d(TAG, "Classic Bluetooth connected successfully")
                
                classicSocket = socket
                classicOutputStream = socket.outputStream
                
                promise.resolve(true)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to connect via classic Bluetooth", e)
                promise.reject("CLASSIC_CONNECTION_ERROR", "Failed to connect via classic Bluetooth", e)
            }
        }.start()
    }

    private fun connectBLE(device: BluetoothDevice, promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.JELLY_BEAN_MR2) {
            promise.reject("BLE_ERROR", "BLE not supported on this device")
            return
        }

        bleGatt = device.connectGatt(reactApplicationContext, false, bleGattCallback)
        promise.resolve(true)
    }

    private fun connectDual(device: BluetoothDevice, promise: Promise) {
        // Try BLE first (faster, more reliable)
        try {
            connectBLE(device, promise)
        } catch (e: Exception) {
            // Fallback to classic
            connectClassic(device, promise)
        }
    }

    private val bleGattCallback = object : android.bluetooth.BluetoothGattCallback() {
        override fun onConnectionStateChange(gatt: android.bluetooth.BluetoothGatt, status: Int, newState: Int) {
            bleConnectionState = newState
            when (newState) {
                android.bluetooth.BluetoothProfile.STATE_CONNECTED -> {
                    gatt.discoverServices()
                }
                android.bluetooth.BluetoothProfile.STATE_DISCONNECTED -> {
                    currentConnectionType = ConnectionType.UNKNOWN
                }
            }
        }

        override fun onServicesDiscovered(gatt: android.bluetooth.BluetoothGatt, status: Int) {
            if (status == android.bluetooth.BluetoothGatt.GATT_SUCCESS) {
                // Find write characteristic
                for (service in gatt.services) {
                    for (characteristic in service.characteristics) {
                        if (characteristic.properties and android.bluetooth.BluetoothGattCharacteristic.PROPERTY_WRITE != 0) {
                            bleWriteCharacteristic = characteristic
                            break
                        }
                    }
                    if (bleWriteCharacteristic != null) break
                }
            }
        }
    }

    private fun printClassic(data: String, promise: Promise) {
        Thread {
            try {
                classicOutputStream?.write(data.toByteArray())
                classicOutputStream?.flush()
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("CLASSIC_PRINT_ERROR", "Failed to print via classic Bluetooth", e)
            }
        }.start()
    }

    private fun printBLE(data: String, promise: Promise) {
        if (bleWriteCharacteristic == null) {
            promise.reject("BLE_PRINT_ERROR", "No write characteristic found")
            return
        }

        try {
            bleWriteCharacteristic?.value = data.toByteArray()
            bleGatt?.writeCharacteristic(bleWriteCharacteristic)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("BLE_PRINT_ERROR", "Failed to print via BLE", e)
        }
    }

    private fun printDual(data: String, promise: Promise) {
        // Try current connection type first
        when (currentConnectionType) {
            ConnectionType.BLE -> printBLE(data, promise)
            ConnectionType.CLASSIC -> printClassic(data, promise)
            else -> promise.reject("PRINT_ERROR", "Invalid connection type")
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
