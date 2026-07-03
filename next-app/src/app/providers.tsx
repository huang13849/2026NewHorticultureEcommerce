'use client';

import { I18nProvider, type Lang } from '@/lib/i18n/context';
import { AuthProvider } from '@/lib/auth-context';
import { RegionProvider, type RegionCode } from '@/lib/region-context';

interface ProvidersProps {
  children: React.ReactNode;
  initialLang?: Lang;
  initialRegion?: RegionCode;
}

export function Providers({ children, initialLang, initialRegion }: ProvidersProps) {
  return (
    <I18nProvider initialLang={initialLang}>
      <RegionProvider initialCode={initialRegion}><AuthProvider>{children}</AuthProvider></RegionProvider>
    </I18nProvider>
  );
}
