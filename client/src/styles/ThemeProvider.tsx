/**
 * ThemeProvider Component for TeeMeYou
 * 
 * This component provides a centralized theme context for the application,
 * allowing components to access theme values consistently.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import theme from './theme-tokens';

// Theme context type definition
type ThemeContextType = {
  theme: typeof theme;
  colorMode: 'light' | 'dark';
  toggleColorMode: () => void;
};

// Create the context with default values
const ThemeContext = createContext<ThemeContextType>({
  theme,
  colorMode: 'light',
  toggleColorMode: () => {},
});

// Custom hook for accessing theme values
export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');

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

  return (
    <ThemeContext.Provider value={{
      theme,
      colorMode,
      toggleColorMode
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;