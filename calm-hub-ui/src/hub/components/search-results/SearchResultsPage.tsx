import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchService } from '../../../service/search-service.js';
import { GroupedSearchResults, SearchResult } from '../../../model/search.js';
import { TYPE_LABELS, flattenResults, useSearchNavigation } from '../../../hooks/useSearchNavigation.js';
import { getSearchGroupIcon, getSearchGroupType } from '../../../theme/resource-type-meta.js';
import { ItemCard } from '../namespace-page/ItemCard.js';
import { colors } from '../../../theme/colors.js';

interface SearchResultsPageProps {
    /** Injected for tests. */
    searchService?: SearchService;
}

/**
 * Full-page catalogue search results at `/search?q=…`, inside Hub's normal chrome.
 * Selecting a result deep-links via the shared {@link useSearchNavigation}.
 */
export function SearchResultsPage({ searchService }: SearchResultsPageProps) {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q')?.trim() ?? '';

    const [results, setResults] = useState<GroupedSearchResults | null>(null);
    // Init true when a query is already present, so the first paint shows "Searching…"
    // rather than flashing "No results found" before the fetch effect runs.
    const [loading, setLoading] = useState(() => query !== '');
    const [error, setError] = useState(false);

    const service = useMemo(() => searchService ?? new SearchService(), [searchService]);
    const { navigateToResult } = useSearchNavigation();
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!query) {
            setResults(null);
            setError(false);
            setLoading(false);
            return;
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoading(true);
        setError(false);
        service
            .search(query)
            .then((data) => {
                if (controller.signal.aborted) return;
                setResults(data);
            })
            .catch(() => {
                if (controller.signal.aborted) return;
                setResults(null);
                setError(true);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [query, service]);

    // Groups the registry doesn't know are dropped rather than rendered with a
    // guessed card type; the model's GroupedSearchResults keys make this a no-op
    // until the backend grows a new group.
    const groups = results
        ? Object.entries(results).filter(
              ([type, items]) => (items as SearchResult[]).length > 0 && getSearchGroupType(type) !== undefined
          )
        : [];
    const totalCount = results ? flattenResults(results).length : 0;

    // Registry type glyph for a group header; the visual types (architectures /
    // patterns) have none and their headers stay label-only. Inherits the
    // header's muted text colour via currentColor.
    const renderGroupIcon = (type: string) => {
        const GroupIcon = getSearchGroupIcon(type);
        if (!GroupIcon) return null;
        return <GroupIcon size={12} className="shrink-0" data-testid={`search-group-icon-${type}`} />;
    };

    return (
        <div className="h-full overflow-auto bg-base-100" style={{ padding: '44px 48px' }}>
            <div className="max-w-[1240px] mx-auto flex flex-col gap-8">
                <header>
                    <h1 className="text-[28px] font-bold" style={{ color: colors.redesign.ink }}>
                        {query ? (
                            <>
                                Results for <span style={{ color: colors.redesign.primaryText }}>“{query}”</span>
                            </>
                        ) : (
                            'Search'
                        )}
                    </h1>
                    {query && !loading && !error && (
                        <p className="text-[14px] mt-2" style={{ color: colors.redesign.muted }}>
                            {totalCount} {totalCount === 1 ? 'result' : 'results'}
                        </p>
                    )}
                </header>

                {!query && (
                    <p className="text-sm" style={{ color: colors.redesign.muted }}>
                        Enter a search term to explore the catalogue.
                    </p>
                )}

                {query && loading && (
                    <div className="flex items-center gap-2 py-4">
                        <span className="loading loading-spinner loading-sm text-base-content/40" />
                        <span className="text-sm" style={{ color: colors.redesign.muted }}>
                            Searching…
                        </span>
                    </div>
                )}

                {query && !loading && error && (
                    <div className="text-sm text-error">Search failed, please try again.</div>
                )}

                {query && !loading && !error && results !== null && groups.length === 0 && (
                    <div className="text-sm" style={{ color: colors.redesign.muted }}>
                        No results found for “{query}”.
                    </div>
                )}

                {query && !loading && !error && groups.length > 0 && (
                    <div className="flex flex-col gap-8">
                        {groups.map(([type, items]) => (
                            <section key={type}>
                                <div
                                    className="flex items-center gap-1.5 font-mono-jb text-[11px] uppercase tracking-[0.1em] mb-3"
                                    style={{ color: colors.redesign.faintAlt }}
                                >
                                    {renderGroupIcon(type)}
                                    {TYPE_LABELS[type] ?? type} ({(items as SearchResult[]).length})
                                </div>
                                <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
                                    {(items as SearchResult[]).map((item) => (
                                        <ItemCard
                                            key={`${type}-${item.namespace}-${item.id}`}
                                            name={item.name}
                                            description={item.description}
                                            type={getSearchGroupType(type)!}
                                            meta={item.namespace}
                                            thumbnailUrl={
                                                type === 'architectures' || type === 'patterns'
                                                    ? `/api/calm/namespaces/${encodeURIComponent(item.namespace)}/${type}/${encodeURIComponent(String(item.id))}/thumbnail`
                                                    : undefined
                                            }
                                            onActivate={() => navigateToResult({ type, result: item })}
                                        />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
