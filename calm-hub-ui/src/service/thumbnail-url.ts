/**
 * Latest-version thumbnail endpoint on the numeric-ID storage API, for the two
 * diagram types calm-hub renders thumbnails for. Cards' `<img>`s fall back to
 * the stripe header when the endpoint 404s (no thumbnail rendered yet).
 */
export function latestThumbnailUrl(
    namespace: string,
    typePath: 'architectures' | 'patterns',
    id: string | number
): string {
    return `/api/calm/namespaces/${encodeURIComponent(namespace)}/${typePath}/${encodeURIComponent(String(id))}/thumbnail`;
}
