#!/bin/bash

# Simple InstaLabel APK Build Script
echo "=========================================="
echo "    Building InstaLabel APK..."
echo "=========================================="

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -d "android" ]]; then
    echo "❌ Error: This script must be run from the InstaLabel project root directory"
    exit 1
fi

# Clean previous build
echo "🧹 Cleaning previous build..."
if [[ -d "android/app/build" ]]; then
    rm -rf android/app/build
    echo "✅ Previous build files cleaned"
fi

# Navigate to Android directory and build
echo "🔨 Building APK (this may take several minutes)..."
cd android

if ./gradlew assembleRelease; then
    echo "✅ APK built successfully!"
    cd ..
    
    # Check if APK was generated
    APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
    if [[ -f "$APK_PATH" ]]; then
        APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
        echo ""
        echo "🎉 APK Build Complete!"
        echo "📱 Location: $APK_PATH"
        echo "📏 Size: $APK_SIZE"
        echo ""
        
        # Check for connected devices and install
        echo "🔍 Checking for connected devices..."
        if command -v adb &> /dev/null; then
            # Get list of connected devices
            DEVICES=$(adb devices | grep -v "List of devices" | grep -v "^$" | wc -l)
            
            if [ "$DEVICES" -gt 0 ]; then
                echo "📱 Found $DEVICES connected device(s)"
                echo "🚀 Installing APK on device..."
                
                if adb install -r "$APK_PATH"; then
                    echo "✅ APK installed successfully on device!"
                    echo "🎯 You can now launch InstaLabel on your device"
                else
                    echo "❌ Failed to install APK on device"
                    echo "💡 Make sure USB debugging is enabled and device is authorized"
                fi
            else
                echo "⚠️  No devices connected via USB"
                echo "💡 Connect your device via USB and enable USB debugging"
                echo "🚀 APK is ready for manual installation: $APK_PATH"
            fi
        else
            echo "⚠️  ADB not found in PATH"
            echo "💡 Install Android SDK or add platform-tools to PATH"
            echo "🚀 APK is ready for manual installation: $APK_PATH"
        fi
    else
        echo "❌ APK was not generated"
        exit 1
    fi
else
    echo "❌ APK build failed!"
    cd ..
    exit 1
fi
