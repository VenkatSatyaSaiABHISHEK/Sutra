/**
 * Web Bluetooth API utilities for device discovery
 */

/**
 * Represents a discovered Bluetooth device
 */
export interface BluetoothDevice {
  id: string;
  name: string;
  signal?: number;
  isConnected: boolean;
}

/**
 * Check if Web Bluetooth API is available
 * @returns Boolean indicating availability
 */
export const isBluetoothSupported = (): boolean => {
  return !!(navigator && navigator.bluetooth);
};

/**
 * Request Bluetooth device selection from user
 * Filters for Generic Access Profile (GAP) devices
 * @returns Promise with selected Bluetooth device
 */
export const requestBluetoothDevice = async (): Promise<BluetoothDevice | null> => {
  try {
    if (!isBluetoothSupported()) {
      throw new Error('Web Bluetooth API is not supported in this browser');
    }

    const device = await (navigator.bluetooth as any).requestDevice({
      filters: [
        { services: ['generic_access'] },
        { namePrefix: 'Room' }, // Filter for devices with "Room" prefix
      ],
      acceptAllDevices: false, // Be strict with what we accept
      optionalServices: ['generic_access', 'device_information'],
    });

    if (!device) {
      return null;
    }

    return {
      id: device.id,
      name: device.name || 'Unknown Device',
      signal: 0,
      isConnected: device.gatt?.connected || false,
    };
  } catch (error: any) {
    console.error('Bluetooth device request error:', error);
    throw error;
  }
};

/**
 * Connect to a Bluetooth device
 * @param device BluetoothDevice to connect
 * @returns Promise with connection status
 */
export const connectBluetoothDevice = async (
  device: BluetoothDevice
): Promise<boolean> => {
  try {
    const results = await (navigator.bluetooth as any).getAvailability();
    console.log('Bluetooth availability:', results);
    
    // In a real scenario, you would use the device.gatt.connect()
    // For now, we'll simulate connection
    console.log('Connected to device:', device.name);
    return true;
  } catch (error) {
    console.error('Bluetooth connection error:', error);
    throw error;
  }
};

/**
 * Map Bluetooth device name to room ID
 * Assumes device name format: "RoomID-1234" → "1234"
 * @param deviceName Bluetooth device name
 * @returns Extracted room ID or null
 */
export const extractRoomIdFromDevice = (deviceName: string): string | null => {
  // Match patterns like "Room-1234", "RoomID-5678", "1234"
  const patterns = [
    /room[id-]*(\d{4})/i, // "Room-1234" or "RoomID-1234"
    /(\d{4})/, // Just 4 digits
  ];

  for (const pattern of patterns) {
    const match = deviceName.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

/**
 * Get a list of paired Bluetooth devices (if available)
 * Note: This is limited by browser security restrictions
 * @returns Promise with array of devices
 */
export const getPairedDevices = async (): Promise<BluetoothDevice[]> => {
  try {
    if (!isBluetoothSupported()) {
      return [];
    }

    // Most browsers don't expose this directly for security reasons
    // We'll return an empty array and rely on requestDevice()
    console.log('Note: Paired devices access limited by browser security');
    return [];
  } catch (error) {
    console.error('Error getting paired devices:', error);
    return [];
  }
};

/**
 * Generate a room identifier for Bluetooth advertising
 * @param roomId 4-digit room ID
 * @returns Formatted string for device naming
 */
export const generateBluetoothDeviceId = (roomId: string): string => {
  return `Room-${roomId}`;
};
