import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase, hasSupabaseKeys } from '../lib/supabase';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (newTheme: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme_preference') as ThemeMode;
    return saved || 'light';
  });

  // Apply dark mode classes to document element
  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    
    const applyTheme = (mode: 'light' | 'dark') => {
      root.classList.remove('light', 'dark');
      body.classList.remove('light', 'dark');
      root.classList.add(mode);
      body.classList.add(mode);
    };

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(media.matches ? 'dark' : 'light');

      const listener = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    } else {
      applyTheme(theme === 'dark' ? 'dark' : 'light');
    }
  }, [theme]);

  // Sync theme from Supabase user_profiles if logged in on load
  useEffect(() => {
    if (!user || !hasSupabaseKeys) return;

    async function loadUserThemePreference() {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('theme_preference')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && data?.theme_preference) {
          const pref = data.theme_preference as ThemeMode;
          setThemeState(pref);
          localStorage.setItem('theme_preference', pref);
        }
      } catch (err) {
        console.warn('Could not read user theme preference from profiles, using local state.', err);
      }
    }

    loadUserThemePreference();
  }, [user]);

  const setTheme = async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('theme_preference', newTheme);

    if (user && hasSupabaseKeys) {
      try {
        await supabase
          .from('user_profiles')
          .update({ theme_preference: newTheme })
          .eq('id', user.id);
      } catch (err) {
        console.warn('Failed to sync theme preference with backend database', err);
      }
    }
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
