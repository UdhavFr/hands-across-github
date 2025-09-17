/**
 * Dashboard State Management Hook
 * 
 * Provides tab state preservation across page refreshes,
 * user preference storage, and session-based navigation state management.
 */

import { useState, useEffect, useCallback } from 'react';
import { ErrorService } from '../services/errorService';

export interface DashboardState {
  currentTab: string;
  expandedSections: Set<string>;
  preferences: DashboardPreferences;
  sessionData: Record<string, any>;
}

export interface DashboardPreferences {
  defaultTab?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  compactMode?: boolean;
  showNotifications?: boolean;
  theme?: 'light' | 'dark' | 'system';
}

export interface UseDashboardStateOptions {
  storageKey?: string;
  defaultTab?: string;
  persistPreferences?: boolean;
  sessionStorage?: boolean;
}

/**
 * Hook for managing dashboard state with persistence
 */
export function useDashboardState(options: UseDashboardStateOptions = {}) {
  const {
    storageKey = 'dashboard-state',
    defaultTab = 'events',
    persistPreferences = true,
    sessionStorage = false,
  } = options;

  const [state, setState] = useState<DashboardState>({
    currentTab: defaultTab,
    expandedSections: new Set(),
    preferences: {
      autoRefresh: true,
      refreshInterval: 30000,
      compactMode: false,
      showNotifications: true,
      theme: 'system',
    },
    sessionData: {},
  });

  const [isLoading, setIsLoading] = useState(true);

  /**
   * Gets the appropriate storage mechanism
   */
  const getStorage = useCallback(() => {
    return sessionStorage ? window.sessionStorage : window.localStorage;
  }, [sessionStorage]);

  /**
   * Loads state from storage
   */
  const loadState = useCallback(async () => {
    try {
      setIsLoading(true);
      const storage = getStorage();
      
      // Load main state
      const savedState = storage.getItem(storageKey);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        
        setState(prev => ({
          ...prev,
          currentTab: parsedState.currentTab || defaultTab,
          expandedSections: new Set(parsedState.expandedSections || []),
          sessionData: parsedState.sessionData || {},
        }));
      }

      // Load preferences separately if persistence is enabled
      if (persistPreferences) {
        const savedPreferences = localStorage.getItem(`${storageKey}-preferences`);
        if (savedPreferences) {
          const parsedPreferences = JSON.parse(savedPreferences);
          setState(prev => ({
            ...prev,
            preferences: { ...prev.preferences, ...parsedPreferences },
          }));
        }
      }
    } catch (error) {
      ErrorService.logError(
        error instanceof Error ? error : new Error(String(error)),
        'useDashboardState.loadState'
      );
    } finally {
      setIsLoading(false);
    }
  }, [storageKey, defaultTab, persistPreferences, getStorage]);

  /**
   * Saves state to storage
   */
  const saveState = useCallback((newState: Partial<DashboardState>) => {
    try {
      const storage = getStorage();
      
      const stateToSave = {
        currentTab: newState.currentTab || state.currentTab,
        expandedSections: Array.from(newState.expandedSections || state.expandedSections),
        sessionData: newState.sessionData || state.sessionData,
      };

      storage.setItem(storageKey, JSON.stringify(stateToSave));

      // Save preferences separately if persistence is enabled
      if (persistPreferences && newState.preferences) {
        localStorage.setItem(
          `${storageKey}-preferences`,
          JSON.stringify(newState.preferences)
        );
      }
    } catch (error) {
      ErrorService.logError(
        error instanceof Error ? error : new Error(String(error)),
        'useDashboardState.saveState'
      );
    }
  }, [storageKey, state, persistPreferences, getStorage]);

  /**
   * Updates current tab
   */
  const setCurrentTab = useCallback((tab: string) => {
    const newState = { ...state, currentTab: tab };
    setState(newState);
    saveState(newState);
  }, [state, saveState]);

  /**
   * Toggles expanded section
   */
  const toggleExpandedSection = useCallback((sectionId: string) => {
    const newExpandedSections = new Set(state.expandedSections);
    
    if (newExpandedSections.has(sectionId)) {
      newExpandedSections.delete(sectionId);
    } else {
      newExpandedSections.add(sectionId);
    }

    const newState = { ...state, expandedSections: newExpandedSections };
    setState(newState);
    saveState(newState);
  }, [state, saveState]);

  /**
   * Updates preferences
   */
  const updatePreferences = useCallback((newPreferences: Partial<DashboardPreferences>) => {
    const updatedPreferences = { ...state.preferences, ...newPreferences };
    const newState = { ...state, preferences: updatedPreferences };
    setState(newState);
    saveState(newState);
  }, [state, saveState]);

  /**
   * Updates session data
   */
  const updateSessionData = useCallback((key: string, value: any) => {
    const newSessionData = { ...state.sessionData, [key]: value };
    const newState = { ...state, sessionData: newSessionData };
    setState(newState);
    saveState(newState);
  }, [state, saveState]);

  /**
   * Clears session data
   */
  const clearSessionData = useCallback((key?: string) => {
    if (key) {
      const newSessionData = { ...state.sessionData };
      delete newSessionData[key];
      const newState = { ...state, sessionData: newSessionData };
      setState(newState);
      saveState(newState);
    } else {
      const newState = { ...state, sessionData: {} };
      setState(newState);
      saveState(newState);
    }
  }, [state, saveState]);

  /**
   * Resets state to defaults
   */
  const resetState = useCallback(() => {
    const defaultState: DashboardState = {
      currentTab: defaultTab,
      expandedSections: new Set(),
      preferences: {
        autoRefresh: true,
        refreshInterval: 30000,
        compactMode: false,
        showNotifications: true,
        theme: 'system',
      },
      sessionData: {},
    };

    setState(defaultState);
    
    try {
      const storage = getStorage();
      storage.removeItem(storageKey);
      
      if (persistPreferences) {
        localStorage.removeItem(`${storageKey}-preferences`);
      }
    } catch (error) {
      ErrorService.logError(
        error instanceof Error ? error : new Error(String(error)),
        'useDashboardState.resetState'
      );
    }
  }, [defaultTab, storageKey, persistPreferences, getStorage]);

  /**
   * Exports current state for backup/debugging
   */
  const exportState = useCallback(() => {
    return {
      ...state,
      expandedSections: Array.from(state.expandedSections),
      timestamp: new Date().toISOString(),
    };
  }, [state]);

  /**
   * Imports state from backup
   */
  const importState = useCallback((importedState: any) => {
    try {
      const newState: DashboardState = {
        currentTab: importedState.currentTab || defaultTab,
        expandedSections: new Set(importedState.expandedSections || []),
        preferences: { ...state.preferences, ...importedState.preferences },
        sessionData: importedState.sessionData || {},
      };

      setState(newState);
      saveState(newState);
    } catch (error) {
      ErrorService.logError(
        error instanceof Error ? error : new Error(String(error)),
        'useDashboardState.importState'
      );
    }
  }, [defaultTab, state.preferences, saveState]);

  // Load state on mount
  useEffect(() => {
    loadState();
  }, [loadState]);

  // Auto-save state changes
  useEffect(() => {
    if (!isLoading) {
      const timeoutId = setTimeout(() => {
        saveState(state);
      }, 500); // Debounce saves

      return () => clearTimeout(timeoutId);
    }
  }, [state, saveState, isLoading]);

  return {
    // State
    ...state,
    isLoading,
    
    // Actions
    setCurrentTab,
    toggleExpandedSection,
    updatePreferences,
    updateSessionData,
    clearSessionData,
    resetState,
    
    // Utilities
    exportState,
    importState,
    
    // Computed values
    isExpanded: (sectionId: string) => state.expandedSections.has(sectionId),
    getSessionData: (key: string) => state.sessionData[key],
  };
}

/**
 * Hook for managing tab-specific state
 */
export function useTabState<T = any>(tabKey: string, defaultValue: T) {
  const { sessionData, updateSessionData, clearSessionData } = useDashboardState();
  
  const value = sessionData[tabKey] ?? defaultValue;
  
  const setValue = useCallback((newValue: T) => {
    updateSessionData(tabKey, newValue);
  }, [tabKey, updateSessionData]);

  const clearValue = useCallback(() => {
    clearSessionData(tabKey);
  }, [tabKey, clearSessionData]);

  return [value, setValue, clearValue] as const;
}