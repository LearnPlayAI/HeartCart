/**
 * Theme Tokens
 * 
 * This file defines the color palette and other design tokens for the TeeMeYou application.
 * It serves as a single source of truth for the design system, making it easy to maintain
 * consistent styling throughout the application.
 */

export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // Neutral colors
  neutral: string;
  neutralLight: string;
  neutralDark: string;
  
  // Accent colors
  accent: string;
  accentLight: string;
  accentDark: string;
  
  // Status colors
  success: string;
  successLight: string;
  error: string;
  errorLight: string;
  warning: string;
  warningLight: string;
  info: string;
  infoLight: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textLight: string;
  
  // Border colors
  border: string;
  borderLight: string;
  
  // Background colors
  background: string;
  backgroundAlt: string;
}

/**
 * Default theme colors for the TeeMeYou application
 * Based on the requested color palette with Hot Pink as primary and Mint as accent
 */
export const defaultThemeColors: ThemeColors = {
  // Primary colors - Hot Pink
  primary: '#FF69B4',
  primaryLight: '#FFE6F0',
  primaryDark: '#D94C97',
  
  // Neutral colors - Grays
  neutral: '#F8F9FA',
  neutralLight: '#FFFFFF',
  neutralDark: '#333333',
  
  // Accent colors - Soft Mint
  accent: '#A8E6CF',
  accentLight: '#E0F7EF',
  accentDark: '#8BC9B5',
  
  // Status colors
  success: '#4CAF50',
  successLight: '#E8F5E9',
  error: '#FF6B6B',
  errorLight: '#FFEBEE',
  warning: '#FFC107',
  warningLight: '#FFF8E1',
  info: '#2196F3',
  infoLight: '#E3F2FD',
  
  // Text colors
  textPrimary: '#333333',
  textSecondary: '#757575',
  textLight: '#FFFFFF',
  
  // Border colors
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  
  // Background colors
  background: '#FFFFFF',
  backgroundAlt: '#F8F9FA',
};

/**
 * Font sizing and spacing tokens
 */
export const spacing = {
  xs: '0.25rem',  // 4px
  sm: '0.5rem',   // 8px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  xxl: '3rem',    // 48px
};

/**
 * Border radius tokens
 */
export const borderRadius = {
  none: '0',
  sm: '0.125rem',  // 2px
  md: '0.25rem',   // 4px
  lg: '0.5rem',    // 8px
  xl: '1rem',      // 16px
  full: '9999px',  // Fully rounded (circles)
};

/**
 * Font size tokens
 */
export const fontSize = {
  xs: '0.75rem',     // 12px
  sm: '0.875rem',    // 14px
  md: '1rem',        // 16px
  lg: '1.125rem',    // 18px
  xl: '1.25rem',     // 20px
  '2xl': '1.5rem',   // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem',  // 36px
  '5xl': '3rem',     // 48px
};

/**
 * Font weight tokens
 */
export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

/**
 * Line height tokens
 */
export const lineHeight = {
  none: '1',
  tight: '1.25',
  normal: '1.5',
  loose: '2',
};

/**
 * Shadow tokens
 */
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
};

/**
 * Transition timing tokens
 */
export const transitions = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
};

/**
 * Z-index tokens for consistent layering
 */
export const zIndices = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modal: 1300,
  popover: 1400,
  tooltip: 1500,
};

export default {
  colors: defaultThemeColors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  lineHeight,
  shadows,
  transitions,
  zIndices,
};