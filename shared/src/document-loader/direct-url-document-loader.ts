import axios, { Axios } from 'axios';
import { isIPv4 } from 'net';
import { SchemaDirectory } from '../schema-directory';
import { CalmDocumentType, DocumentLoader } from './document-loader';
import { DocumentLoadError } from './document-loader';
import { Logger, initLogger } from '../logger';

export class DirectUrlDocumentLoader implements DocumentLoader {
    private readonly ax: Axios;
    private logger: Logger;

    constructor(debug: boolean, axiosInstance?: Axios) {
        if (axiosInstance) {
            this.ax = axiosInstance;
        } else {
            this.ax = axios.create({
                timeout: 10000,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        this.logger = initLogger(debug, 'direct-url-document-loader');
        if (debug) {
            this.addAxiosDebug();
        }
    }

    addAxiosDebug() {
        this.ax.interceptors.request.use(request => {
            console.log('Starting Request', JSON.stringify(request, null, 2));
            return request;
        });

        this.ax.interceptors.response.use(response => {
            console.log('Response:', response);
            return response;
        });
    }

    async initialise(_: SchemaDirectory): Promise<void> {
        // No-op, similar to CalmHubDocumentLoader
        return;
    }

    async loadMissingDocument(documentId: string, _type: CalmDocumentType): Promise<object> {
        try {
            const parsedUrl = new URL(documentId);
            if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
                throw new DocumentLoadError({
                    name: 'UNKNOWN',
                    message: `Unsupported URL protocol '${parsedUrl.protocol}' in document URL. Only HTTP and HTTPS are allowed.`,
                });
            }
            if (isPrivateHost(parsedUrl.hostname)) {
                throw new DocumentLoadError({
                    name: 'UNKNOWN',
                    message: 'Requests to private or internal network addresses are not allowed.',
                });
            }
            // Reconstruct a safe URL from validated components. Disable redirects to prevent
            // SSRF via 3xx responses that redirect to internal/private addresses.
            const safeUrl = parsedUrl.protocol + '//' + parsedUrl.host + parsedUrl.pathname + parsedUrl.search;
            const response = await this.ax.get(safeUrl, { maxRedirects: 0 });
            return response.data;
        } catch (error) {
            if (error instanceof DocumentLoadError) {
                throw error;
            }
            throw new DocumentLoadError({
                name: 'UNKNOWN',
                message: `Failed to load document from URL: ${documentId}`,
                cause: error instanceof Error ? error : undefined
            });
        }
    }

    /**
     * Only local files via a mapping file are currently supported.
     */
    resolvePath(_reference: string): string | undefined {
        return undefined;
    }
}

/**
 * Returns true if the given hostname resolves to a private, loopback, link-local,
 * or otherwise non-public network address.
 *
 * NOTE: This is a string-based check on the literal hostname value. It does NOT
 * protect against DNS rebinding attacks, where a public-looking hostname later
 * resolves to a private IP address. For stronger protection, consider resolving
 * the hostname to IP addresses and validating each resolved address.
 */
function isPrivateHost(hostname: string): boolean {
    // URL.hostname includes brackets for IPv6 literals (e.g. "[::1]"); strip them for matching.
    // Also strip a trailing dot (e.g. "localhost.") and normalise to lowercase.
    const normalized = hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();

    if (normalized === 'localhost') return true;

    // IPv4 private/reserved ranges
    if (isIPv4(normalized)) {
        const parts = normalized.split('.').map(Number);
        return (
            parts[0] === 127 ||                                           // 127.0.0.0/8  loopback
            parts[0] === 10 ||                                            // 10.0.0.0/8   private
            (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||    // 172.16.0.0/12 private
            (parts[0] === 192 && parts[1] === 168) ||                     // 192.168.0.0/16 private
            (parts[0] === 169 && parts[1] === 254) ||                     // 169.254.0.0/16 link-local
            parts[0] === 0                                                 // 0.0.0.0/8  "this network"
        );
    }

    // IPv6 addresses (URL.hostname has already normalised these to compressed hex form)
    if (normalized.includes(':')) {
        const canonical = canonicalizeIPv6(normalized);
        if (!canonical) return false;

        const words = canonical.split(':');

        // ::1 loopback and :: unspecified address
        if (canonical === '0000:0000:0000:0000:0000:0000:0000:0001') return true;
        if (canonical === '0000:0000:0000:0000:0000:0000:0000:0000') return true;

        // Detect IPv4 addresses embedded in IPv6:
        //   IPv4-mapped      ::ffff:x.x.x.x   → words[5]='ffff', words[0..4]='0000'
        //   IPv4-compatible  ::x.x.x.x         → words[0..5]='0000'
        //   IPv4-translated  ::ffff:0:x.x.x.x  → words[4]='ffff', words[5]='0000', words[0..3]='0000'
        // The URL constructor converts dotted-decimal embedded IPv4 to hex groups, so all three
        // forms arrive here as pure hex (e.g. ::ffff:127.0.0.1 → ::ffff:7f00:1).
        const isV4Mapped = words[5] === 'ffff' && words.slice(0, 5).every(w => w === '0000');
        const isV4Compatible = words.slice(0, 6).every(w => w === '0000');
        const isV4Translated = words[4] === 'ffff' && words[5] === '0000' && words.slice(0, 4).every(w => w === '0000');
        if (isV4Mapped || isV4Compatible || isV4Translated) {
            const hi = parseInt(words[6], 16);
            const lo = parseInt(words[7], 16);
            const ipv4 = `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
            return isPrivateHost(ipv4);
        }

        const firstWord = parseInt(words[0], 16);
        // fe80::/10 link-local (fe80 through febf)
        if (firstWord >= 0xfe80 && firstWord <= 0xfebf) return true;
        // fc00::/7  unique local (fc00 through fdff)
        if (firstWord >= 0xfc00 && firstWord <= 0xfdff) return true;

        return false;
    }

    return false;
}

/**
 * Expands a (possibly compressed) IPv6 address string into its full
 * 8-group colon-separated hex representation, e.g. "::1" → "0000:…:0001".
 * Returns null if the input is not a valid IPv6 address.
 */
function canonicalizeIPv6(addr: string): string | null {
    // Strip zone ID (e.g. "fe80::1%eth0")
    const zoneIdx = addr.indexOf('%');
    const clean = zoneIdx >= 0 ? addr.substring(0, zoneIdx) : addr;

    const parts = clean.split('::');
    if (parts.length > 2) return null;

    let groups: string[];
    if (parts.length === 2) {
        const left = parts[0] ? parts[0].split(':') : [];
        const right = parts[1] ? parts[1].split(':') : [];
        const missing = 8 - left.length - right.length;
        if (missing < 0) return null;
        groups = [...left, ...Array(missing).fill('0'), ...right];
    } else {
        groups = clean.split(':');
    }

    if (groups.length !== 8) return null;
    if (!groups.every(g => /^[0-9a-f]{1,4}$/i.test(g))) return null;
    return groups.map(g => g.padStart(4, '0')).join(':');
}
