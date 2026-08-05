'use client';
/**
 * ThemeProvider — manages light/dark/auto theme switching.
 * Auto mode switches at configured hours based on local device time.
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { SITE_CONFIG } from '../config/site';

type ThemeMode = 'auto' | 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  isAfter7: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'auto',
  setMode: () => {},
  isDark: false,
  isAfter7: false,
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getIsNightByHour(): boolean {
  const hour = new Date().getHours();
  const start = SITE_CONFIG.nightModeStartHour;
  const end = SITE_CONFIG.nightModeEndHour;
  return hour >= start || hour < end;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('auto');
  const [isDark, setIsDark] = useState(false);
  const [isAfter7, setIsAfter7] = useState(false);

  const applyTheme = useCallback((currentMode: ThemeMode) => {
    const nightTime = getIsNightByHour();
    const dark = currentMode === 'dark' || (currentMode === 'auto' && nightTime);
    const after7 = nightTime;
    
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    setIsDark(dark);
    setIsAfter7(after7);
  }, []);

  // Initialize from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('_sh_theme') as ThemeMode | null;
    const initial = stored ?? 'auto';
    setModeState(initial);
    applyTheme(initial);
  }, [applyTheme]);

  // Re-check every minute for auto mode switches
  useEffect(() => {
    const interval = setInterval(() => {
      if (mode === 'auto') applyTheme('auto');
    }, 60_000);
    return () => clearInterval(interval);
  }, [mode, applyTheme]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem('_sh_theme', newMode);
    applyTheme(newMode);
  }, [applyTheme]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, isDark, isAfter7 }}>
      {children}
    </ThemeContext.Provider>
  );
}
