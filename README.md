# Device Test Results Viewer

Web application for visualizing test results across multiple device types.

## Features

- Multiple input methods (manual, Zebra scanner, OCR camera)
- Real-time device status visualization
- Detailed test parameter comparison
- Dark/Light mode support

## Project Structure

```
src/
├── components/
│   ├── Scanner/          # Input methods (manual, Zebra, OCR)
│   ├── DeviceTable/      # Results table and rows
│   ├── DeviceModal/      # Detailed test view
│   ├── Layout/           # Header, stats cards
│   └── shared/           # Reusable components
├── constants/            # Device patterns, test names
├── contexts/             # Theme management
├── hooks/                # Custom hooks (OCR, devices)
├── types/                # TypeScript definitions
└── utils/                # Helper functions
```

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Tesseract.js (OCR)

## Setup

```bash
npm install
npm run dev
```

## Usage

### Input Methods

**Manual Entry**: Type device IDs separated by commas  
**Zebra Scanner**: Automatically captures scanned QR codes  
**OCR Camera**: Point webcam at device label to extract ID

### Viewing Results

Click any row to view detailed test results with parameter comparisons.

## Device ID Patterns

All device IDs follow a 7-character format (similar to license plates):

- Energy Trac: `2 letters + 3 digits + 2 letters` (e.g., TZ229AZ) - **ATP + Chip Info** (signal, RMS currents/voltages, modemTemp, low_status)
- Omni Receiver: `3 letters + 1 digit + 1 letter + 2 digits` (e.g., ENF3C26) - **ATP + Chip Info** (signal, modemTemp, low_status)
- Receiver (Smart): `3 letters + 1 digit + 1 letter + 2 digits` (e.g., GCK9V35) - **ATP + Leak Test + Chip Info** (extended with CPU temp)
- Omni Trac: `2 letters + 5 digits` (e.g., EX09483) - **ATP + ITP (26 tests)** (system performance + hardware)
- Smart Trac: `3 letters + 4 digits` (e.g., VUN0162) - **ATP + Leak Test** (sensorSignal, temp, low_status)
- Smart Trac Ultra Gen 2: `3 letters + 4 digits` (e.g., XZP2935) - **ATP + ITP (12 steps) + Leak Test** (provisioning + tests)
- Uni Trac: `1 letter + 3 digits + 3 letters` (e.g., R981JGI) - **ATP** (varies by protocol)

## API Integration

The application expects a REST API endpoint:

```
GET /api/devices/{deviceId}
```

Response format:
```json
{
  "deviceId": "ABC1234",
  "deviceType": "Smart Trac",
  "overallStatus": "approved",
  "tests": [
    {
      "name": "ATP",
      "status": "approved",
      "date": "2024-12-05T21:00:00.000Z",
      "parameters": [...]
    }
  ]
}
```

## License

Private - Tractian Internal Use
