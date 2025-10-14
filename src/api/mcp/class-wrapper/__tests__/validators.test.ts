/**
 * Comprehensive tests for validators
 */

import { describe, it, expect } from '@jest/globals';
import { validateServerName, validateVersion, validateMethodDescription } from '../validators.js';

describe('Validators', () => {
  describe('validateServerName', () => {
    it('should accept valid kebab-case names', () => {
      expect(validateServerName('weather-service').valid).toBe(true);
      expect(validateServerName('my-server').valid).toBe(true);
      expect(validateServerName('api-v2').valid).toBe(true);
      expect(validateServerName('simple').valid).toBe(true);
      expect(validateServerName('test-123').valid).toBe(true);
    });

    it('should reject names with uppercase letters', () => {
      const result = validateServerName('WeatherService');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject names with underscores', () => {
      const result = validateServerName('weather_service');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject names with spaces', () => {
      const result = validateServerName('weather service');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject names starting with hyphen', () => {
      const result = validateServerName('-weather');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject names ending with hyphen', () => {
      const result = validateServerName('weather-');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject empty names', () => {
      const result = validateServerName('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Server name is required');
    });

    it('should reject names with special characters', () => {
      expect(validateServerName('weather.service').valid).toBe(false);
      expect(validateServerName('weather@service').valid).toBe(false);
      expect(validateServerName('weather$service').valid).toBe(false);
    });
  });

  describe('validateVersion', () => {
    it('should accept valid semver versions', () => {
      expect(validateVersion('1.0.0').valid).toBe(true);
      expect(validateVersion('0.1.0').valid).toBe(true);
      expect(validateVersion('2.3.4').valid).toBe(true);
      expect(validateVersion('10.20.30').valid).toBe(true);
    });

    it('should reject versions without patch number', () => {
      const result = validateVersion('1.0');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject versions with v prefix', () => {
      const result = validateVersion('v1.0.0');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject versions with pre-release tags', () => {
      const result = validateVersion('1.0.0-beta');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject versions with build metadata', () => {
      const result = validateVersion('1.0.0+build');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject empty versions', () => {
      const result = validateVersion('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Version is required');
    });

    it('should reject non-numeric versions', () => {
      expect(validateVersion('a.b.c').valid).toBe(false);
      expect(validateVersion('1.x.0').valid).toBe(false);
    });

    it('should reject versions with extra parts', () => {
      const result = validateVersion('1.0.0.0');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateMethodDescription', () => {
    it('should accept valid descriptions', () => {
      expect(validateMethodDescription('Get current weather for a city').valid).toBe(true);
      expect(validateMethodDescription('Calculate the total with tax').valid).toBe(true);
      expect(validateMethodDescription('A simple description').valid).toBe(true);
    });

    it('should reject descriptions shorter than 10 characters', () => {
      const result = validateMethodDescription('Short');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too short');
    });

    it('should reject empty descriptions', () => {
      const result = validateMethodDescription('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Description is required');
    });

    it('should reject whitespace-only descriptions', () => {
      const result = validateMethodDescription('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Description is required');
    });

    it('should accept descriptions exactly 10 characters', () => {
      const result = validateMethodDescription('1234567890');
      expect(result.valid).toBe(true);
    });

    it('should accept long descriptions', () => {
      const longDesc = 'This is a very long description that provides detailed information about what the method does and how it should be used by the AI agent.';
      const result = validateMethodDescription(longDesc);
      expect(result.valid).toBe(true);
    });

    it('should trim whitespace before checking length', () => {
      const result = validateMethodDescription('  Short  ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too short');
    });
  });
});
