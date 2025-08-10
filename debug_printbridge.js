// Debug script for PrintBridge
// Run this in the React Native debugger or console

const {NativeModules} = require('react-native');

async function debugPrintBridge() {
  try {
    console.log('=== PrintBridge Debug ===');
    
    // Check if PrintBridge module exists
    const {PrintBridge} = NativeModules;
    if (!PrintBridge) {
      console.error('❌ PrintBridge native module not found!');
      return;
    }
    console.log('✅ PrintBridge module found');
    
    // Check available methods
    const methods = Object.getOwnPropertyNames(PrintBridge);
    console.log('📋 Available methods:', methods);
    
    // Test Bluetooth status
    try {
      const bluetoothEnabled = await PrintBridge.isBluetoothEnabled();
      console.log('📱 Bluetooth enabled:', bluetoothEnabled);
    } catch (error) {
      console.error('❌ Error checking Bluetooth status:', error);
    }
    
    // Test getting paired devices
    try {
      const pairedDevices = await PrintBridge.getPairedDevices();
      console.log('🔗 Paired devices:', pairedDevices);
    } catch (error) {
      console.error('❌ Error getting paired devices:', error);
    }
    
    // Test connection status
    try {
      const connectionStatus = await PrintBridge.getConnectionStatus();
      console.log('🔌 Connection status:', connectionStatus);
    } catch (error) {
      console.error('❌ Error getting connection status:', error);
    }
    
    console.log('=== Debug Complete ===');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Export for use in console
global.debugPrintBridge = debugPrintBridge;

// Auto-run if in debug mode
if (__DEV__) {
  console.log('🔧 PrintBridge debug script loaded. Run debugPrintBridge() to test.');
}
