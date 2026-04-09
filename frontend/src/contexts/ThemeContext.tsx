import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface ThemePalette {
  id: string;
  name: string;
  description: string;
  /** Swatch hex for UI display (500-level) */
  swatch: string;
  /** Space-separated RGB values for each shade (for Tailwind opacity support) */
  shades: {
    50: string; 100: string; 200: string; 300: string; 400: string;
    500: string; 600: string; 700: string; 800: string; 900: string;
  };
}

export const THEMES: ThemePalette[] = [
  {
    id: 'orange',
    name: 'Amber',
    description: 'Warm & energetic',
    swatch: '#f97316',
    shades: {
      50:  '255 247 237', 100: '255 237 213', 200: '254 215 170',
      300: '253 186 116', 400: '251 146 60',  500: '249 115 22',
      600: '234 88 12',   700: '194 65 12',   800: '154 52 18',
      900: '124 45 18',
    },
  },
  {
    id: 'blue',
    name: 'Clinical Blue',
    description: 'Professional & calm',
    swatch: '#3b82f6',
    shades: {
      50:  '239 246 255', 100: '219 234 254', 200: '191 219 254',
      300: '147 197 253', 400: '96 165 250',  500: '59 130 246',
      600: '37 99 235',   700: '29 78 216',   800: '30 64 175',
      900: '30 58 138',
    },
  },
  {
    id: 'violet',
    name: 'Violet',
    description: 'Modern & distinctive',
    swatch: '#8b5cf6',
    shades: {
      50:  '245 243 255', 100: '237 233 254', 200: '221 214 254',
      300: '196 181 253', 400: '167 139 250', 500: '139 92 246',
      600: '124 58 237',  700: '109 40 217',  800: '91 33 182',
      900: '76 29 149',
    },
  },
  {
    id: 'teal',
    name: 'Teal',
    description: 'Fresh & health-focused',
    swatch: '#14b8a6',
    shades: {
      50:  '240 253 250', 100: '204 251 241', 200: '153 246 228',
      300: '94 234 212',  400: '45 212 191',  500: '20 184 166',
      600: '13 148 136',  700: '15 118 110',  800: '17 94 89',
      900: '19 78 74',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    description: 'Natural & reassuring',
    swatch: '#10b981',
    shades: {
      50:  '236 253 245', 100: '209 250 229', 200: '167 243 208',
      300: '110 231 183', 400: '52 211 153',  500: '16 185 129',
      600: '5 150 105',   700: '4 120 87',    800: '6 95 70',
      900: '6 78 59',
    },
  },
  {
    id: 'indigo',
    name: 'Indigo',
    description: 'Trustworthy & precise',
    swatch: '#6366f1',
    shades: {
      50:  '238 242 255', 100: '224 231 255', 200: '199 210 254',
      300: '165 180 252', 400: '129 140 248', 500: '99 102 241',
      600: '79 70 229',   700: '67 56 202',   800: '55 48 163',
      900: '49 46 129',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    description: 'Bold & compassionate',
    swatch: '#f43f5e',
    shades: {
      50:  '255 241 242', 100: '255 228 230', 200: '254 205 211',
      300: '253 164 175', 400: '251 113 133', 500: '244 63 94',
      600: '225 29 72',   700: '190 18 60',   800: '159 18 57',
      900: '136 19 55',
    },
  },
];

interface ThemeContextValue {
  theme: ThemePalette;
  setTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'cdss_theme';

function applyTheme(palette: ThemePalette) {
  const root = document.documentElement;
  (Object.entries(palette.shades) as [string, string][]).forEach(([shade, rgb]) => {
    root.style.setProperty(`--primary-${shade}`, rgb);
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const stored = localStorage.getItem(STORAGE_KEY);
  const initial = THEMES.find(t => t.id === stored) ?? THEMES[0];
  const [theme, setThemeState] = useState<ThemePalette>(initial);

  // Apply on mount and whenever theme changes
  useEffect(() => { applyTheme(theme); }, [theme]);

  const setTheme = (id: string) => {
    const found = THEMES.find(t => t.id === id);
    if (!found) return;
    localStorage.setItem(STORAGE_KEY, id);
    setThemeState(found);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
