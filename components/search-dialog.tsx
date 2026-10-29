'use client';

import { useEffect, useMemo } from 'react';
import { useDocsSearch } from 'fumadocs-core/search/client';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SearchItemType,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import type { SearchLink } from 'fumadocs-ui/contexts/search';
import { trackDocs } from '@/lib/analytics';

/**
 * How long results must stand before the search counts, so typing
 * "speech" is one search rather than six.
 */
const SEARCH_SETTLE_MS = 1000;

/**
 * Fumadocs' default search dialog (fumadocs-ui/components/dialog/search-default),
 * built from the same parts, that also reports how many results a search
 * found. Never the query text.
 */
export default function DocsSearchDialog({ links = [], ...props }: SharedProps & { links?: SearchLink[] }) {
  const { locale } = useI18n();
  const { search, setSearch, query } = useDocsSearch({ type: 'fetch', locale });
  const defaultItems = useMemo<SearchItemType[] | null>(
    () =>
      links.length === 0
        ? null
        : links.map(([name, url]) => ({ type: 'page', id: name, content: name, url })),
    [links],
  );

  const results = query.data;
  useEffect(() => {
    if (!Array.isArray(results)) return;
    const timer = setTimeout(() => {
      trackDocs('docs_search_performed', {
        result_count: results.length,
        has_results: results.length > 0,
      });
    }, SEARCH_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [results]);

  return (
    <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={results !== 'empty' ? results : defaultItems} />
      </SearchDialogContent>
    </SearchDialog>
  );
}
