"use client";

import { useState, useEffect, useCallback } from 'react';

export type OperationType = 'tool' | 'resource' | 'prompt' | 'root' | 'subscription' | 'completion' | 'other';

export interface OperationRecord {
  id: string;
  type: OperationType;
  name: string;
  timestamp: Date;
  duration: number; // milliseconds
  success: boolean;
  error?: string;
}

export interface MetricsData {
  totalOperations: number;
  operationsByType: Record<OperationType, number>;
  averageResponseTime: number;
  errorCount: number;
  errorRate: number;
  recentOperations: OperationRecord[];
  successRate: number;
}

export interface UseMetricsReturn {
  metrics: MetricsData;
  recordOperation: (type: OperationType, name: string, duration: number, success: boolean, error?: string) => void;
  clearMetrics: () => void;
  getMetrics: () => MetricsData;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const STORAGE_KEY = 'mcp-interpreter-metrics';
const MAX_RECENT_OPERATIONS = 10;

// Helper to load metrics from localStorage
function loadMetricsFromStorage(): MetricsData | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    // Convert timestamp strings back to Date objects
    if (parsed.recentOperations) {
      parsed.recentOperations = parsed.recentOperations.map((op: any) => ({
        ...op,
        timestamp: new Date(op.timestamp),
      }));
    }
    return parsed;
  } catch (error) {
    console.error('Failed to load metrics from storage:', error);
    return null;
  }
}

// Helper to save metrics to localStorage
function saveMetricsToStorage(metrics: MetricsData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
  } catch (error) {
    console.error('Failed to save metrics to storage:', error);
  }
}

// Initial empty metrics
function createEmptyMetrics(): MetricsData {
  return {
    totalOperations: 0,
    operationsByType: {
      tool: 0,
      resource: 0,
      prompt: 0,
      root: 0,
      subscription: 0,
      completion: 0,
      other: 0,
    },
    averageResponseTime: 0,
    errorCount: 0,
    errorRate: 0,
    recentOperations: [],
    successRate: 100,
  };
}

export function useMetrics(): UseMetricsReturn {
  const [metrics, setMetrics] = useState<MetricsData>(() => {
    return loadMetricsFromStorage() || createEmptyMetrics();
  });
  const [isEnabled, setIsEnabled] = useState(true);

  // Save metrics to localStorage whenever they change
  useEffect(() => {
    if (isEnabled) {
      saveMetricsToStorage(metrics);
    }
  }, [metrics, isEnabled]);

  // Record a new operation
  const recordOperation = useCallback((
    type: OperationType,
    name: string,
    duration: number,
    success: boolean,
    error?: string
  ) => {
    if (!isEnabled) return;

    setMetrics(prev => {
      // Create new operation record
      const newOperation: OperationRecord = {
        id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        name,
        timestamp: new Date(),
        duration,
        success,
        error,
      };

      // Update recent operations (keep last N)
      const recentOperations = [newOperation, ...prev.recentOperations].slice(0, MAX_RECENT_OPERATIONS);

      // Update counts
      const totalOperations = prev.totalOperations + 1;
      const operationsByType = {
        ...prev.operationsByType,
        [type]: prev.operationsByType[type] + 1,
      };
      const errorCount = success ? prev.errorCount : prev.errorCount + 1;

      // Calculate average response time
      const totalResponseTime = prev.averageResponseTime * prev.totalOperations + duration;
      const averageResponseTime = totalResponseTime / totalOperations;

      // Calculate rates
      const errorRate = (errorCount / totalOperations) * 100;
      const successRate = 100 - errorRate;

      return {
        totalOperations,
        operationsByType,
        averageResponseTime,
        errorCount,
        errorRate,
        recentOperations,
        successRate,
      };
    });
  }, [isEnabled]);

  // Clear all metrics
  const clearMetrics = useCallback(() => {
    const emptyMetrics = createEmptyMetrics();
    setMetrics(emptyMetrics);
    saveMetricsToStorage(emptyMetrics);
  }, []);

  // Get current metrics
  const getMetrics = useCallback(() => {
    return metrics;
  }, [metrics]);

  // Update enabled state
  const handleSetEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mcp-interpreter-metrics-enabled', JSON.stringify(enabled));
    }
  }, []);

  // Load enabled state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mcp-interpreter-metrics-enabled');
      if (stored) {
        try {
          setIsEnabled(JSON.parse(stored));
        } catch (error) {
          console.error('Failed to load metrics enabled state:', error);
        }
      }
    }
  }, []);

  return {
    metrics,
    recordOperation,
    clearMetrics,
    getMetrics,
    isEnabled,
    setEnabled: handleSetEnabled,
  };
}
