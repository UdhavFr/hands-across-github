/**
 * Dashboard Navigation and Mobile Optimization Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { ResponsiveTabNavigation, TabDefinition } from '../../components/ResponsiveTabNavigation';
import { Skeleton, CardSkeleton } from '../../components/LoadingSkeleton';
import { Calendar, Users, Settings, BarChart3 } from 'lucide-react';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  value: MockResizeObserver,
});

// Test data
const mockTabs: TabDefinition[] = [
  {
    key: 'overview',
    icon: BarChart3,
    label: 'Overview',
    mobileLabel: 'Overview',
  },
  {
    key: 'events',
    icon: Calendar,
    label: 'Events',
    mobileLabel: 'Events',
    badge: 5,
  },
  {
    key: 'volunteers',
    icon: Users,
    label: 'Volunteers',
    mobileLabel: 'Volunteers',
    badge: 12,
  },
  {
    key: 'settings',
    icon: Settings,
    label: 'Settings',
    mobileLabel: 'Settings',
    disabled: true,
  },
];

describe('ResponsiveTabNavigation', () => {
  const mockOnTabChange = vi.fn();

  it('renders tabs correctly', () => {
    render(
      <ResponsiveTabNavigation
        tabs={mockTabs}
        currentTab="overview"
        onTabChange={mockOnTabChange}
      />
    );

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('Volunteers')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows badges correctly', () => {
    render(
      <ResponsiveTabNavigation
        tabs={mockTabs}
        currentTab="events"
        onTabChange={mockOnTabChange}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });
});

describe('Loading Skeleton Components', () => {
  it('renders basic skeleton', () => {
    render(<Skeleton className="test-skeleton" />);
    
    const skeleton = document.querySelector('.test-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('bg-gray-200', 'rounded', 'animate-pulse');
  });

  it('renders card skeleton with image', () => {
    render(<CardSkeleton showImage={true} showBadge={true} lines={3} />);
    
    expect(document.querySelector('.h-48')).toBeInTheDocument();
  });
});