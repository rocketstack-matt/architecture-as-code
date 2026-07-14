import { initLogger, launchBrowser } from '@finos/calm-shared';
import type { Logger } from '@finos/calm-shared';
import express, { Router, Request, Response } from 'express';
import type { Browser } from 'playwright-core';

const DEFAULT_TIMEOUT_MS = 20000;
const MAX_TIMEOUT_MS = 60000;

/**
 * CALM documents routinely exceed express.json's 100kb default, so the render
 * router parses its own bodies with a higher limit (the app-level parser skips
 * this route — see server.ts).
 */
const RENDER_BODY_LIMIT = '10mb';

/**
 * Render stage for the fitView pass, shaped near the browse card's header (~2:1) so
 * the `object-cover` crop discards little of the diagram. The screenshot is clipped
 * to the graph's real content bounds (see {@link computeDiagramClip}), so the stage
 * sets zoom/detail while the clip removes empty margins — the stage size caps
 * detail, not framing. deviceScaleFactor 2 keeps the (upscaled-on-card) thumbnail
 * crisp on high-DPI displays; the content clip keeps the payload far below a
 * full-stage 2x screenshot.
 */
const THUMBNAIL_VIEWPORT = { width: 1000, height: 450 };
const THUMBNAIL_DEVICE_SCALE_FACTOR = 2;

/** Selector the Hub UI's render route sets once the diagram has painted. */
const RENDER_READY_SELECTOR = '[data-render-ready="true"]';
/** Element the Hub UI's render route wraps the diagram in; this is what gets screenshotted. */
const RENDER_CONTAINER_SELECTOR = '[data-render-container]';

const DOCUMENT_TYPES = ['architecture', 'pattern'] as const;
type RenderDocumentType = (typeof DOCUMENT_TYPES)[number];

interface RenderThumbnailRequest {
    /** Base URL of a running CALM Hub UI, e.g. http://localhost:8080. */
    uiBaseUrl: string;
    documentType: RenderDocumentType;
    /** The raw CALM JSON document, as a string. */
    documentJson: string;
    /** Optional render timeout in ms (default 20000, capped at 60000). */
    timeoutMs?: number;
}

function isHttpUrl(value: unknown): value is string {
    return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function isDocumentType(value: unknown): value is RenderDocumentType {
    return typeof value === 'string' && (DOCUMENT_TYPES as readonly string[]).includes(value);
}

function clampTimeout(timeoutMs: unknown): number {
    if (typeof timeoutMs !== 'number' || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
        return DEFAULT_TIMEOUT_MS;
    }
    return Math.min(timeoutMs, MAX_TIMEOUT_MS);
}

/**
 * Runs inside the page: the union bounding box of every rendered node and edge,
 * padded, widened to a minimum aspect ratio and clamped to the viewport, in page
 * coordinates (the render route fills the viewport from the origin, so client rects
 * are page coordinates). Returns null when nothing rendered (e.g. an empty document)
 * — the caller then screenshots the whole render container instead.
 *
 * The aspect bound exists for extreme diagram shapes: a two-node architecture clips
 * to a very wide thin strip, and the browse card's `object-cover` would crop away
 * both nodes leaving only the middle of the edge. Expanding the box toward the
 * card header's minimum aspect (~1.75:1) adds empty canvas margin instead, so the
 * cover crop trims margin — never the diagram.
 *
 * Exported for unit tests only. Runtime-safe to export: the function is fully
 * self-contained (no captured bindings), which `page.evaluate` requires anyway
 * to serialize it into the page.
 */
export function computeDiagramClip(): { x: number; y: number; width: number; height: number } | null {
    const PAD = 16;
    // Browse-card headers are at least ~1.75x wider than tall (280px min column /
    // 160px header). Keeping the clip at or below that aspect means object-cover
    // scales by width and crops only vertical margin.
    const TARGET_ASPECT = 1.75;
    const elements = [
        ...document.querySelectorAll('.react-flow__node'),
        ...document.querySelectorAll('.react-flow__edge'),
    ];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const element of elements) {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        minX = Math.min(minX, rect.left);
        minY = Math.min(minY, rect.top);
        maxX = Math.max(maxX, rect.right);
        maxY = Math.max(maxY, rect.bottom);
    }
    if (!Number.isFinite(minX)) return null;
    let x = minX - PAD;
    let y = minY - PAD;
    let width = maxX - minX + PAD * 2;
    let height = maxY - minY + PAD * 2;
    // Expand the tighter dimension toward the target aspect, centred on the content.
    if (width / height > TARGET_ASPECT) {
        const grow = width / TARGET_ASPECT - height;
        y -= grow / 2;
        height += grow;
    } else {
        const grow = height * TARGET_ASPECT - width;
        x -= grow / 2;
        width += grow;
    }
    const clampedX = Math.max(0, x);
    const clampedY = Math.max(0, y);
    const clampedWidth = Math.min(window.innerWidth, x + width) - clampedX;
    const clampedHeight = Math.min(window.innerHeight, y + height) - clampedY;
    if (clampedWidth <= 0 || clampedHeight <= 0) return null;
    return { x: clampedX, y: clampedY, width: clampedWidth, height: clampedHeight };
}

/**
 * Renders PNG thumbnails of CALM architecture/pattern documents by driving the
 * CALM Hub UI's chrome-free `/#/render` route in a headless local browser, so a
 * thumbnail is pixel-identical to the diagram users see in the Hub UI.
 *
 * INTERNAL endpoint: calm-server has no authentication and this route launches a
 * local browser per request — it is intended to be called by a trusted CALM Hub
 * backend on a private network (calm-server binds 127.0.0.1 by default).
 */
export class RenderRouter {
    private logger: Logger;

    constructor(router: Router, debug: boolean = false) {
        this.logger = initLogger(debug, 'calm-server');
        router.use(express.json({ limit: RENDER_BODY_LIMIT }));
        router.post('/thumbnail', this.renderThumbnail);
    }

    private renderThumbnail = async (
        req: Request<Record<string, never>, Buffer | ErrorResponse, Partial<RenderThumbnailRequest>>,
        res: Response<Buffer | ErrorResponse>
    ) => {
        const { uiBaseUrl, documentType, documentJson } = req.body;

        // Normalize once and validate the EXACT expression that reaches page.goto —
        // validating a different (re-derived) expression than the sink's has
        // previously triggered CodeQL js/request-forgery findings in this repo.
        const base = typeof uiBaseUrl === 'string' ? uiBaseUrl.trim().replace(/\/$/, '') : undefined;
        if (!isHttpUrl(base)) {
            return res.status(400).type('json').send(new ErrorResponse('The "uiBaseUrl" field is missing or is not an http(s) URL'));
        }
        if (!isDocumentType(documentType)) {
            return res.status(400).type('json').send(new ErrorResponse('The "documentType" field must be "architecture" or "pattern"'));
        }
        if (typeof documentJson !== 'string' || documentJson.trim() === '') {
            return res.status(400).type('json').send(new ErrorResponse('The "documentJson" field is missing or is not a string'));
        }

        let document: unknown;
        try {
            document = JSON.parse(documentJson);
        } catch (error) {
            this.logger.error('Invalid JSON format for documentJson ' + error);
            return res.status(400).type('json').send(new ErrorResponse('Invalid JSON format for documentJson'));
        }

        const timeoutMs = clampTimeout(req.body.timeoutMs);

        // Launched per request, disposed in finally — no pooling.
        let browser: Browser | undefined;
        try {
            ({ browser } = await launchBrowser());
            const context = await browser.newContext({
                viewport: THUMBNAIL_VIEWPORT,
                deviceScaleFactor: THUMBNAIL_DEVICE_SCALE_FACTOR,
            });
            const page = await context.newPage();
            // Injected before any page script runs, so the UI's render route sees
            // the document on first mount (see RenderView in calm-hub-ui).
            await page.addInitScript(
                (data) => {
                    (window as unknown as Record<string, unknown>)['__CALM_RENDER_DATA'] = data;
                },
                { documentType, document }
            );
            // Navigation bounded by the request timeout, not Playwright's 30s default.
            await page.goto(`${base}/#/render`, { timeout: timeoutMs });
            await page.waitForSelector(RENDER_READY_SELECTOR, { timeout: timeoutMs });
            // Clip to the diagram's real content bounds rather than the fixed viewport:
            // fitView centres the graph in the strip, so a graph narrower than the frame
            // would otherwise ship (and later display) large empty margins. The clip is
            // expanded toward the card header's aspect, so the card's `object-cover`
            // crop trims only empty margin — never the diagram itself.
            const clip = await page.evaluate(computeDiagramClip);
            const png = clip
                ? await page.screenshot({ type: 'png', clip })
                : await page.locator(RENDER_CONTAINER_SELECTOR).screenshot({ type: 'png' });
            return res.status(200).type('image/png').send(png);
        } catch (error) {
            this.logger.error('Failed to render thumbnail: ' + error);
            return res.status(500).type('json').send(new ErrorResponse('Failed to render thumbnail: ' + (error as Error).message));
        } finally {
            if (browser) {
                try {
                    await browser.close();
                } catch (error) {
                    this.logger.debug('Error closing thumbnail render browser: ' + error);
                }
            }
        }
    };
}

class ErrorResponse {
    error: string;
    constructor(error: string) {
        this.error = error;
    }
}
