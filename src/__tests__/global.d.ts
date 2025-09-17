/**
 * Global type declarations for test environment
 * 
 * This file extends the global namespace to include custom
 * test utilities and mocks that are added to the global object.
 */

import { vi } from 'vitest';

declare global {
  /**
   * Custom test utilities available globally in tests
   */
  var testUtils: {
    createMockEvent: (type: string, data?: any) => {
      type: string;
      preventDefault: ReturnType<typeof vi.fn>;
      stopPropagation: ReturnType<typeof vi.fn>;
      target: { value: string };
      currentTarget: any;
      bubbles: boolean;
      cancelable: boolean;
      defaultPrevented: boolean;
      eventPhase: number;
      isTrusted: boolean;
      timeStamp: number;
      [key: string]: any;
    };
    createMockFile: (name: string, size?: number, type?: string) => File;
    waitFor: (ms?: number) => Promise<void>;
    createMockFormData: (data?: Record<string, string | File>) => FormData;
  };

  /**
   * Mock IntersectionObserver for testing
   */
  var IntersectionObserver: {
    new (callback?: IntersectionObserverCallback, options?: IntersectionObserverInit): {
      observe: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      unobserve: ReturnType<typeof vi.fn>;
      root: Element | null;
      rootMargin: string;
      thresholds: ReadonlyArray<number>;
      takeRecords: ReturnType<typeof vi.fn>;
    };
    prototype: IntersectionObserver;
  };

  /**
   * Mock ResizeObserver for testing
   */
  var ResizeObserver: {
    new (callback?: ResizeObserverCallback): {
      observe: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      unobserve: ReturnType<typeof vi.fn>;
    };
    prototype: ResizeObserver;
  };

  /**
   * Extended Navigator interface for geolocation mocking
   */
  interface Navigator {
    geolocation: {
      getCurrentPosition: ReturnType<typeof vi.fn>;
      watchPosition: ReturnType<typeof vi.fn>;
      clearWatch: ReturnType<typeof vi.fn>;
    };
  }

  /**
   * Extended Window interface for matchMedia mocking
   */
  interface Window {
    matchMedia: ReturnType<typeof vi.fn>;
  }
}

export {};