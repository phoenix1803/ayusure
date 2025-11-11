# Barcode Scanner Feature

## Overview
The AyuSure dashboard includes a professional barcode scanning feature that allows users to quickly access sample details by scanning AYU sample barcodes using their device camera.

## Features
- **Camera Integration**: Uses device's default camera for scanning
- **Real-time Detection**: Powered by ZXing library for accurate barcode recognition
- **Seamless UI**: Matches the existing AyuSure theme perfectly
- **Mobile Optimized**: Blue floating action button for mobile users
- **Fast Navigation**: Directly opens sample details upon successful scan
- **Format Validation**: Only accepts AYU-XXX format barcodes

## How to Use
1. Click the "Scan Sample" button in the dashboard (or blue floating button on mobile)
2. Allow camera permissions when prompted
3. Point camera at the AYU sample barcode
4. The scanner will automatically detect valid codes and navigate to sample details

## Technical Implementation
- Uses `@zxing/library` for barcode detection
- Responsive design with mobile-first approach
- Smooth animations and transitions
- Error handling for camera access issues
- Strict format validation for AYU-XXX codes

## Barcode Format
- Only accepts barcodes in format: **AYU-XXX** (where XXX is a 3-digit number)
- Invalid formats will show an error message
- Examples: AYU-009, AYU-010, AYU-011, etc.

## Browser Compatibility
- Requires HTTPS for camera access in production
- Works on modern browsers with camera support
- Optimized for mobile devices