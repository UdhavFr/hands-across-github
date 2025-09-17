/**
 * Responsive Tab Navigation Component
 * 
 * Reusable tab navigation with configurable breakpoints, mobile behavior,
 * and accessibility improvements for keyboard navigation.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

export interface TabDefinition {
  key: string;
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  mobileLabel?: string;
  badge?: number;
  disabled?: boolean;
  hidden?: boolean;
}

export interface ResponsiveTabNavigationProps {
  tabs: TabDefinition[];
  currentTab: string;
  onTabChange: (tabKey: string) => void;
  breakpoint?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  showScrollButtons?: boolean;
  enableKeyboardNavigation?: boolean;
  persistState?: boolean;
  storageKey?: string;
}

interface ScrollState {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  showScrollButtons: boolean;
}

export function ResponsiveTabNavigation({
  tabs,
  currentTab,
  onTabChange,
  breakpoint = 'sm',
  className = '',
  variant = 'underline',
  size = 'md',
  showScrollButtons = true,
  enableKeyboardNavigation = true,
  persistState = false,
  storageKey = 'tab-navigation-state',
}: ResponsiveTabNavigationProps) {
  const [scrollState, setScrollState] = useState<ScrollState>({
    canScrollLeft: false,
    canScrollRight: false,
    showScrollButtons: false,
  });
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Visible tabs (filter out hidden ones)
  const visibleTabs = tabs.filter(tab => !tab.hidden);

  /**
   * Updates scroll state based on container scroll position
   */
  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const canScrollLeft = scrollLeft > 0;
    const canScrollRight = scrollLeft < scrollWidth - clientWidth - 1;
    const showScrollButtons = scrollWidth > clientWidth;

    setScrollState({
      canScrollLeft,
      canScrollRight,
      showScrollButtons: showScrollButtons && showScrollButtons,
    });
  }, []);

  /**
   * Scrolls the tab container
   */
  const scroll = useCallback((direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.8;
    const targetScroll = direction === 'left' 
      ? container.scrollLeft - scrollAmount
      : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth',
    });
  }, []);

  /**
   * Scrolls to make the active tab visible
   */
  const scrollToActiveTab = useCallback(() => {
    const container = scrollContainerRef.current;
    const activeTabElement = tabRefs.current.get(currentTab);
    
    if (!container || !activeTabElement) return;

    const containerRect = container.getBoundingClientRect();
    const tabRect = activeTabElement.getBoundingClientRect();
    
    const isTabVisible = 
      tabRect.left >= containerRect.left && 
      tabRect.right <= containerRect.right;

    if (!isTabVisible) {
      const scrollLeft = activeTabElement.offsetLeft - 
        (container.clientWidth - activeTabElement.clientWidth) / 2;
      
      container.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: 'smooth',
      });
    }
  }, [currentTab]);

  /**
   * Handles keyboard navigation
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!enableKeyboardNavigation) return;

    const currentIndex = visibleTabs.findIndex(tab => tab.key === currentTab);
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : visibleTabs.length - 1;
        break;
      case 'ArrowRight':
        event.preventDefault();
        newIndex = currentIndex < visibleTabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = visibleTabs.length - 1;
        break;
      default:
        return;
    }

    const newTab = visibleTabs[newIndex];
    if (newTab && !newTab.disabled) {
      onTabChange(newTab.key);
    }
  }, [enableKeyboardNavigation, visibleTabs, currentTab, onTabChange]);

  /**
   * Handles tab selection
   */
  const handleTabClick = useCallback((tabKey: string) => {
    const tab = visibleTabs.find(t => t.key === tabKey);
    if (tab && !tab.disabled) {
      onTabChange(tabKey);
      
      // Persist state if enabled
      if (persistState && storageKey) {
        try {
          localStorage.setItem(storageKey, tabKey);
        } catch (error) {
          console.warn('Failed to persist tab state:', error);
        }
      }
    }
  }, [visibleTabs, onTabChange, persistState, storageKey]);

  /**
   * Gets responsive classes based on breakpoint
   */
  const getResponsiveClasses = useCallback(() => {
    const breakpointMap = {
      sm: 'sm:',
      md: 'md:',
      lg: 'lg:',
    };
    
    const prefix = breakpointMap[breakpoint];
    
    return {
      showFullLabel: `hidden ${prefix}inline`,
      showMobileLabel: `${prefix}hidden`,
      spacing: `space-x-1 ${prefix}space-x-2`,
      padding: `px-3 ${prefix}px-4`,
      minWidth: `min-w-[80px] ${prefix}min-w-[120px]`,
      iconMargin: `mr-1 ${prefix}mr-2`,
    };
  }, [breakpoint]);

  /**
   * Gets variant-specific classes
   */
  const getVariantClasses = useCallback((isActive: boolean, isDisabled: boolean) => {
    const baseClasses = 'flex-shrink-0 flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2';
    
    const sizeClasses = {
      sm: 'text-xs py-1.5',
      md: 'text-sm py-2',
      lg: 'text-base py-2.5',
    };

    const variantClasses = {
      default: isActive
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground hover:bg-accent',
      pills: isActive
        ? 'bg-primary text-primary-foreground rounded-full shadow-sm'
        : 'text-muted-foreground hover:text-foreground hover:bg-accent rounded-full',
      underline: isActive
        ? 'border-b-2 border-primary text-primary'
        : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-border',
    };

    const disabledClasses = isDisabled 
      ? 'opacity-50 cursor-not-allowed pointer-events-none'
      : 'cursor-pointer';

    return cn(
      baseClasses,
      sizeClasses[size],
      variantClasses[variant],
      disabledClasses
    );
  }, [variant, size]);

  // Update scroll state on mount and resize
  useEffect(() => {
    updateScrollState();
    
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => updateScrollState();
    const handleResize = () => updateScrollState();

    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [updateScrollState]);

  // Scroll to active tab when it changes
  useEffect(() => {
    scrollToActiveTab();
  }, [currentTab, scrollToActiveTab]);

  // Load persisted state on mount
  useEffect(() => {
    if (persistState && storageKey) {
      try {
        const savedTab = localStorage.getItem(storageKey);
        if (savedTab && visibleTabs.some(tab => tab.key === savedTab)) {
          onTabChange(savedTab);
        }
      } catch (error) {
        console.warn('Failed to load persisted tab state:', error);
      }
    }
  }, [persistState, storageKey, visibleTabs, onTabChange]);

  const responsiveClasses = getResponsiveClasses();

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-center">
        {/* Left scroll button */}
        {scrollState.showScrollButtons && showScrollButtons && (
          <button
            onClick={() => scroll('left')}
            disabled={!scrollState.canScrollLeft}
            className={cn(
              'flex-shrink-0 p-1 rounded-md transition-colors',
              'text-muted-foreground hover:text-foreground',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
            )}
            aria-label="Scroll tabs left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Tab container */}
        <div
          ref={scrollContainerRef}
          className={cn(
            'flex overflow-x-auto scrollbar-hide pb-px',
            responsiveClasses.spacing,
            variant === 'underline' && 'border-b border-border'
          )}
          role="tablist"
          onKeyDown={handleKeyDown}
        >
          {visibleTabs.map((tab) => {
            const isActive = currentTab === tab.key;
            const isDisabled = tab.disabled || false;
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                ref={(el) => {
                  if (el) {
                    tabRefs.current.set(tab.key, el);
                  } else {
                    tabRefs.current.delete(tab.key);
                  }
                }}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.key}`}
                tabIndex={isActive ? 0 : -1}
                className={cn(
                  getVariantClasses(isActive, isDisabled),
                  responsiveClasses.padding,
                  responsiveClasses.minWidth
                )}
                onClick={() => handleTabClick(tab.key)}
                disabled={isDisabled}
              >
                {Icon && (
                  <Icon className={cn('h-4 w-4 flex-shrink-0', responsiveClasses.iconMargin)} />
                )}
                
                {/* Full label for larger screens */}
                <span className={cn('whitespace-nowrap', responsiveClasses.showFullLabel)}>
                  {tab.label}
                </span>
                
                {/* Mobile label for smaller screens */}
                <span className={cn('whitespace-nowrap', responsiveClasses.showMobileLabel)}>
                  {tab.mobileLabel || tab.label}
                </span>

                {/* Badge */}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={cn(
                    'ml-2 px-2 py-0.5 text-xs rounded-full',
                    isActive 
                      ? 'bg-primary-foreground text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right scroll button */}
        {scrollState.showScrollButtons && showScrollButtons && (
          <button
            onClick={() => scroll('right')}
            disabled={!scrollState.canScrollRight}
            className={cn(
              'flex-shrink-0 p-1 rounded-md transition-colors',
              'text-muted-foreground hover:text-foreground',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
            )}
            aria-label="Scroll tabs right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}