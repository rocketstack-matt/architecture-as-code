/** A proxied route of an extension, as `GET /api/calm/extensions` lists it (ADR 0012). */
export interface HubExtensionRoute {
    id: string;
    method: string;
    path: string;
    scope: string;
    readOnly?: boolean;
}

export interface HubExtensionCommand {
    route: string;
    description?: string;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    destructive?: boolean;
    idempotent?: boolean;
}

/** An enabled extension. Hub leaves out the routes and commands that it cannot run. */
export interface HubExtension {
    id: string;
    version?: string;
    hubApi: number;
    name?: string;
    description?: string;
    provider?: string;
    routes?: HubExtensionRoute[];
    commands?: Record<string, HubExtensionCommand>;
    contributes?: Record<string, unknown>;
}

export interface HubExtensionRequest {
    method: string;
    /** Relative to the CALM Hub base URL, with the path parameters filled and encoded. */
    path: string;
    query: [string, string][];
    body?: Record<string, unknown>;
}

const PATH_PARAM = /\{([^}]+)\}/g;

export function extensionProxyPath(extensionId: string, routePath: string): string {
    return `/api/calm/extensions/${encodeURIComponent(extensionId)}/api${routePath}`;
}

/**
 * Maps a command input to a request on the route (ADR 0012). Input properties that match a
 * `{param}` fill the path. The rest go to the query for GET and DELETE, and to the JSON body otherwise.
 * The extension validates the input (the REST proxy does not), so this checks only what it needs to build the request.
 * @throws Error when a path parameter is missing, is not a string, number or boolean, is a dot segment or has a slash.
 */
export function buildExtensionRequest(extensionId: string, route: HubExtensionRoute, input: Record<string, unknown>): HubExtensionRequest {
    const rest: Record<string, unknown> = { ...input };
    const path = route.path.replace(PATH_PARAM, (_match, name: string) => {
        const value = input[name];
        if (!isScalar(value)) {
            throw new Error(`Input property '${name}' must be a string, number or boolean, because it fills the path ${route.path}`);
        }
        // A URL client collapses dot segments, which would move the call out of the route.
        if (value === '.' || value === '..') {
            throw new Error(`Input property '${name}' must not be . or .., because it fills the path ${route.path}`);
        }
        // Hub refuses %2F in a path (ADR 0011).
        if (String(value).includes('/')) {
            throw new Error(`Input property '${name}' must not contain /, because it fills the path ${route.path}`);
        }
        delete rest[name];
        return encodeURIComponent(String(value));
    });
    const method = route.method.toUpperCase();
    const request: HubExtensionRequest = { method, path: extensionProxyPath(extensionId, path), query: [] };
    if (method === 'GET' || method === 'DELETE') {
        request.query = Object.entries(rest).flatMap(([key, value]) => toQueryValues(value).map((v): [string, string] => [key, v]));
    } else {
        request.body = rest;
    }
    return request;
}

function isScalar(value: unknown): value is string | number | boolean {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

// An array repeats the key; an object or null is sent as JSON.
function toQueryValues(value: unknown): string[] {
    if (value === undefined) return [];
    if (Array.isArray(value)) return value.flatMap(toQueryValues);
    return [isScalar(value) ? String(value) : JSON.stringify(value)];
}
