# InstaLabel - Bluetooth Label Printer App

A React Native application that connects to label printers and receipt printers via Bluetooth to print labels and receipts.

## Features

- **Bluetooth Connectivity**: Connect to classic Bluetooth printers
- **Device Management**: Scan, pair, and manage Bluetooth devices
- **Custom Printing**: Print custom text labels
- **Print Templates**: Pre-configured templates for common use cases
- **Modern UI**: Clean, intuitive interface with Material Design

## Prerequisites

- Android device with Bluetooth capability
- Label printer or receipt printer with Bluetooth support
- Android 5.0+ (API level 21+)

## Installation

### For End Users

1. Download the APK file from the releases
2. Install the APK on your Android device
3. Grant necessary permissions when prompted
4. Open the app and start printing!

### For Developers

1. Clone the repository
2. Install dependencies: `npm install`
3. Run on Android: `npx react-native run-android`

## Usage

### 1. Enable Bluetooth
- Open the app
- Tap "Enable Bluetooth" if Bluetooth is not enabled
- Grant location permission (required for Bluetooth scanning)

### 2. Connect to Printer
- Tap "Scan" to discover nearby Bluetooth devices
- Select your printer from the list
- The app will automatically pair and connect

### 3. Print Labels
- **Custom Text**: Enter your text and tap "Print Text"
- **Templates**: Use pre-configured templates for common formats
- **Receipts**: Print formatted receipts with the receipt template

## Bluetooth Permissions

The app requires the following permissions:
- `BLUETOOTH` - Basic Bluetooth functionality
- `BLUETOOTH_ADMIN` - Bluetooth device management
- `BLUETOOTH_CONNECT` - Connect to Bluetooth devices
- `BLUETOOTH_SCAN` - Scan for Bluetooth devices
- `ACCESS_FINE_LOCATION` - Required for Bluetooth scanning on Android

## Supported Printers

This app works with most Bluetooth-enabled:
- Label printers (Zebra, Brother, etc.)
- Receipt printers (Epson, Star, etc.)
- Thermal printers
- Any printer that accepts plain text via Bluetooth

## Troubleshooting

### Can't Find Printer
- Ensure the printer is in pairing mode
- Check that Bluetooth is enabled on both devices
- Try scanning multiple times
- Verify the printer supports classic Bluetooth (not BLE)

### Connection Issues
- Make sure the printer is within range
- Check that the printer is not connected to another device
- Restart Bluetooth on both devices
- Verify printer compatibility

### Print Quality Issues
- Check printer settings (dpi, darkness, etc.)
- Ensure proper label/receipt paper is loaded
- Clean printer head if necessary

## Building APK

To build a release APK:

```bash
cd android
./gradlew assembleRelease
```

The APK will be generated at:
`android/app/build/outputs/apk/release/app-release.apk`

## Development

### Dependencies
- `react-native-bluetooth-escpos-printer` - ESC/POS printer support
- `react-native-bluetooth-serial` - Bluetooth serial communication
- `react-native-bluetooth-classic` - Classic Bluetooth support
- `@expo/vector-icons` - Icon library

### Project Structure
```
src/
├── App.tsx              # Main application component
├── components/          # Reusable UI components
├── services/           # Bluetooth and printing services
└── utils/              # Utility functions
```

## License

This project is licensed under the MIT License.

## Support

For issues and feature requests, please create an issue in the repository.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
