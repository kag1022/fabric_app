import { beforeEach, describe, expect, test } from 'vitest';

import {
  getDefaultDeviceSettings,
  loadDeviceSettings,
  saveDeviceSettings,
} from './deviceSettings';

describe('deviceSettings', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('returns the default settings when nothing is stored', () => {
    expect(loadDeviceSettings()).toEqual(getDefaultDeviceSettings());
  });

  test('persists the auto-read preference', () => {
    saveDeviceSettings({ autoReadEnabled: false });

    expect(loadDeviceSettings()).toEqual({ autoReadEnabled: false });
  });

  test('falls back to defaults when storage is invalid', () => {
    window.localStorage.setItem('fabric-device-settings.v1', '{"autoReadEnabled":"nope"}');

    expect(loadDeviceSettings()).toEqual(getDefaultDeviceSettings());
  });
});
