import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  TextInput,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {usePrinter} from '../PrinterContext';

const PrintPage: React.FC = () => {
  const {
    connectedDevice,
    isPrinting,
    printHelloWorld,
    printCustomLabel,
    printTestLabel,
    printESCTest,
    refreshConnectionStatus,
  } = usePrinter();
  const [customText, setCustomText] = useState('Sample Label');
  const [customBarcode, setCustomBarcode] = useState('123456789');
  const [customQRCode, setCustomQRCode] = useState('https://example.com');

  // Refresh connection status when page loads
  useEffect(() => {
    refreshConnectionStatus();
  }, []);

  const handlePrintHelloWorld = async () => {
    if (!connectedDevice) {
      Alert.alert(
        'No Printer Connected',
        'Please connect a printer first from the Connection page.',
      );
      return;
    }

    try {
      await printHelloWorld();
      Alert.alert('Success', '56x31mm label printed successfully!');
    } catch (error) {
      console.error('Error printing:', error);
      Alert.alert(
        'Error',
        'Failed to print. Please check your printer connection.',
      );
    }
  };

  const handlePrintCustomLabel = async () => {
    if (!connectedDevice) {
      Alert.alert(
        'No Printer Connected',
        'Please connect a printer first from the Connection page.',
      );
      return;
    }

    if (!customText.trim()) {
      Alert.alert('Input Required', 'Please enter some text for the label.');
      return;
    }

    try {
      await printCustomLabel(
        customText,
        customBarcode || undefined,
        customQRCode || undefined,
      );
      Alert.alert('Success', 'Custom 56x31mm label printed successfully!');
    } catch (error) {
      console.error('Error printing custom label:', error);
      Alert.alert(
        'Error',
        'Failed to print custom label. Please check your printer connection.',
      );
    }
  };

  const handlePrintTestLabel = async () => {
    if (!connectedDevice) {
      Alert.alert(
        'No Printer Connected',
        'Please connect a printer first from the Connection page.',
      );
      return;
    }

    try {
      await printTestLabel();
      Alert.alert('Success', 'Test label printed successfully!');
    } catch (error) {
      console.error('Error printing test label:', error);
      Alert.alert(
        'Error',
        'Failed to print test label. Please check your printer connection.',
      );
    }
  };

  const handlePrintESCTest = async () => {
    if (!connectedDevice) {
      Alert.alert(
        'No Printer Connected',
        'Please connect a printer first from the Connection page.',
      );
      return;
    }

    try {
      await printESCTest();
      Alert.alert('Success', 'ESC/POS test printed successfully!');
    } catch (error) {
      console.error('Error printing ESC test:', error);
      Alert.alert(
        'Error',
        'Failed to print ESC test. Please check your printer connection.',
      );
    }
  };

  const handleGenerateAndPrintPNG = async () => {
    if (!connectedDevice) {
      Alert.alert(
        'No Printer Connected',
        'Please connect a printer first from the Connection page.',
      );
      return;
    }

    try {
      // Generate a mock base64 PNG string for demonstration
      // In a real implementation, this would be an actual PNG image
      const mockPNGHeader =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

      // Create a custom base64 string representing our label
      const labelText = 'sike bitch';
      const labelSize = '56x31mm';
      const timestamp = new Date().toISOString();

      // Create a mock PNG data structure
      const mockPNGData = {
        header: mockPNGHeader,
        metadata: {
          text: labelText,
          size: labelSize,
          timestamp: timestamp,
          dimensions: {width: 56, height: 31, unit: 'mm'},
        },
      };

      // Convert to base64 string
      const base64PNG = btoa(JSON.stringify(mockPNGData));

      console.log('Generated mock base64 PNG, length:', base64PNG.length);
      console.log('PNG data:', mockPNGData);

      // Show the generated PNG data
      Alert.alert(
        'Mock PNG Generated Successfully!',
        `Base64 PNG generated with text "${labelText}"\n\nSize: ${labelSize}\nLength: ${
          base64PNG.length
        } characters\n\nFirst 100 chars: ${base64PNG.substring(0, 100)}...`,
      );

      // TODO: Send base64PNG to printer
      // This would require implementing image printing in the native PrintBridge module
    } catch (error) {
      console.error('Error generating mock PNG:', error);
      Alert.alert('Error', 'Failed to generate mock PNG. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1976D2" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Print</Text>
        <Text style={styles.headerSubtitle}>
          Print 56x31mm Labels and Documents
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Connection Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Printer Status</Text>
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <MaterialIcons
                name={connectedDevice ? 'print' : 'print-disabled'}
                size={24}
                color={connectedDevice ? '#4CAF50' : '#F44336'}
              />
              <Text style={styles.statusText}>
                {connectedDevice ? 'Connected' : 'Not Connected'}
              </Text>
            </View>

            {/* Refresh Button */}
            <TouchableOpacity
              style={[styles.button, styles.refreshButton]}
              onPress={refreshConnectionStatus}>
              <MaterialIcons name="refresh" size={20} color="white" />
              <Text style={styles.buttonText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {connectedDevice && (
            <View style={styles.connectedDeviceInfo}>
              <Text style={styles.connectedDeviceName}>
                {connectedDevice.name || 'Unknown Device'}
              </Text>
              <Text style={styles.connectedDeviceAddress}>
                {connectedDevice.address}
              </Text>
            </View>
          )}
        </View>

        {/* Print Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Print Actions (56x31mm Labels)
          </Text>

          {/* Hello World Print Button */}
          <TouchableOpacity
            style={[
              styles.printButton,
              !connectedDevice && styles.disabledButton,
            ]}
            onPress={handlePrintHelloWorld}
            disabled={!connectedDevice || isPrinting}>
            <MaterialIcons name="print" size={24} color="white" />
            <Text style={styles.printButtonText}>
              {isPrinting ? 'Printing...' : 'Print 56x31mm Label'}
            </Text>
          </TouchableOpacity>

          {/* Test Print Button */}
          <TouchableOpacity
            style={[
              styles.printButton,
              styles.testPrintButton,
              !connectedDevice && styles.disabledButton,
            ]}
            onPress={handlePrintTestLabel}
            disabled={!connectedDevice || isPrinting}>
            <MaterialIcons name="bug-report" size={24} color="white" />
            <Text style={styles.printButtonText}>
              {isPrinting ? 'Printing...' : 'Print Test Label (50x30)'}
            </Text>
          </TouchableOpacity>

          {/* ESC/POS Test Button */}
          <TouchableOpacity
            style={[
              styles.printButton,
              styles.escTestButton,
              !connectedDevice && styles.disabledButton,
            ]}
            onPress={handlePrintESCTest}
            disabled={!connectedDevice || isPrinting}>
            <MaterialIcons name="receipt" size={24} color="white" />
            <Text style={styles.printButtonText}>
              {isPrinting ? 'Printing...' : 'Print ESC/POS Test'}
            </Text>
          </TouchableOpacity>

          {/* PNG Generation Button */}
          <TouchableOpacity
            style={[
              styles.printButton,
              styles.pngButton,
              !connectedDevice && styles.disabledButton,
            ]}
            onPress={handleGenerateAndPrintPNG}
            disabled={!connectedDevice || isPrinting}>
            <MaterialIcons name="image" size={24} color="white" />
            <Text style={styles.printButtonText}>
              {isPrinting ? 'Generating PNG...' : 'Generate & Print PNG Label'}
            </Text>
          </TouchableOpacity>

          {!connectedDevice && (
            <Text style={styles.disabledText}>
              Connect a printer from the Connection page to enable printing
            </Text>
          )}

          {/* Custom Label Input Section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Custom Label Text:</Text>
            <TextInput
              style={styles.textInput}
              value={customText}
              onChangeText={setCustomText}
              placeholder="Enter label text"
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Barcode (optional):</Text>
            <TextInput
              style={styles.textInput}
              value={customBarcode}
              onChangeText={setCustomBarcode}
              placeholder="Enter barcode data"
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>QR Code (optional):</Text>
            <TextInput
              style={styles.textInput}
              value={customQRCode}
              onChangeText={setCustomQRCode}
              placeholder="Enter QR code data"
              placeholderTextColor="#999"
            />

            <TouchableOpacity
              style={[
                styles.printButton,
                styles.customPrintButton,
                !connectedDevice && styles.disabledButton,
              ]}
              onPress={handlePrintCustomLabel}
              disabled={!connectedDevice || isPrinting}>
              <MaterialIcons name="label" size={24} color="white" />
              <Text style={styles.printButtonText}>
                {isPrinting ? 'Printing...' : 'Print Custom 56x31mm Label'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Status</Text>
          <View style={styles.statusGrid}>
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

            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Status</Text>
              <Text
                style={[
                  styles.statusValue,
                  {color: isPrinting ? '#FF9800' : '#2196F3'},
                ]}>
                {isPrinting ? 'PRINTING' : 'READY'}
              </Text>
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to Print</Text>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>1</Text>
            <Text style={styles.instructionText}>
              Go to the Connection page and connect your Bluetooth printer
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>2</Text>
            <Text style={styles.instructionText}>
              Return to this page and use the Print button
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>3</Text>
            <Text style={styles.instructionText}>
              Your printer will receive the TSPL commands and print "Hello
              World"
            </Text>
          </View>
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
    marginBottom: 15,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#333',
  },
  connectedDeviceInfo: {
    backgroundColor: '#E8F5E8',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    marginTop: 10,
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
  printButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 15,
  },
  printButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  disabledText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
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
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  instructionNumber: {
    backgroundColor: '#1976D2',
    color: 'white',
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 15,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  inputSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  customPrintButton: {
    backgroundColor: '#FF9800',
    marginTop: 15,
  },
  testPrintButton: {
    backgroundColor: '#9C27B0',
    marginTop: 10,
  },
  escTestButton: {
    backgroundColor: '#607D8B',
    marginTop: 10,
  },
  pngButton: {
    backgroundColor: '#E91E63',
    marginTop: 10,
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 15,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PrintPage;
