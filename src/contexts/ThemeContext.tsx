import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (newTheme: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme] = useState<ThemeMode>('light');

  // Ensure light mode is always applied, and dark class is completely removed
  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    root.classList.remove('dark');
    body.classList.remove('dark');
    root.classList.add('light');
    body.classList.add('light');
  }, []);

  const setTheme = async (_: ThemeMode) => {
    // No-op, always light
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
