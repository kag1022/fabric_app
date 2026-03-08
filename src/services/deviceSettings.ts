export interface DeviceSettings {
  autoReadEnabled: boolean;
}

const STORAGE_KEY = 'fabric-device-settings.v1';

const DEFAULT_DEVICE_SETTINGS: DeviceSettings = {
  autoReadEnabled: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getDefaultDeviceSettings(): DeviceSettings {
  return { ...DEFAULT_DEVICE_SETTINGS };
}

export function isDeviceSettingsSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadDeviceSettings(): DeviceSettings {
  if (!isDeviceSettingsSupported()) {
    return getDefaultDeviceSettings();
  }

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) {
      return getDefaultDeviceSettings();
    }

    const parsed = JSON.parse(storedValue) as unknown;
    if (!isRecord(parsed) || typeof parsed.autoReadEnabled !== 'boolean') {
      return getDefaultDeviceSettings();
    }

    return {
      autoReadEnabled: parsed.autoReadEnabled,
    };
  } catch {
    return getDefaultDeviceSettings();
  }
}

export function saveDeviceSettings(settings: DeviceSettings): void {
  if (!isDeviceSettingsSupported()) {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      autoReadEnabled: settings.autoReadEnabled,
    }),
  );
}
