import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../lib/api';

interface LogoContextValue {
  logoUrl: string | null;
  refreshLogo: () => void;
}

const LogoContext = createContext<LogoContextValue | undefined>(undefined);

const DEFAULT_LOGO = '/logo.svg';

export function LogoProvider({ children }: { children: ReactNode }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const fetchLogo = useCallback(() => {
    api.get<{ logoUrl: string | null }>('/admin/logo')
      .then(res => setLogoUrl(res.data.logoUrl ?? null))
      .catch(() => setLogoUrl(null));
  }, []);

  useEffect(() => { fetchLogo(); }, [fetchLogo]);

  return (
    <LogoContext.Provider value={{ logoUrl, refreshLogo: fetchLogo }}>
      {children}
    </LogoContext.Provider>
  );
}

export function useLogo() {
  const ctx = useContext(LogoContext);
  if (!ctx) throw new Error('useLogo must be used within LogoProvider');
  return ctx;
}

/** Returns the effective logo src — custom upload or fallback to default */
export function useLogoSrc(): string {
  const { logoUrl } = useLogo();
  return logoUrl ? logoUrl : DEFAULT_LOGO;
}
