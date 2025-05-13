/**
 * Theme Tokens for TeeMeYou UI Component System
 * 
 * This file contains all standardized design tokens used across the application.
 * It follows the standardization plan outlined in docs/standard/standplan.md
 */

// Main color palette
export const colors = {
  // Primary colors
  primary: {
    DEFAULT: '#FF69B4', // Hot Pink (Base)
    light: '#FFE6F0', // Light shade for backgrounds
    dark: '#D94C97', // Darker for hover/active states
  },
  
  // Accent colors
  accent: {
    DEFAULT: '#A8E6CF', // Soft Mint (Base)
    light: '#D5F2E3', 
    dark: '#8BC9B5',
  },
  
  // Neutrals
  neutral: {
    DEFAULT: '#F8F9FA', // Default background
    50: '#FFFFFF',
    100: '#F8F9FA',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#555555',
    700: '#374151',
    800: '#333333',
    900: '#111827',
  },
  
  // Feedback colors
  error: {
    DEFAULT: '#FF6B6B',
    light: '#FFE5E5',
    dark: '#E05252',
  },
  
  success: {
    DEFAULT: '#4CAF50',
    light: '#E6F9E7',
    dark: '#3B8C3F',
  },
  
  warning: {
    DEFAULT: '#FFC107',
    light: '#FFF8E1',
    dark: '#EAB308',
  },
  
  info: {
    DEFAULT: '#3B82F6',
    light: '#EFF6FF',
    dark: '#2563EB',
  },
};

// Typography
export const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
    mono: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
  },
  
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
};

// Spacing
export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  32: '8rem',
  40: '10rem',
  48: '12rem',
  56: '14rem',
  64: '16rem',
  72: '18rem',
  80: '20rem',
};

// Border radius
export const borderRadius = {
  none: '0',
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
};

// Shadows
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
};

// Transitions
export const transitions = {
  duration: {
    fast: '100ms',
    default: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  
  timing: {
    default: 'ease-in-out',
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// Z-index
export const zIndex = {
  auto: 'auto',
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',
  dropdown: '1000',
  sticky: '1100',
  fixed: '1200',
  modal: '1300',
  popover: '1400',
  toast: '1500',
  tooltip: '1600',
};

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  zIndex,
};

export default theme;