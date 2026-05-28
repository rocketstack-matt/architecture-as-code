import type {
    CalmDataSource,
    CalmDataSourceCapabilities,
    CalmNavigator,
    DocRef,
    AdrEnvelope,
    DecoratorRecord,
    CalmTimelineLike,
} from '@finos/calm-ui-react/adapters'
import type { CalmArchitectureSchema } from '@finos/calm-models/types'

/**
 * Shape of the VSCode webview postMessage API exposed via acquireVsCodeApi().
 * Defined locally so the adapter doesn't depend on @types/vscode at the
 * webview boundary.
 */
export interface VsCodeWebviewApi {
    postMessage(message: unknown): void
}

/**
 * Generic request/response wire shape. Every outbound request carries a
 * uuid-ish requestId so concurrent calls can be matched to their replies.
 * The host echoes the requestId back on the response envelope.
 */
interface OutgoingRequest {
    type: string
    requestId: string
    payload?: unknown
}

interface IncomingResponse {
    type: 'response'
    requestId: string
    ok: boolean
    data?: unknown
    error?: string
}

interface IncomingPush {
    type: 'push'
    name: string
    payload?: unknown
}

type Incoming = IncomingResponse | IncomingPush | { type: string }

const REQUEST_TIMEOUT_MS = 30_000

function isResponse(msg: Incoming): msg is IncomingResponse {
    return msg.type === 'response'
}

function isPush(msg: Incoming): msg is IncomingPush {
    return msg.type === 'push'
}

/**
 * postMessage-backed CalmDataSource: every adapter method dispatches a
 * request envelope to the extension host and resolves when the host echoes
 * a response with the matching requestId. Pushes from the host (select
 * events, refreshes) are forwarded to listeners registered via
 * `onPush(name, handler)`.
 */
export class VsCodeDataSource implements CalmDataSource {
    private nextId = 0
    private pending = new Map<
        string,
        { resolve: (data: unknown) => void; reject: (err: Error) => void; timeout: ReturnType<typeof setTimeout> }
    >()
    private pushHandlers = new Map<string, Set<(payload: unknown) => void>>()

    readonly capabilities: CalmDataSourceCapabilities = {
        dropzone: false,
        httpDecorators: false,
        multiVersion: false,
    }

    constructor(private api: VsCodeWebviewApi) {
        window.addEventListener('message', (event) => this.onMessage(event.data as Incoming))
    }

    onPush(name: string, handler: (payload: unknown) => void): () => void {
        let set = this.pushHandlers.get(name)
        if (!set) {
            set = new Set()
            this.pushHandlers.set(name, set)
        }
        set.add(handler)
        return () => set?.delete(handler)
    }

    async loadArchitecture(ref: DocRef): Promise<CalmArchitectureSchema> {
        return (await this.request('requestArchitecture', { docRef: ref })) as CalmArchitectureSchema
    }

    async loadPattern(ref: DocRef): Promise<Record<string, unknown>> {
        return (await this.request('requestPattern', { docRef: ref })) as Record<string, unknown>
    }

    async loadAdr(ref: DocRef | string): Promise<AdrEnvelope> {
        return (await this.request('requestAdr', { docRef: ref })) as AdrEnvelope
    }

    async loadDecorators(
        namespace: string,
        target: string,
        kind: 'deployment'
    ): Promise<DecoratorRecord[]> {
        return (await this.request('requestDecorators', { namespace, target, kind })) as DecoratorRecord[]
    }

    async loadTimeline(ref: DocRef): Promise<CalmTimelineLike | undefined> {
        return (await this.request('requestTimeline', { docRef: ref })) as CalmTimelineLike | undefined
    }

    async loadVersionList(ref: DocRef): Promise<string[]> {
        return (await this.request('requestVersionList', { docRef: ref })) as string[]
    }

    private request(type: string, payload?: unknown): Promise<unknown> {
        const requestId = String(++this.nextId)
        const envelope: OutgoingRequest = { type, requestId, payload }
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pending.delete(requestId)
                reject(new Error(`Timed out waiting for ${type} (${REQUEST_TIMEOUT_MS}ms)`))
            }, REQUEST_TIMEOUT_MS)
            this.pending.set(requestId, { resolve, reject, timeout })
            this.api.postMessage(envelope)
        })
    }

    private onMessage(msg: Incoming) {
        if (isResponse(msg)) {
            const entry = this.pending.get(msg.requestId)
            if (!entry) return
            this.pending.delete(msg.requestId)
            clearTimeout(entry.timeout)
            if (msg.ok) entry.resolve(msg.data)
            else entry.reject(new Error(msg.error ?? 'Request failed'))
            return
        }
        if (isPush(msg)) {
            const handlers = this.pushHandlers.get(msg.name)
            if (handlers) for (const h of handlers) h(msg.payload)
        }
    }
}

/**
 * Navigation surface routed back to the extension host. The host owns the
 * tree-view selection state and the editor reveal API.
 */
export class VsCodeNavigator implements CalmNavigator {
    constructor(private api: VsCodeWebviewApi) {}

    reveal(id: string): void {
        this.api.postMessage({ type: 'requestReveal', payload: { id } })
    }

    navigate(ref: DocRef): void {
        this.api.postMessage({ type: 'requestNavigate', payload: { docRef: ref } })
    }
}
