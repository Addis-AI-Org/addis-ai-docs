'use client';

import { lazy, type ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/next';

// Loaded when first needed, as Fumadocs loads its own dialog.
const SearchDialog = lazy(() => import('@/components/search-dialog'));

export function DocsProvider({ children }: { children: ReactNode }) {
  return <RootProvider search={{ SearchDialog }}>{children}</RootProvider>;
}
