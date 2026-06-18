'use client';

import { I18nProvider } from '@/lib/i18n/context';
import { AuthProvider } from '@/lib/auth-context';
import { RegionProvider } from '@/lib/region-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <RegionProvider><AuthProvider>{children}</AuthProvider></RegionProvider>
    </I18nProvider>
  );
}
