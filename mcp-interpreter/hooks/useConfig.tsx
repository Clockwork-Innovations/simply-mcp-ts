"use client";

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark';

export interface ConfigSettings {
  theme: Theme;
  autoReconnect: boolean;
  defaultServerPath: string;
  logRetentionLimit: number;
  metricsEnabled: boolean;
}

export interface UseConfigReturn {
  settings: ConfigSettings;
  getSetting: <K extends keyof ConfigSettings>(key: K) => ConfigSettings[K];
  setSetting: <K extends keyof ConfigSettings>(key: K, value: ConfigSettings[K]) => void;
  resetToDefaults: () => void;
  exportConfig: () => string;
  importConfig: (json: string) => boolean;
}

const STORAGE_KEY = 'mcp-interpreter-config';

const DEFAULT_SETTINGS: ConfigSettings = {
  theme: 'dark',
  autoReconnect: false,
  defaultServerPath: '',
  logRetentionLimit: 1000,
  metricsEnabled: true,
};

// Helper to load config from localStorage
function loadConfigFromStorage(): ConfigSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(stored);
    // Merge with defaults to handle new settings
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (error) {
    console.error('Failed to load config from storage:', error);
    return DEFAULT_SETTINGS;
  }
}

// Helper to save config to localStorage
function saveConfigToStorage(settings: ConfigSettings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save config to storage:', error);
  }
}

// Helper to apply theme to document
function applyTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function useConfig(): UseConfigReturn {
  const [settings, setSettings] = useState<ConfigSettings>(() => {
    return loadConfigFromStorage();
  });

  // Save to localStorage whenever settings change
  useEffect(() => {
    saveConfigToStorage(settings);
  }, [settings]);

  // Apply theme whenever it changes
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  // Get a specific setting
  const getSetting = useCallback(<K extends keyof ConfigSettings>(key: K): ConfigSettings[K] => {
    return settings[key];
  }, [settings]);

  // Set a specific setting
  const setSetting = useCallback(<K extends keyof ConfigSettings>(
    key: K,
    value: ConfigSettings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Reset all settings to defaults
  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveConfigToStorage(DEFAULT_SETTINGS);
    applyTheme(DEFAULT_SETTINGS.theme);
  }, []);

  // Export config as JSON string
  const exportConfig = useCallback((): string => {
    return JSON.stringify(settings, null, 2);
  }, [settings]);

  // Import config from JSON string
  const importConfig = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);

      // Validate that it has the right shape
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Invalid config format');
      }

      // Merge with defaults to ensure all keys are present
      const newSettings: ConfigSettings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
      };

      setSettings(newSettings);
      saveConfigToStorage(newSettings);
      applyTheme(newSettings.theme);

      return true;
    } catch (error) {
      console.error('Failed to import config:', error);
      return false;
    }
  }, []);

  return {
    settings,
    getSetting,
    setSetting,
    resetToDefaults,
    exportConfig,
    importConfig,
  };
}
