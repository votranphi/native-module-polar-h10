# React Native Polar H10 ECG Example

A demo project showcasing how to stream real-time ECG data from a Polar H10 sensor to a React Native (Expo) application using a custom native module.

This project uses a local Expo Module (`modules/polar-ecg-module`) to bridge the official [polarofficial/polar-ble-sdk](https://github.com/polarofficial/polar-ble-sdk) (v5.4.0) with a React Native frontend.

---

## Features

* **React Native (Expo) Example:** A simple app to connect, start, and display live ECG data.
* **Custom Native Module:** All native bridging logic is encapsulated in `modules/polar-ecg-module`, built using the modern Expo Modules API.
* **Official Polar SDK:** Uses the official SDK for robust communication, including requesting stream settings and handling data streams.
* **Cross-Platform:** The native module includes implementations for both **Android (Kotlin)** and **iOS (Swift)**.

---

## Project Structure

```

.
├── app/                  \# Main Expo app source code
├── modules/
│   └── polar-ecg-module/ \# The custom native module
│       ├── android/      \# Android (Kotlin) native bridge
│       ├── ios/          \# iOS (Swift) native bridge
│       └── src/          \# TypeScript interface for the module
├── package.json
└── README.md

````

---

## Getting Started

### Prerequisites

1.  A physical Android or iOS device.
2.  A Polar H10 sensor.
3.  Node.js and dependencies for React Native development (see React Native docs).

**Note:** This project uses custom native code and **cannot** be run in the Expo Go app. You must create a development build.

### Installation & Usage

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/votranphi/native-module-polar-h10
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set Your Device ID:**
    Open `app/index.tsx` (or your main app file) and update the `POLAR_DEVICE_ID` constant with your sensor's unique ID. You can find this ID printed on the sensor or by using a BLE scanner app.

4.  **Run the development build:**

    **For Android:**
    ```bash
    npx expo prebuild --clean
    npx expo run:android
    ```

    **For iOS:**
    ```bash
    npx expo run:ios
    ```

---

## How It Works

The `polar-ecg-module` is responsible for all native Bluetooth communication.

1.  **Request Settings:** The module first calls `api.requestStreamSettings` on the native side to query the Polar H10 for its available ECG sensor settings (like sample rate and resolution).
2.  **Select Setting:** It selects the desired `PolarSensorSetting` from the list returned by the device.
3.  **Start Stream:** The module calls `api.startEcgStreaming`, passing in the selected settings object.
4.  **Data Events:** The native module subscribes to the resulting data stream (using RxJava on Android and RxSwift on iOS) and emits events to the React Native (JavaScript) layer using the `sendEvent` function. The React app listens for these events to update the UI.

---

## License

This project is available under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0) license.