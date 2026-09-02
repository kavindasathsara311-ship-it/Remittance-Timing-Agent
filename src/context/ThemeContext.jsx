import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/* =============================================================================
 * ThemeContext — drives light/dark mode by toggling a class on <html>.
 * The initial theme is applied by an inline script in index.html (before paint)
 * to avoid a flash; this provider then keeps React state and localStorage in
 * sync, and follows the OS preference on first visit.
 * ===========================================================================*/

const STORAGE_KEY = 'rc-theme';

const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

function readInitialTheme() {
  if (typeof document !== 'undefined') {
    const cls = document.documentElement.classList;
    if (cls.contains('dark')) return 'dark';
    if (cls.contains('light')) return 'light';
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readInitialTheme);

  // Reflect state onto <html> and persist.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.style.colorScheme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(next === 'dark' ? 'dark' : 'light');
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(
    () => ({ theme, isDark: theme === 'dark', setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeContext;
