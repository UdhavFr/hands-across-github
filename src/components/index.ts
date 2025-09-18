/**
 * Component Exports
 * 
 * Centralized exports for all components with proper TypeScript support
 * and enhanced error handling integration.
 */

// Core UI Components
export { ImageUpload } from './ImageUpload';
export { LocationInput } from './LocationInput';
export { Avatar } from './Avatar';
export { AvatarUpload } from './AvatarUpload';

// Form Components
export { EventForm } from './EventForm';
export { NgoProfileForm } from './NgoProfileForm';
export { CauseAreasInput } from './CauseAreasInput';
export { SkillsInput } from './SkillsInput';
export { SocialLinksInput } from './SocialLinksInput';

// Layout Components
export { Header } from './Header';
export { Footer } from './Footer';
export { Hero } from './Hero';

// Feature Components
export { EventCard } from './EventCard';
export { LocationFilter } from './LocationFilter';
export { DistanceDisplay } from './DistanceDisplay';
export { ProfileCompletionCard } from './ProfileCompletionCard';
export { ProfileEditModal } from './ProfileEditModal';
export { ProfileTab } from './ProfileTab';

// Certificate Components
export { CertificateGeneratorUI } from './CertificateGeneratorUI';
export { default as BulkCertificateGenerator } from './BulkCertificateGenerator';
export { CertificatePreview } from './CertificatePreview';
export { NamePlacementCanvas } from './NamePlacementCanvas';
export { BackdropUploader } from './BackdropUploader';
export { TemplatePreview } from './TemplatePreview';
export { TemplateSelector } from './TemplateSelector';

// Analytics Components
export { default as NgoAnalytics } from './NgoAnalytics';
export { EventMetricsTable } from './EventMetricsTable';
export { TopVolunteersTable } from './TopVolunteersTable';
export { VolunteerStatusDonut } from './VolunteerStatusDonut';
export { EventCategoryBarChart } from './EventCategoryBarChart';

// Activity Components
export { ActivityFeed } from './ActivityFeed';
export { RealtimeStatus } from './RealtimeStatus';

// Auth Components
export { AuthModal } from './AuthModal';
export { AuthCallbackPage } from './AuthCallbackPage';
export { RequireAuth } from './RequireAuth';

// Error Handling Components
export { ErrorBoundary, withErrorBoundary, useErrorHandler } from './ErrorBoundary';

// Storage Components
export { StorageHealthCheck } from './StorageHealthCheck';
export { StorageMonitoringDashboard } from './StorageMonitoringDashboard';

// Navigation Components
export { ResponsiveTabNavigation } from './ResponsiveTabNavigation';
export type { TabDefinition, ResponsiveTabNavigationProps } from './ResponsiveTabNavigation';

// Loading Components
export {
  Skeleton,
  TextSkeleton,
  AvatarSkeleton,
  ButtonSkeleton,
  CardSkeleton,
  TableSkeleton,
  ChartSkeleton,
  StatsCardSkeleton,
  FormSkeleton,
  DashboardSkeleton,
  ListSkeleton,
  LoadingWrapper,
  SkeletonProvider
} from './LoadingSkeleton';

// Dashboard Components
export { EventsTab } from './EventsTab';

// Diagnostics Components
export { RLSDiagnostics } from './RLSDiagnostics';

// Services (re-exported for convenience)
export { GeocodingService } from '../services/geocodingService';
export { StorageService, StorageUtils } from '../services/storageService';
export { StorageMonitoringService } from '../services/storageMonitoringService';
export { ErrorService, ErrorUtils } from '../services/errorService';

// Types (re-exported for convenience)
export type { LocationData, PlaceResult, LocationFilterData } from '../types/location';
export type { BucketHealthStatus, StorageHealthReport } from '../services/storageService';
export type { StorageMetrics, StorageQuota, StorageAlert } from '../services/storageMonitoringService';
export type { ErrorCategory, ErrorSeverity, ErrorLog, ErrorContext } from '../services/errorService';