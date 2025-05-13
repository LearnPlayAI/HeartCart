/**
 * Theme Provider Component
 * 
 * This component provides theme context to the application, allowing all components
 * to access the theme tokens and colors. It uses React Context to provide theme
 * information throughout the component tree.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import themeTokens, { ThemeColors, defaultThemeColors } from './theme-tokens';

// Define the shape of our theme context
interface ThemeContextType {
  colors: ThemeColors;
  setTheme: (theme: Partial<ThemeColors>) => void;
  resetTheme: () => void;
  // Include all theme tokens
  spacing: typeof themeTokens.spacing;
  borderRadius: typeof themeTokens.borderRadius;
  fontSize: typeof themeTokens.fontSize;
  fontWeight: typeof themeTokens.fontWeight;
  lineHeight: typeof themeTokens.lineHeight;
  shadows: typeof themeTokens.shadows;
  transitions: typeof themeTokens.transitions;
  zIndices: typeof themeTokens.zIndices;
}

// Create the context with default values
const ThemeContext = createContext<ThemeContextType>({
  colors: defaultThemeColors,
  setTheme: () => {},
  resetTheme: () => {},
  spacing: themeTokens.spacing,
  borderRadius: themeTokens.borderRadius,
  fontSize: themeTokens.fontSize,
  fontWeight: themeTokens.fontWeight,
  lineHeight: themeTokens.lineHeight,
  shadows: themeTokens.shadows,
  transitions: themeTokens.transitions,
  zIndices: themeTokens.zIndices,
});

// Custom hook to use the theme
export const useTheme = () => useContext(ThemeContext);

// Theme provider props
interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: Partial<ThemeColors>;
}

/**
 * Theme Provider Component
 * 
 * Provides theming context to the application and injects CSS variables
 * for theme colors into the :root element.
 * 
 * @param {ThemeProviderProps} props - Component props
 * @returns {JSX.Element} - Rendered component
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  initialTheme = defaultThemeColors 
}) => {
  // Merge initial theme with default theme
  const mergedInitialTheme = { ...defaultThemeColors, ...initialTheme };
  
  // State to track current theme
  const [colors, setColors] = useState<ThemeColors>(mergedInitialTheme);
  
  // Function to update theme
  const setTheme = (newTheme: Partial<ThemeColors>) => {
    setColors(prevTheme => ({ ...prevTheme, ...newTheme }));
  };
  
  // Function to reset theme to default
  const resetTheme = () => {
    setColors(defaultThemeColors);
  };
  
  // Update CSS variables when theme changes
  useEffect(() => {
    // Get the document's root element
    const root = document.documentElement;
    
    // Set CSS variables for each color
    Object.entries(colors).forEach(([key, value]) => {
      // Convert camelCase to kebab-case for CSS variables
      const cssVarName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(`--color-${cssVarName}`, value);
    });
    
    // Also set some additional variables for convenience
    root.style.setProperty('--color-primary-50', colors.primaryLight);
    root.style.setProperty('--color-primary-500', colors.primary);
    root.style.setProperty('--color-primary-700', colors.primaryDark);
    
    root.style.setProperty('--color-accent-50', colors.accentLight);
    root.style.setProperty('--color-accent-500', colors.accent);
    root.style.setProperty('--color-accent-700', colors.accentDark);
  }, [colors]);
  
  // Provide the theme context to children
  return (
    <ThemeContext.Provider 
      value={{ 
        colors, 
        setTheme, 
        resetTheme,
        spacing: themeTokens.spacing,
        borderRadius: themeTokens.borderRadius,
        fontSize: themeTokens.fontSize,
        fontWeight: themeTokens.fontWeight,
        lineHeight: themeTokens.lineHeight,
        shadows: themeTokens.shadows,
        transitions: themeTokens.transitions,
        zIndices: themeTokens.zIndices,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};