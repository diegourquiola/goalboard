import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@goalboard_theme';

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
  const [isDark, setIsDark] = useState(true);
  const [ready, setReady] = useState(false);
  const colors = isDark ? DARK : LIGHT;

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then(val => { if (val === 'light') setIsDark(false); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const toggle = () => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  };

  if (!ready) return null;

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
