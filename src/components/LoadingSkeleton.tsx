/**
 * Loading Skeleton Components
 * 
 * Provides consistent loading indicators and skeleton components
 * for better UX during data loading states.
 */

import { cn } from '../lib/utils';

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

/**
 * Base skeleton component
 */
export function Skeleton({ className, animate = true }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-gray-200 rounded',
        animate && 'animate-pulse',
        className
      )}
    />
  );
}

/**
 * Text skeleton with multiple lines
 */
interface TextSkeletonProps extends SkeletonProps {
  lines?: number;
  lineHeight?: 'sm' | 'md' | 'lg';
}

export function TextSkeleton({ 
  lines = 3, 
  lineHeight = 'md', 
  className,
  animate = true 
}: TextSkeletonProps) {
  const heights = {
    sm: 'h-3',
    md: 'h-4',
    lg: 'h-5',
  };

  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            heights[lineHeight],
            index === lines - 1 ? 'w-3/4' : 'w-full'
          )}
          animate={animate}
        />
      ))}
    </div>
  );
}

/**
 * Card skeleton for dashboard cards
 */
interface CardSkeletonProps extends SkeletonProps {
  showHeader?: boolean;
  showFooter?: boolean;
  contentLines?: number;
}

export function CardSkeleton({ 
  showHeader = true, 
  showFooter = false, 
  contentLines = 3,
  className,
  animate = true 
}: CardSkeletonProps) {
  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" animate={animate} />
          <Skeleton className="h-8 w-8 rounded-full" animate={animate} />
        </div>
      )}
      
      <TextSkeleton lines={contentLines} animate={animate} />
      
      {showFooter && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-24" animate={animate} />
            <Skeleton className="h-8 w-20 rounded" animate={animate} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Table skeleton for data tables
 */
interface TableSkeletonProps extends SkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

export function TableSkeleton({ 
  rows = 5, 
  columns = 4, 
  showHeader = true,
  className,
  animate = true 
}: TableSkeletonProps) {
  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 overflow-hidden', className)}>
      {showHeader && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-20" animate={animate} />
            ))}
          </div>
        </div>
      )}
      
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton 
                  key={colIndex} 
                  className={cn(
                    'h-4',
                    colIndex === 0 ? 'w-24' : colIndex === columns - 1 ? 'w-16' : 'w-32'
                  )} 
                  animate={animate} 
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Avatar skeleton
 */
interface AvatarSkeletonProps extends SkeletonProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function AvatarSkeleton({ size = 'md', className, animate = true }: AvatarSkeletonProps) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <Skeleton 
      className={cn(sizes[size], 'rounded-full', className)} 
      animate={animate} 
    />
  );
}

/**
 * Button skeleton
 */
interface ButtonSkeletonProps extends SkeletonProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'wide';
}

export function ButtonSkeleton({ 
  size = 'md', 
  variant = 'default',
  className, 
  animate = true 
}: ButtonSkeletonProps) {
  const sizes = {
    sm: 'h-8 px-3',
    md: 'h-10 px-4',
    lg: 'h-12 px-6',
  };

  const widths = {
    default: 'w-20',
    wide: 'w-32',
  };

  return (
    <Skeleton 
      className={cn(sizes[size], widths[variant], 'rounded-md', className)} 
      animate={animate} 
    />
  );
}

/**
 * Chart skeleton for analytics
 */
interface ChartSkeletonProps extends SkeletonProps {
  type?: 'bar' | 'line' | 'donut' | 'area';
  height?: string;
}

export function ChartSkeleton({ 
  type = 'bar', 
  height = 'h-64',
  className, 
  animate = true 
}: ChartSkeletonProps) {
  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <div className="flex items-end justify-between h-full px-4 pb-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton
                key={index}
                className={cn('w-8', `h-${Math.floor(Math.random() * 32) + 16}`)}
                animate={animate}
              />
            ))}
          </div>
        );
      
      case 'donut':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="relative">
              <Skeleton className="h-32 w-32 rounded-full" animate={animate} />
              <div className="absolute inset-4">
                <div className="h-full w-full bg-white rounded-full" />
              </div>
            </div>
          </div>
        );
      
      case 'line':
      case 'area':
      default:
        return (
          <div className="h-full p-4">
            <Skeleton className="w-full h-full rounded" animate={animate} />
          </div>
        );
    }
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200', height, className)}>
      {renderChart()}
    </div>
  );
}

/**
 * Dashboard skeleton for the main dashboard layout
 */
interface DashboardSkeletonProps extends SkeletonProps {
  showTabs?: boolean;
  showHeader?: boolean;
}

export function DashboardSkeleton({ 
  showTabs = true, 
  showHeader = true,
  className, 
  animate = true 
}: DashboardSkeletonProps) {
  return (
    <div className={cn('max-w-7xl mx-auto px-4 py-8', className)}>
      {showHeader && (
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="h-8 w-48" animate={animate} />
          <Skeleton className="h-6 w-24 rounded-full" animate={animate} />
        </div>
      )}

      {showTabs && (
        <div className="border-b mb-6">
          <div className="flex space-x-4 pb-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton 
                key={index} 
                className="h-8 w-24 rounded-t" 
                animate={animate} 
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <CardSkeleton key={index} animate={animate} />
        ))}
      </div>
    </div>
  );
}

/**
 * Form skeleton for loading forms
 */
interface FormSkeletonProps extends SkeletonProps {
  fields?: number;
  showSubmitButton?: boolean;
}

export function FormSkeleton({ 
  fields = 5, 
  showSubmitButton = true,
  className, 
  animate = true 
}: FormSkeletonProps) {
  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-6', className)}>
      <div className="space-y-6">
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-24" animate={animate} />
            <Skeleton className="h-10 w-full rounded-md" animate={animate} />
          </div>
        ))}
        
        {showSubmitButton && (
          <div className="pt-4">
            <ButtonSkeleton variant="wide" animate={animate} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Event card skeleton for events list
 */
export function EventCardSkeleton({ className, animate = true }: SkeletonProps) {
  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 overflow-hidden', className)}>
      <Skeleton className="h-48 w-full" animate={animate} />
      <div className="p-6">
        <Skeleton className="h-6 w-3/4 mb-2" animate={animate} />
        <TextSkeleton lines={2} className="mb-4" animate={animate} />
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4 rounded" animate={animate} />
            <Skeleton className="h-4 w-24" animate={animate} />
          </div>
          <ButtonSkeleton size="sm" animate={animate} />
        </div>
      </div>
    </div>
  );
}

/**
 * Navigation skeleton for loading navigation menus
 */
export function NavigationSkeleton({ className, animate = true }: SkeletonProps) {
  return (
    <div className={cn('flex space-x-4', className)}>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center space-x-2">
          <Skeleton className="h-4 w-4 rounded" animate={animate} />
          <Skeleton className="h-4 w-16" animate={animate} />
        </div>
      ))}
    </div>
  );
}

/**
 * Dashboard skeleton with tabs and content
 */
export function DashboardSkeleton({ 
  className = '', 
  animate = true,
  showTabs = true,
  showSidebar = false
}: DashboardSkeletonProps) {
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" animate={animate} />
              <Skeleton className="h-4 w-32" animate={animate} />
            </div>
            <ButtonSkeleton size="md" animate={animate} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          {showSidebar && (
            <div className="w-64 space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-32" animate={animate} />
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Skeleton className="h-4 w-4 rounded" animate={animate} />
                      <Skeleton className="h-4 flex-1" animate={animate} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1">
            {/* Tabs */}
            {showTabs && (
              <div className="bg-white rounded-lg shadow-sm mb-8 overflow-hidden">
                <div className="border-b border-gray-200 px-6">
                  <div className="flex space-x-8 py-4">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Skeleton className="h-5 w-5" animate={animate} />
                        <Skeleton className="h-4 w-16" animate={animate} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {Array.from({ length: 3 }).map((_, index) => (
                <StatsCardSkeleton key={index} animate={animate} />
              ))}
            </div>

            {/* Charts and Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartSkeleton animate={animate} />
              <TableSkeleton rows={4} animate={animate} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * List skeleton for events, volunteers, etc.
 */
export function ListSkeleton({ 
  className = '', 
  animate = true,
  items = 5,
  showImage = true
}: SkeletonProps & { items?: number; showImage?: boolean }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center space-x-4">
            {showImage && (
              <AvatarSkeleton size="md" animate={animate} />
            )}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" animate={animate} />
              <Skeleton className="h-4 w-1/2" animate={animate} />
              <div className="flex space-x-2">
                <Skeleton className="h-3 w-16" animate={animate} />
                <Skeleton className="h-3 w-20" animate={animate} />
              </div>
            </div>
            <div className="flex space-x-2">
              <ButtonSkeleton size="sm" animate={animate} />
              <ButtonSkeleton size="sm" animate={animate} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Loading state wrapper component
 */
export function LoadingWrapper({ 
  isLoading, 
  skeleton, 
  children,
  className = '',
  fallback
}: {
  isLoading: boolean;
  skeleton?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  fallback?: React.ReactNode;
}) {
  if (isLoading) {
    return (
      <div className={className}>
        {skeleton || fallback || <Skeleton className="h-32 w-full" />}
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Skeleton provider for consistent animation control
 */
export function SkeletonProvider({ 
  children, 
  animate = true 
}: { 
  children: React.ReactNode; 
  animate?: boolean; 
}) {
  return (
    <div data-skeleton-animate={animate}>
      {children}
    </div>
  );
}