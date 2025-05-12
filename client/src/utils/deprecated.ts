/**
 * Utility functions for handling deprecated components and features
 * Used as part of the transition from legacy product management to the new wizard
 */

import { useEffect } from 'react';

/**
 * Constants for feature flags related to the product wizard deployment
 */
export const PRODUCT_WIZARD_FLAGS = {
  ENABLED: 'product_wizard_enabled',
  DEFAULT_EXPERIENCE: 'product_wizard_default',
  PERCENTAGE_ROLLOUT: 'product_wizard_rollout_percentage',
};

/**
 * Hook to show a deprecation warning for components that will be phased out
 * 
 * @param componentName The name of the deprecated component
 * @param alternative The recommended replacement component
 * @param silent Whether to suppress console warnings in production
 */
export function useDeprecationWarning(
  componentName: string,
  alternative: string,
  silent: boolean = process.env.NODE_ENV === 'production'
): void {
  useEffect(() => {
    if (!silent) {
      console.warn(
        `${componentName} is deprecated and will be removed in a future release. ` +
        `Please use ${alternative} instead.`
      );
    }
  }, [componentName, alternative, silent]);
}

/**
 * Function to check if a feature flag is enabled
 * This will be used to control the rollout of new features
 * 
 * @param flag The feature flag to check
 * @param userId Optional user ID for user-specific flags
 * @returns boolean indicating if the feature is enabled
 */
export function isFeatureEnabled(flag: string, userId?: number): boolean {
  // This is a simplified implementation
  // In a real environment, this would check against a feature flag service
  
  // During the transition period, we'll enable all flags in development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Feature flag checks would typically come from a server-side configuration
  // or a service like LaunchDarkly, Split.io, etc.
  
  // For now, we'll return a simple implementation
  switch (flag) {
    case PRODUCT_WIZARD_FLAGS.ENABLED:
      return true; // The wizard is enabled for all users
    case PRODUCT_WIZARD_FLAGS.DEFAULT_EXPERIENCE:
      return false; // Not the default experience yet
    case PRODUCT_WIZARD_FLAGS.PERCENTAGE_ROLLOUT:
      // If we have a user ID, we can use it for consistent flag assignment
      if (userId) {
        // Simple deterministic hashing for consistent user experience
        // Users with ID % 100 < 25 will get the new experience (25% rollout)
        return userId % 100 < 25;
      }
      return false;
    default:
      return false;
  }
}

/**
 * HOC to mark a component as deprecated
 * 
 * @param Component The component to mark as deprecated
 * @param alternative The recommended replacement
 * @returns The original component with deprecation warning
 */
export function deprecated<T>(
  Component: React.ComponentType<T>,
  alternative: string
): React.FC<T> {
  const DeprecatedComponent: React.FC<T> = (props) => {
    useDeprecationWarning(Component.displayName || Component.name, alternative, false);
    return <Component {...props} />;
  };
  
  DeprecatedComponent.displayName = `Deprecated(${Component.displayName || Component.name})`;
  
  return DeprecatedComponent;
}