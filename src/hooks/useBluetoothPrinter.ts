import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

// Web Bluetooth API type declarations
declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice(options: RequestDeviceOptions): Promise<BluetoothDeviceType>;
    };
  }
}

interface RequestDeviceOptions {
  acceptAllDevices?: boolean;
  filters?: Array<{ services?: string[]; name?: string; namePrefix?: string }>;
  optionalServices?: string[];
}

interface BluetoothDeviceType {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServerType;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

interface BluetoothRemoteGATTServerType {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServerType>;
  disconnect(): void;
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTServiceType>;
  getPrimaryServices(): Promise<BluetoothRemoteGATTServiceType[]>;
}

interface BluetoothRemoteGATTServiceType {
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristicType>;
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristicType[]>;
}

interface BluetoothRemoteGATTCharacteristicType {
  properties: {
    write: boolean;
    writeWithoutResponse: boolean;
  };
  writeValueWithResponse(value: BufferSource): Promise<void>;
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
}

// ESC/POS Commands for thermal printers
const ESC = 0x1B;
const GS = 0x1D;
const COMMANDS = {
  INIT: [ESC, 0x40], // Initialize printer
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT: [GS, 0x21, 0x10],
  DOUBLE_WIDTH: [GS, 0x21, 0x20],
  DOUBLE_SIZE: [GS, 0x21, 0x30],
  NORMAL_SIZE: [GS, 0x21, 0x00],
  UNDERLINE_ON: [ESC, 0x2D, 0x01],
  UNDERLINE_OFF: [ESC, 0x2D, 0x00],
  CUT: [GS, 0x56, 0x00], // Full cut
  PARTIAL_CUT: [GS, 0x56, 0x01],
  FEED_LINES: (n: number) => [ESC, 0x64, n], // Feed n lines
  LINE_SPACING: (n: number) => [ESC, 0x33, n],
};

interface PrinterDevice {
  device: BluetoothDeviceType;
  server: BluetoothRemoteGATTServerType;
  characteristic: BluetoothRemoteGATTCharacteristicType;
}

export interface PrinterStatus {
  isConnected: boolean;
  deviceName: string | null;
  isConnecting: boolean;
  isPrinting: boolean;
}

export function useBluetoothPrinter() {
  const [printer, setPrinter] = useState<PrinterDevice | null>(null);
  const [status, setStatus] = useState<PrinterStatus>({
    isConnected: false,
    deviceName: null,
    isConnecting: false,
    isPrinting: false,
  });

  // Common Bluetooth printer service UUIDs
  const PRINTER_SERVICE_UUIDS = [
    '000018f0-0000-1000-8000-00805f9b34fb', // Generic printer service
    '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Common ESC/POS service
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // SPP-like service
  ];

  const PRINTER_CHAR_UUIDS = [
    '00002af1-0000-1000-8000-00805f9b34fb', // Generic write char
    '49535343-8841-43f4-a8d4-ecbe34729bb3', // Common write char
    'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f', // Another common char
  ];

  const connect = useCallback(async () => {
    if (!navigator.bluetooth) {
      toast({
        title: "Bluetooth Not Supported",
        description: "Your browser doesn't support Web Bluetooth. Try Chrome or Edge.",
        variant: "destructive"
      });
      return false;
    }

    setStatus(prev => ({ ...prev, isConnecting: true }));

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICE_UUIDS,
      });

      if (!device.gatt) {
        throw new Error('GATT not available');
      }

      const server = await device.gatt.connect();
      
      // Try to find a writable characteristic
      let foundCharacteristic: BluetoothRemoteGATTCharacteristicType | null = null;
      
      for (const serviceUuid of PRINTER_SERVICE_UUIDS) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          for (const charUuid of PRINTER_CHAR_UUIDS) {
            try {
              const char = await service.getCharacteristic(charUuid);
              if (char.properties.write || char.properties.writeWithoutResponse) {
                foundCharacteristic = char;
                break;
              }
            } catch {
              continue;
            }
          }
          if (foundCharacteristic) break;
        } catch {
          continue;
        }
      }

      // If no known service, try to discover all services
      if (!foundCharacteristic) {
        const services = await server.getPrimaryServices();
        for (const service of services) {
          try {
            const chars = await service.getCharacteristics();
            for (const char of chars) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                foundCharacteristic = char;
                break;
              }
            }
            if (foundCharacteristic) break;
          } catch {
            continue;
          }
        }
      }

      if (!foundCharacteristic) {
        throw new Error('No writable characteristic found on printer');
      }

      // Setup disconnect handler
      device.addEventListener('gattserverdisconnected', () => {
        setPrinter(null);
        setStatus({
          isConnected: false,
          deviceName: null,
          isConnecting: false,
          isPrinting: false,
        });
        toast({
          title: "Printer Disconnected",
          description: "Bluetooth printer has been disconnected",
        });
      });

      setPrinter({
        device,
        server,
        characteristic: foundCharacteristic,
      });

      setStatus({
        isConnected: true,
        deviceName: device.name || 'Unknown Printer',
        isConnecting: false,
        isPrinting: false,
      });

      toast({
        title: "Printer Connected",
        description: `Connected to ${device.name || 'printer'}`,
      });

      return true;
    } catch (error: any) {
      console.error('Bluetooth connection error:', error);
      setStatus(prev => ({ ...prev, isConnecting: false }));
      
      if (error.name !== 'NotFoundError') {
        toast({
          title: "Connection Failed",
          description: error.message || "Could not connect to printer",
          variant: "destructive"
        });
      }
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (printer?.device.gatt?.connected) {
      printer.device.gatt.disconnect();
    }
    setPrinter(null);
    setStatus({
      isConnected: false,
      deviceName: null,
      isConnecting: false,
      isPrinting: false,
    });
  }, [printer]);

  const printRaw = useCallback(async (data: Uint8Array): Promise<boolean> => {
    if (!printer) {
      toast({
        title: "Printer Not Connected",
        description: "Please connect a Bluetooth printer first",
        variant: "destructive"
      });
      return false;
    }

    setStatus(prev => ({ ...prev, isPrinting: true }));

    try {
      // Split data into chunks (max 512 bytes per write for most BLE printers)
      const chunkSize = 512;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        if (printer.characteristic.properties.writeWithoutResponse) {
          await printer.characteristic.writeValueWithoutResponse(chunk);
        } else {
          await printer.characteristic.writeValueWithResponse(chunk);
        }
        // Small delay between chunks
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      setStatus(prev => ({ ...prev, isPrinting: false }));
      return true;
    } catch (error: any) {
      console.error('Print error:', error);
      setStatus(prev => ({ ...prev, isPrinting: false }));
      toast({
        title: "Print Failed",
        description: error.message || "Could not send data to printer",
        variant: "destructive"
      });
      return false;
    }
  }, [printer]);

  // Helper to create ESC/POS receipt data
  const createReceiptData = useCallback((lines: ReceiptLine[]): Uint8Array => {
    const encoder = new TextEncoder();
    const parts: number[] = [];

    // Initialize printer
    parts.push(...COMMANDS.INIT);

    for (const line of lines) {
      // Apply alignment
      if (line.align === 'center') {
        parts.push(...COMMANDS.ALIGN_CENTER);
      } else if (line.align === 'right') {
        parts.push(...COMMANDS.ALIGN_RIGHT);
      } else {
        parts.push(...COMMANDS.ALIGN_LEFT);
      }

      // Apply size
      if (line.size === 'double') {
        parts.push(...COMMANDS.DOUBLE_SIZE);
      } else if (line.size === 'tall') {
        parts.push(...COMMANDS.DOUBLE_HEIGHT);
      } else if (line.size === 'wide') {
        parts.push(...COMMANDS.DOUBLE_WIDTH);
      } else {
        parts.push(...COMMANDS.NORMAL_SIZE);
      }

      // Apply bold
      if (line.bold) {
        parts.push(...COMMANDS.BOLD_ON);
      }

      // Apply underline
      if (line.underline) {
        parts.push(...COMMANDS.UNDERLINE_ON);
      }

      // Add text
      const textBytes = encoder.encode(line.text);
      parts.push(...Array.from(textBytes));

      // Reset styles
      if (line.bold) {
        parts.push(...COMMANDS.BOLD_OFF);
      }
      if (line.underline) {
        parts.push(...COMMANDS.UNDERLINE_OFF);
      }
      
      // New line
      parts.push(0x0A);
    }

    // Feed and cut
    parts.push(...COMMANDS.FEED_LINES(4));
    parts.push(...COMMANDS.PARTIAL_CUT);

    return new Uint8Array(parts);
  }, []);

  return {
    status,
    connect,
    disconnect,
    printRaw,
    createReceiptData,
    COMMANDS,
  };
}

export interface ReceiptLine {
  text: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  underline?: boolean;
  size?: 'normal' | 'double' | 'tall' | 'wide';
}
