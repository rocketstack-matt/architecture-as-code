import { getSearchGroupIcon } from '../theme/resource-type-meta.js';

interface SearchGroupIconProps {
    /** The search group key, e.g. `flows` (a `GroupedSearchResults` key). */
    type: string;
}

/**
 * Registry type glyph for a search group header. The visual types
 * (architectures / patterns) have no registry icon and render nothing, keeping
 * their headers label-only. Inherits the header's muted text colour via
 * currentColor.
 */
export function SearchGroupIcon({ type }: SearchGroupIconProps) {
    const GroupIcon = getSearchGroupIcon(type);
    if (!GroupIcon) return null;
    return <GroupIcon size={12} className="shrink-0" data-testid={`search-group-icon-${type}`} />;
}
