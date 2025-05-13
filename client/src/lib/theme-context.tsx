/**
 * ThemeContext for TeeMeYou
 * 
 * This provides a centralized theme management system that follows the design standards
 * in the UI Component Standardization Implementation Plan.
 * 
 * It handles:
 * - Color tokens management
 * - Theme switching (light/dark)
 * - Component styling integration
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

// Color Palette - Using the standardized color variables from our design system
export type ColorPalette = {
  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // Accent colors
  accent: string;
  
  // Neutral colors
  neutral: string;
  neutralDark: string;
  
  // Status colors
  error: string;
  success: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  
  // Border colors
  borderLight: string;
  borderMedium: string;
  
  // Background colors
  backgroundLight: string;
  backgroundMedium: string;
};

// Default color palette based on our CSS variables
export const defaultColorPalette: ColorPalette = {
  // Primary colors
  primary: '#FF69B4', // Hot Pink
  primaryLight: '#FFE6F0',
  primaryDark: '#D94C97',
  
  // Accent colors
  accent: '#A8E6CF', // Soft Mint
  
  // Neutral colors
  neutral: '#F8F9FA',
  neutralDark: '#333333',
  
  // Status colors
  error: '#FF6B6B',
  success: '#4CAF50',
  
  // Text colors
  textPrimary: '#333333',
  textSecondary: '#555555',
  textMuted: '#777777',
  
  // Border colors
  borderLight: '#E5E7EB',
  borderMedium: '#D1D5DB',
  
  // Background colors
  backgroundLight: '#FFFFFF',
  backgroundMedium: '#F8F9FA',
};

type ThemeContextType = {
  colorMode: 'light' | 'dark';
  toggleColorMode: () => void;
  colors: ColorPalette;
  // Add methods to get CSS variables for consistent styling
  getCssVar: (name: keyof ColorPalette) => string;
};

// Create the context with a default value
const ThemeContext = createContext<ThemeContextType>({
  colorMode: 'light',
  toggleColorMode: () => {},
  colors: defaultColorPalette,
  getCssVar: () => '',
});

// Custom hook for accessing the theme
export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');
  const [colors, setColors] = useState<ColorPalette>(defaultColorPalette);

  // Initialize theme from local storage or system preference
  useEffect(() => {
    // Check local storage first
    const savedTheme = localStorage.getItem('tmy-color-mode');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setColorMode(savedTheme);
      return;
    }
    
    // Use system preference if no saved preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setColorMode('dark');
    }
  }, []);

  // Update document with current theme
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(colorMode);
    localStorage.setItem('tmy-color-mode', colorMode);
  }, [colorMode]);

  // Toggle between light and dark theme
  const toggleColorMode = () => {
    setColorMode(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Helper function to get CSS variable values for components
  const getCssVar = (name: keyof ColorPalette): string => {
    return colors[name];
  };

  // Value object for the context provider
  const contextValue: ThemeContextType = {
    colorMode,
    toggleColorMode,
    colors,
    getCssVar
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;