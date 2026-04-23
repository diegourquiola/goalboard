import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

const LIGHT = {
  background: '#F6F8FA',
  card: '#FFFFFF',
  foreground: '#111827',
  muted: '#F3F4F6',
  mutedForeground: '#6B7280',
  accent: '#007AFF',
  accentForeground: '#FFFFFF',
  success: '#00C853',
  destructive: '#EF4444',
  border: '#E1E4E8',
  chartGreen: '#00C853',
  chartBlue: '#007AFF',
  chartPurple: '#8B5CF6',
};

const DARK = {
  background: '#0D1117',
  card: '#161B22',
  foreground: '#FFFFFF',
  muted: '#1F2937',
  mutedForeground: '#9CA3AF',
  accent: '#007AFF',
  accentForeground: '#FFFFFF',
  success: '#00C853',
  destructive: '#F85149',
  border: '#21262D',
  chartGreen: '#00C853',
  chartBlue: '#007AFF',
  chartPurple: '#A371F7',
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
