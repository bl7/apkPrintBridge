import React, {useEffect} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  View,
  Text,
  TouchableOpacity,
  Alert,
  PermissionsAndroid,
  Platform,
  StyleSheet,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {usePrinter} from '../PrinterContext';

const PrinterConnectionPage: React.FC = () => {
  const {
    isBluetoothEnabled,
    devices,
    connectedDevice,
    isScanning,
    isConnecting,
    checkBluetoothStatus,
    enableBluetooth,
    listPairedDevices,
    scanForDevices,
    connectToDevice,
    disconnectDevice,
    getConnectionStatus,
  } = usePrinter();

  // Initialize Bluetooth on component mount
  useEffect(() => {
    checkBluetoothStatus();
    requestPermissions();
  }, []);

  // Request necessary permissions for Android 12+
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ];

        const results = await PermissionsAndroid.requestMultiple(permissions);

        const allGranted = Object.values(results).every(
          result => result === PermissionsAndroid.RESULTS.GRANTED,
        );

        if (!allGranted) {
          Alert.alert(
            'Permissions Required',
            'Bluetooth and location permissions are required for this app to work properly.',
            [{text: 'OK'}],
          );
        }
      } catch (error) {
        console.error('Error requesting permissions:', error);
      }
    }
  };

  const handleEnableBluetooth = async () => {
    try {
      await enableBluetooth();
      Alert.alert('Success', 'Bluetooth enabled successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to enable Bluetooth');
    }
  };

  const handleConnectToDevice = async (device: any) => {
    try {
      await connectToDevice(device);
      Alert.alert('Success', `Connected to ${device.name || 'Device'}`);
    } catch (error) {
      console.error('Error connecting to device:', error);
      Alert.alert('Error', 'Failed to connect to device');
    }
  };

  const handleDisconnectDevice = async () => {
    try {
      await disconnectDevice();
      Alert.alert('Success', 'Device disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting device:', error);
      Alert.alert('Error', 'Failed to disconnect device');
    }
  };

  const handleDebugConnection = async () => {
    try {
      const status = await getConnectionStatus();
      if (status) {
        Alert.alert(
          'Connection Debug Info',
          `Type: ${status.type}\nConnected: ${status.connected}\nClassic: ${status.classicConnected}\nBLE: ${status.bleConnected}`,
        );
      } else {
        Alert.alert('Debug Info', 'Failed to get connection status');
      }
    } catch (error) {
      console.error('Error getting debug info:', error);
      Alert.alert('Error', 'Failed to get debug info');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1976D2" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Printer Connection</Text>
        <Text style={styles.headerSubtitle}>Manage Bluetooth Devices</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Bluetooth Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bluetooth Status</Text>
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <Ionicons
                name={isBluetoothEnabled ? 'bluetooth' : 'bluetooth-outline'}
                size={24}
                color={isBluetoothEnabled ? '#4CAF50' : '#F44336'}
              />
              <Text style={styles.statusText}>
                {isBluetoothEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>

            {!isBluetoothEnabled && (
              <TouchableOpacity style={styles.button} onPress={handleEnableBluetooth}>
                <Text style={styles.buttonText}>Enable Bluetooth</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Device Management */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Devices</Text>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={scanForDevices}
              disabled={isScanning}>
              <Ionicons
                name={isScanning ? 'refresh' : 'refresh'}
                size={20}
                color="white"
              />
              <Text style={styles.scanButtonText}>
                {isScanning ? 'Scanning...' : 'Scan'}
              </Text>
            </TouchableOpacity>
          </View>

          {devices.length === 0 ? (
            <Text style={styles.noDevicesText}>No devices found</Text>
          ) : (
            <View>
              {devices.map(device => (
                <View key={device.id} style={styles.deviceItem}>
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>
                      {device.name || 'Unknown Device'}
                    </Text>
                    <Text style={styles.deviceAddress}>{device.address}</Text>
                    <View style={styles.deviceStatusRow}>
                      <Text style={styles.deviceStatus}>
                        {device.paired ? 'Paired' : 'Available'}
                      </Text>
                      <View
                        style={[
                          styles.technologyBadge,
                          styles[`technology${device.technology}`],
                        ]}>
                        <Text style={styles.technologyText}>
                          {device.technology}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {connectedDevice?.id === device.id ? (
                    <TouchableOpacity
                      style={[styles.button, styles.disconnectButton]}
                      onPress={handleDisconnectDevice}>
                      <MaterialIcons
                        name="bluetooth-disconnected"
                        size={20}
                        color="white"
                      />
                      <Text style={styles.buttonText}>Disconnect</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.button, styles.connectButton]}
                      onPress={() => handleConnectToDevice(device)}
                      disabled={isConnecting}>
                      <MaterialIcons name="bluetooth" size={20} color="white" />
                      <Text style={styles.buttonText}>
                        {isConnecting ? 'Connecting...' : 'Connect'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Connected Device Info */}
        {connectedDevice && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Connected Printer</Text>
            <View style={styles.connectedDeviceInfo}>
              <Text style={styles.connectedDeviceName}>
                {connectedDevice.name || 'Unknown Device'}
              </Text>
              <Text style={styles.connectedDeviceAddress}>
                {connectedDevice.address}
              </Text>
              <View style={styles.connectionDetails}>
                <View
                  style={[
                    styles.technologyBadge,
                    styles[`technology${connectedDevice.technology}`],
                  ]}>
                  <Text style={styles.technologyText}>
                    {connectedDevice.technology}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Connection Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Bluetooth</Text>
              <Text
                style={[
                  styles.statusValue,
                  {color: isBluetoothEnabled ? '#4CAF50' : '#F44336'},
                ]}>
                {isBluetoothEnabled ? 'ON' : 'OFF'}
              </Text>
            </View>

            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Printer</Text>
              <Text
                style={[
                  styles.statusValue,
                  {color: connectedDevice ? '#4CAF50' : '#F44336'},
                ]}>
                {connectedDevice ? 'CONNECTED' : 'DISCONNECTED'}
              </Text>
            </View>
          </View>
          
          {/* Debug Button */}
          <TouchableOpacity
            style={[styles.button, styles.debugButton]}
            onPress={handleDebugConnection}>
            <MaterialIcons name="bug-report" size={20} color="white" />
            <Text style={styles.buttonText}>Debug Connection</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1976D2',
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.8,
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  button: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#333',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scanButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  noDevicesText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    fontStyle: 'italic',
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deviceAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  deviceStatus: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  connectButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  disconnectButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  debugButton: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginTop: 15,
    alignSelf: 'center',
  },
  connectedDeviceInfo: {
    backgroundColor: '#E8F5E8',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  connectedDeviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  connectedDeviceAddress: {
    fontSize: 14,
    color: '#388E3C',
    marginTop: 5,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  deviceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  technologyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  technologyCLASSIC: {
    backgroundColor: '#2196F3',
  },
  technologyBLE: {
    backgroundColor: '#4CAF50',
  },
  technologyDUAL: {
    backgroundColor: '#FF9800',
  },
  technologyUNKNOWN: {
    backgroundColor: '#999',
  },
  technologyText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  connectionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
});

export default PrinterConnectionPage;
