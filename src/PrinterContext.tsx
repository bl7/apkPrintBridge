import React, {createContext, useContext, useState, ReactNode} from 'react';
import {NativeModules} from 'react-native';

// Types
interface BluetoothDevice {
  id: string;
  name: string | null;
  address: string;
  paired: boolean;
  technology: 'CLASSIC' | 'BLE' | 'DUAL' | 'UNKNOWN';
}

interface PrinterContextType {
  // State
  isBluetoothEnabled: boolean;
  devices: BluetoothDevice[];
  connectedDevice: BluetoothDevice | null;
  isScanning: boolean;
  isConnecting: boolean;
  isPrinting: boolean;

  // Actions
  setIsBluetoothEnabled: (enabled: boolean) => void;
  setDevices: (devices: BluetoothDevice[]) => void;
  setConnectedDevice: (device: BluetoothDevice | null) => void;
  setIsScanning: (scanning: boolean) => void;
  setIsConnecting: (connecting: boolean) => void;
  setIsPrinting: (printing: boolean) => void;

  // Functions
  checkBluetoothStatus: () => Promise<void>;
  enableBluetooth: () => Promise<void>;
  listPairedDevices: () => Promise<void>;
  scanForDevices: () => Promise<void>;
  connectToDevice: (device: BluetoothDevice) => Promise<void>;
  disconnectDevice: () => Promise<void>;
  printHelloWorld: () => Promise<void>;
  printCustomLabel: (
    text: string,
    barcode?: string,
    qrCode?: string,
  ) => Promise<void>;
  printTestLabel: () => Promise<void>;
  printESCTest: () => Promise<void>;
}

const PrinterContext = createContext<PrinterContextType | undefined>(undefined);

export const usePrinter = () => {
  const context = useContext(PrinterContext);
  if (!context) {
    throw new Error('usePrinter must be used within a PrinterProvider');
  }
  return context;
};

interface PrinterProviderProps {
  children: ReactNode;
}

export const PrinterProvider: React.FC<PrinterProviderProps> = ({children}) => {
  // State
  const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevice, setConnectedDevice] =
    useState<BluetoothDevice | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Check Bluetooth status
  const checkBluetoothStatus = async () => {
    try {
      const {PrintBridge} = NativeModules;
      const enabled = await PrintBridge.isBluetoothEnabled();
      setIsBluetoothEnabled(enabled);

      if (enabled) {
        await listPairedDevices();
      }
    } catch (error) {
      console.error('Error checking Bluetooth status:', error);
      setIsBluetoothEnabled(false);
    }
  };

  // Enable Bluetooth
  const enableBluetooth = async () => {
    try {
      const {PrintBridge} = NativeModules;
      const enabled = await PrintBridge.isBluetoothEnabled();
      if (enabled) {
        setIsBluetoothEnabled(true);
        await listPairedDevices();
      } else {
        throw new Error('Failed to enable Bluetooth');
      }
    } catch (error) {
      console.error('Error enabling Bluetooth:', error);
      throw error;
    }
  };

  // List paired devices
  const listPairedDevices = async () => {
    try {
      const {PrintBridge} = NativeModules;
      const pairedDevices = await PrintBridge.getPairedDevices();
      setDevices(pairedDevices);
    } catch (error) {
      console.error('Error listing paired devices:', error);
      setDevices([]);
    }
  };

  // Scan for devices
  const scanForDevices = async () => {
    try {
      setIsScanning(true);
      const {PrintBridge} = NativeModules;
      const scannedDevices = await PrintBridge.scanForDevices();
      setDevices(scannedDevices);
    } catch (error) {
      console.error('Error scanning for devices:', error);
    } finally {
      setIsScanning(false);
    }
  };

  // Connect to device
  const connectToDevice = async (device: BluetoothDevice) => {
    try {
      setIsConnecting(true);
      const {PrintBridge} = NativeModules;
      await PrintBridge.connectDual(device.address);
      setConnectedDevice(device);
    } catch (error) {
      console.error('Error connecting to device:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect device
  const disconnectDevice = async () => {
    try {
      const {PrintBridge} = NativeModules;
      await PrintBridge.disconnect();
      setConnectedDevice(null);
    } catch (error) {
      console.error('Error disconnecting device:', error);
    }
  };

  // Print Hello World
  const printHelloWorld = async () => {
    if (!connectedDevice) {
      throw new Error('No device connected');
    }

    try {
      setIsPrinting(true);

      // Try a more explicit TSPL command format
      const tsplCommands = [
        'SIZE 56 mm,31 mm', // Explicitly specify units
        'GAP 2 mm,0 mm', // Explicitly specify units
        'DIRECTION 0', // Set print direction
        'DENSITY 8', // Set print density
        'CLS', // Clear buffer
        'TEXT 50,50,"3",0,1,1,"Hello World"', // More centered position
        'PRINT 1', // Print 1 label
      ].join('\n');

      console.log('Sending TSPL commands:', tsplCommands);
      const {PrintBridge} = NativeModules;
      await PrintBridge.printTSPL(tsplCommands);
    } catch (error) {
      console.error('Error printing:', error);
      throw error;
    } finally {
      setIsPrinting(false);
    }
  };

  // Print custom label with 56x31mm size
  const printCustomLabel = async (
    text: string,
    barcode?: string,
    qrCode?: string,
  ) => {
    if (!connectedDevice) {
      throw new Error('No device connected');
    }

    try {
      setIsPrinting(true);

      // Calculate positions for 56x31mm label (56mm width, 31mm height)
      // Using 203 DPI: 56mm = ~447 dots, 31mm = ~248 dots
      const labelWidth = 447;
      const labelHeight = 248;
      const centerX = labelWidth / 2;

      let tsplCommands = [
        'SIZE 56 mm,31 mm', // Explicitly specify units
        'GAP 2 mm,0 mm', // Explicitly specify units
        'DIRECTION 0', // Set print direction
        'DENSITY 8', // Set print density
        'CLS', // Clear buffer
      ];

      // Add main text (centered)
      if (text) {
        const textX = Math.max(10, centerX - text.length * 4); // Approximate text positioning
        tsplCommands.push(`TEXT ${textX},20,"3",0,1,1,"${text}"`);
      }

      // Add barcode if provided (centered)
      if (barcode) {
        const barcodeX = centerX - 50; // Center barcode
        tsplCommands.push(`BARCODE ${barcodeX},60,"128",30,0,2,2,"${barcode}"`);
      }

      // Add QR code if provided (centered)
      if (qrCode) {
        const qrSize = 40; // QR code size in dots
        const qrX = centerX - qrSize / 2;
        tsplCommands.push(`QRCODE ${qrX},100,L,5,0,"${qrCode}"`);
      }

      // Print label
      tsplCommands.push('PRINT 1');

      const {PrintBridge} = NativeModules;
      await PrintBridge.printTSPL(tsplCommands.join('\n'));
    } catch (error) {
      console.error('Error printing custom label:', error);
      throw error;
    } finally {
      setIsPrinting(false);
    }
  };

  // Test function with different TSPL formats
  const printTestLabel = async () => {
    if (!connectedDevice) {
      throw new Error('No device connected');
    }

    try {
      setIsPrinting(true);

      // Try a very simple TSPL command first
      const simpleCommands = [
        'SIZE 50,30',
        'GAP 2,0',
        'DIRECTION 0',
        'CLS',
        'TEXT 100,100,"3",0,1,1,"TEST"',
        'PRINT 1',
      ].join('\n');

      console.log('Sending simple test commands:', simpleCommands);
      const {PrintBridge} = NativeModules;
      await PrintBridge.printTSPL(simpleCommands);
    } catch (error) {
      console.error('Error printing test label:', error);
      throw error;
    } finally {
      setIsPrinting(false);
    }
  };

  // Try ESC/POS commands instead of TSPL
  const printESCTest = async () => {
    if (!connectedDevice) {
      throw new Error('No device connected');
    }

    try {
      setIsPrinting(true);

      // Simple ESC/POS commands
      const escCommands = [
        '\x1B\x40', // Initialize printer
        '\x1B\x61\x01', // Center alignment
        '\x1B\x21\x10', // Double height and width
        'TEST LABEL',
        '\x1B\x21\x00', // Normal size
        '\n\n\n\n', // Feed paper
        '\x1B\x69', // Cut paper
      ].join('');

      console.log('Sending ESC/POS commands');
      const {PrintBridge} = NativeModules;
      await PrintBridge.printESC(escCommands);
    } catch (error) {
      console.error('Error printing ESC test:', error);
      throw error;
    } finally {
      setIsPrinting(false);
    }
  };

  const value: PrinterContextType = {
    // State
    isBluetoothEnabled,
    devices,
    connectedDevice,
    isScanning,
    isConnecting,
    isPrinting,

    // Actions
    setIsBluetoothEnabled,
    setDevices,
    setConnectedDevice,
    setIsScanning,
    setIsConnecting,
    setIsPrinting,

    // Functions
    checkBluetoothStatus,
    enableBluetooth,
    listPairedDevices,
    scanForDevices,
    connectToDevice,
    disconnectDevice,
    printHelloWorld,
    printCustomLabel,
    printTestLabel,
    printESCTest,
  };

  return (
    <PrinterContext.Provider value={value}>{children}</PrinterContext.Provider>
  );
};
