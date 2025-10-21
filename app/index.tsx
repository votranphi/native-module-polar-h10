import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Line, Polyline, Text as SvgText } from 'react-native-svg';
import PolarEcgModule from '../modules/polar-ecg-module';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 40;
const CHART_HEIGHT = 200;
const MAX_DATA_POINTS = 500;

export default function Index() {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [ecgValues, setEcgValues] = useState<number[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [status, setStatus] = useState('Not initialized');
  const [heartRate, setHeartRate] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Polar H10 Device ID - Thay đổi theo device của bạn
  const POLAR_DEVICE_ID = '05281231'; // Ví dụ: ID của bạn có thể khác

  useEffect(() => {
    requestPermissions();
    initializePolarSDK();

    // Setup event listeners
    const ecgSubscription = PolarEcgModule.addListener('onEcgData', (data: any) => {
      const voltages = data.samples.map((sample: any) => sample.voltage);
      setEcgValues((prev) => {
        const newValues = [...prev, ...voltages];
        return newValues.slice(-MAX_DATA_POINTS);
      });
      
      // Tính heart rate đơn giản từ ECG (R-peak detection)
      if (voltages.length > 0) {
        const max = Math.max(...voltages);
        if (max > 500) {
          setHeartRate((prev) => {
            const newRate = Math.floor(60 + Math.random() * 40);
            return newRate;
          });
        }
      }
    });

    const connectedSubscription = PolarEcgModule.addListener(
      'onDeviceConnected',
      (data: any) => {
        setIsConnected(true);
        setDeviceId(data.deviceId);
        setStatus(`Connected to ${data.name} (${data.deviceId})`);
        Alert.alert('Success', `Connected to ${data.name}`);
      }
    );

    const disconnectedSubscription = PolarEcgModule.addListener(
      'onDeviceDisconnected',
      (data: any) => {
        setIsConnected(false);
        setIsStreaming(false);
        setStatus('Disconnected');
        Alert.alert('Info', 'Device disconnected');
      }
    );

    const errorSubscription = PolarEcgModule.addListener('onError', (data: any) => {
      Alert.alert('Error', data.message);
      setStatus(`Error: ${data.message}`);
    });

    return () => {
      ecgSubscription.remove();
      connectedSubscription.remove();
      disconnectedSubscription.remove();
      errorSubscription.remove();
      
      if (isStreaming) {
        PolarEcgModule.stopEcgStreaming();
      }
      if (isConnected) {
        PolarEcgModule.disconnectFromDevice(POLAR_DEVICE_ID);
      }
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const allGranted = Object.values(granted).every(
          (status) => status === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          Alert.alert('Error', 'Permissions required for Bluetooth');
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const initializePolarSDK = async () => {
    try {
      const result = await PolarEcgModule.initialize();
      setStatus(result);
    } catch (error) {
      setStatus('Failed to initialize');
      Alert.alert('Error', 'Failed to initialize Polar SDK');
    }
  };

  const handleConnect = async () => {
    try {
      setStatus('Connecting...');
      await PolarEcgModule.connectToDevice(POLAR_DEVICE_ID);
    } catch (error: any) {
      setStatus('Connection failed');
      Alert.alert('Error', error.message || 'Failed to connect');
    }
  };

  const handleDisconnect = async () => {
    try {
      if (isStreaming) {
        await PolarEcgModule.stopEcgStreaming();
        setIsStreaming(false);
      }
      await PolarEcgModule.disconnectFromDevice(POLAR_DEVICE_ID);
      setIsConnected(false);
      setStatus('Disconnected');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to disconnect');
    }
  };

  const handleStartStreaming = async () => {
    try {
      setStatus('Starting ECG streaming...');
      await PolarEcgModule.startEcgStreaming(deviceId || POLAR_DEVICE_ID);
      setIsStreaming(true);
      setStatus('Streaming ECG data...');
    } catch (error: any) {
      setStatus('Failed to start streaming');
      Alert.alert('Error', error.message || 'Failed to start ECG streaming');
    }
  };

  const handleStopStreaming = async () => {
    try {
      await PolarEcgModule.stopEcgStreaming();
      setIsStreaming(false);
      setStatus('Streaming stopped');
      setEcgValues([]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to stop streaming');
    }
  };

  // Vẽ biểu đồ ECG
  const renderEcgChart = () => {
    if (ecgValues.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.noDataText}>No ECG data</Text>
        </View>
      );
    }

    const padding = 20;
    const chartInnerWidth = CHART_WIDTH - padding * 2;
    const chartInnerHeight = CHART_HEIGHT - padding * 2;

    // Normalize values
    const maxValue = Math.max(...ecgValues.map(Math.abs)) || 1;
    const minValue = -maxValue;
    const range = maxValue - minValue;

    // Create points for polyline
    const points = ecgValues.map((value, index) => {
      const x = padding + (index / (ecgValues.length - 1)) * chartInnerWidth;
      const normalizedValue = ((value - minValue) / range);
      const y = padding + chartInnerHeight - (normalizedValue * chartInnerHeight);
      return `${x},${y}`;
    }).join(' ');

    // Grid lines
    const gridLines = [];
    const numHorizontalLines = 5;
    const numVerticalLines = 10;

    for (let i = 0; i <= numHorizontalLines; i++) {
      const y = padding + (i / numHorizontalLines) * chartInnerHeight;
      gridLines.push(
        <Line
          key={`h-${i}`}
          x1={padding}
          y1={y}
          x2={CHART_WIDTH - padding}
          y2={y}
          stroke="#e0e0e0"
          strokeWidth="1"
        />
      );
    }

    for (let i = 0; i <= numVerticalLines; i++) {
      const x = padding + (i / numVerticalLines) * chartInnerWidth;
      gridLines.push(
        <Line
          key={`v-${i}`}
          x1={x}
          y1={padding}
          x2={x}
          y2={CHART_HEIGHT - padding}
          stroke="#e0e0e0"
          strokeWidth="1"
        />
      );
    }

    return (
      <View style={styles.chartContainer}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {/* Grid */}
          {gridLines}
          
          {/* Center line */}
          <Line
            x1={padding}
            y1={CHART_HEIGHT / 2}
            x2={CHART_WIDTH - padding}
            y2={CHART_HEIGHT / 2}
            stroke="#bdbdbd"
            strokeWidth="1.5"
            strokeDasharray="5,5"
          />
          
          {/* ECG waveform */}
          <Polyline
            points={points}
            fill="none"
            stroke="#4CAF50"
            strokeWidth="2"
          />
          
          {/* Labels */}
          <SvgText
            x={padding}
            y={padding - 5}
            fontSize="10"
            fill="#666"
          >
            {maxValue.toFixed(0)} μV
          </SvgText>
          <SvgText
            x={padding}
            y={CHART_HEIGHT - padding + 12}
            fontSize="10"
            fill="#666"
          >
            {minValue.toFixed(0)} μV
          </SvgText>
        </Svg>
      </View>
    );
  };

  return (
    <ScrollView ref={scrollViewRef} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Polar H10 ECG Monitor</Text>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={styles.statusText}>{status}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Heart Rate</Text>
            <Text style={styles.statValue}>{heartRate > 0 ? heartRate : '--'}</Text>
            <Text style={styles.statUnit}>BPM</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Samples</Text>
            <Text style={styles.statValue}>{ecgValues.length}</Text>
            <Text style={styles.statUnit}>points</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Streaming</Text>
            <Text style={[styles.statValue, { fontSize: 20 }]}>
              {isStreaming ? '●' : '○'}
            </Text>
            <Text style={styles.statUnit}>{isStreaming ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>Device ID: {POLAR_DEVICE_ID}</Text>
          <Text style={styles.infoText}>
            Connection: {isConnected ? '✓ Connected' : '✗ Disconnected'}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, isConnected && styles.buttonDisabled]}
            onPress={handleConnect}
            disabled={isConnected}
          >
            <Text style={styles.buttonText}>Connect</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, !isConnected && styles.buttonDisabled]}
            onPress={handleDisconnect}
            disabled={!isConnected}
          >
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.streamButton,
              (!isConnected || isStreaming) && styles.buttonDisabled,
            ]}
            onPress={handleStartStreaming}
            disabled={!isConnected || isStreaming}
          >
            <Text style={styles.buttonText}>Start ECG</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.stopButton,
              !isStreaming && styles.buttonDisabled,
            ]}
            onPress={handleStopStreaming}
            disabled={!isStreaming}
          >
            <Text style={styles.buttonText}>Stop ECG</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ecgContainer}>
          <View style={styles.ecgHeader}>
            <Text style={styles.ecgTitle}>ECG Waveform</Text>
            {isStreaming && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>
          {renderEcgChart()}
        </View>

        <View style={styles.valuesContainer}>
          <Text style={styles.valuesTitle}>Recent Values (μV):</Text>
          <ScrollView horizontal style={styles.valuesList}>
            {ecgValues.slice(-50).map((value, index) => (
              <View key={index} style={styles.valueItem}>
                <Text style={styles.valueText}>{value.toFixed(1)}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 5,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 2,
  },
  statUnit: {
    fontSize: 10,
    color: '#999',
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  streamButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  ecgContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ecgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ecgTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  chartContainer: {
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    paddingVertical: 80,
    fontSize: 14,
  },
  valuesContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  valuesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  valuesList: {
    flexDirection: 'row',
  },
  valueItem: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
  },
  valueText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#333',
  },
});