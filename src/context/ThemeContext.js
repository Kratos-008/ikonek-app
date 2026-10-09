import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const scheme = useColorScheme();
  console.log('iKonek detected theme:', scheme);
  const isDarkMode = scheme === 'dark';

  const colors = isDarkMode
    ? {
        bg: '#0F172A',
        card: '#1E293B',
        text: '#FFFFFF',
        muted: '#94A3B8',
        border: '#334155',
        buttonText: '#FFFFFF',
        primary: '#3B82F6',
      }
    : {
        bg: '#F1F5F9',
        card: '#FFFFFF',
        text: '#0F172A',
        muted: '#64748B',
        border: '#CBD5E1',
        buttonText: '#FFFFFF',
        primary: '#2563EB',
      };

  return (
    <ThemeContext.Provider value={{ isDarkMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}