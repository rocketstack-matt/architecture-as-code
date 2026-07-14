import request from 'supertest';
import express, { Application } from 'express';
import { vi, Mock } from 'vitest';
import { RenderRouter, computeDiagramClip } from './render-route';
import { launchBrowser } from '@finos/calm-shared';

vi.mock('@finos/calm-shared', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@finos/calm-shared')>();
    return {
        ...actual,
        launchBrowser: vi.fn(),
    };
});

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

interface FakeBrowser {
    browser: {
        newContext: Mock;
        close: Mock;
    };
    page: {
        addInitScript: Mock;
        goto: Mock;
        waitForSelector: Mock;
        evaluate: Mock;
        screenshot: Mock;
        locator: Mock;
    };
    screenshot: Mock;
}

function fakeBrowser(): FakeBrowser {
    const screenshot = vi.fn().mockResolvedValue(PNG_BYTES);
    const page = {
        addInitScript: vi.fn().mockResolvedValue(undefined),
        goto: vi.fn().mockResolvedValue(undefined),
        waitForSelector: vi.fn().mockResolvedValue(undefined),
        // computeDiagramClip result: a content bounding box by default; tests that
        // exercise the no-content fallback override this to resolve null.
        evaluate: vi.fn().mockResolvedValue({ x: 10, y: 20, width: 300, height: 150 }),
        screenshot,
        locator: vi.fn().mockReturnValue({ screenshot }),
    };
    const browser = {
        newContext: vi.fn().mockResolvedValue({ newPage: vi.fn().mockResolvedValue(page) }),
        close: vi.fn().mockResolvedValue(undefined),
    };
    return { browser, page, screenshot };
}

const VALID_BODY = {
    uiBaseUrl: 'http://localhost:8080',
    documentType: 'architecture',
    documentJson: JSON.stringify({ nodes: [], relationships: [] }),
};

describe('RenderRouter', () => {
    let app: Application;

    beforeEach(() => {
        vi.clearAllMocks();
        app = express();
        // No app-level express.json(): the RenderRouter mounts its own higher-limit
        // parser (and server.ts skips the app-level parser for this route).
        const router: express.Router = express.Router();
        app.use('/calm/render', router);
        new RenderRouter(router);
    });

    test('should return 400 when uiBaseUrl is missing', async () => {
        const response = await request(app)
            .post('/calm/render/thumbnail')
            .send({ ...VALID_BODY, uiBaseUrl: undefined });
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('uiBaseUrl');
    });

    test('should return 400 when uiBaseUrl is not an http(s) URL', async () => {
        const response = await request(app)
            .post('/calm/render/thumbnail')
            .send({ ...VALID_BODY, uiBaseUrl: 'file:///etc/passwd' });
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('uiBaseUrl');
    });

    test('should return 400 when documentType is invalid', async () => {
        const response = await request(app)
            .post('/calm/render/thumbnail')
            .send({ ...VALID_BODY, documentType: 'flow' });
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('documentType');
    });

    test('should return 400 when documentJson is missing', async () => {
        const response = await request(app)
            .post('/calm/render/thumbnail')
            .send({ ...VALID_BODY, documentJson: undefined });
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('documentJson');
    });

    test('should return 400 when documentJson is not valid JSON', async () => {
        const response = await request(app)
            .post('/calm/render/thumbnail')
            .send({ ...VALID_BODY, documentJson: '{not json' });
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid JSON format');
    });

    test('should return PNG bytes rendered from the UI render route', async () => {
        const fake = fakeBrowser();
        (launchBrowser as Mock).mockResolvedValue({ browser: fake.browser, displayName: 'Fake Chrome' });

        const response = await request(app).post('/calm/render/thumbnail').send(VALID_BODY);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('image/png');
        expect(Buffer.from(response.body)).toEqual(PNG_BYTES);

        // Contract 2: data injected before navigation to {uiBaseUrl}/#/render.
        expect(fake.page.addInitScript).toHaveBeenCalledWith(expect.any(Function), {
            documentType: 'architecture',
            document: { nodes: [], relationships: [] },
        });
        expect(fake.page.goto).toHaveBeenCalledWith('http://localhost:8080/#/render', { timeout: 20000 });
        expect(fake.page.waitForSelector).toHaveBeenCalledWith('[data-render-ready="true"]', { timeout: 20000 });
        // The screenshot is clipped to the diagram's content bounds from the page.
        expect(fake.page.screenshot).toHaveBeenCalledWith({
            type: 'png',
            clip: { x: 10, y: 20, width: 300, height: 150 },
        });
        expect(fake.page.locator).not.toHaveBeenCalled();
        expect(fake.browser.close).toHaveBeenCalledTimes(1);
    });

    test('should fall back to screenshotting the render container when no content bounds exist', async () => {
        const fake = fakeBrowser();
        fake.page.evaluate.mockResolvedValue(null);
        (launchBrowser as Mock).mockResolvedValue({ browser: fake.browser, displayName: 'Fake Chrome' });

        const response = await request(app).post('/calm/render/thumbnail').send(VALID_BODY);

        expect(response.status).toBe(200);
        expect(fake.page.locator).toHaveBeenCalledWith('[data-render-container]');
        expect(fake.browser.close).toHaveBeenCalledTimes(1);
    });

    test('should use a fixed card-shaped 1000x450 viewport at deviceScaleFactor 2', async () => {
        const fake = fakeBrowser();
        (launchBrowser as Mock).mockResolvedValue({ browser: fake.browser, displayName: 'Fake Chrome' });

        await request(app).post('/calm/render/thumbnail').send(VALID_BODY);

        expect(fake.browser.newContext).toHaveBeenCalledWith({
            viewport: { width: 1000, height: 450 },
            deviceScaleFactor: 2,
        });
    });

    test('should cap the requested timeout at 60000ms', async () => {
        const fake = fakeBrowser();
        (launchBrowser as Mock).mockResolvedValue({ browser: fake.browser, displayName: 'Fake Chrome' });

        await request(app)
            .post('/calm/render/thumbnail')
            .send({ ...VALID_BODY, timeoutMs: 120000 });

        expect(fake.page.waitForSelector).toHaveBeenCalledWith('[data-render-ready="true"]', { timeout: 60000 });
    });

    test('should honour a custom timeout below the cap', async () => {
        const fake = fakeBrowser();
        (launchBrowser as Mock).mockResolvedValue({ browser: fake.browser, displayName: 'Fake Chrome' });

        await request(app)
            .post('/calm/render/thumbnail')
            .send({ ...VALID_BODY, timeoutMs: 5000 });

        expect(fake.page.waitForSelector).toHaveBeenCalledWith('[data-render-ready="true"]', { timeout: 5000 });
    });

    test('should return 500 with an error envelope when the browser cannot launch', async () => {
        (launchBrowser as Mock).mockRejectedValue(new Error('no browser found'));

        const response = await request(app).post('/calm/render/thumbnail').send(VALID_BODY);

        expect(response.status).toBe(500);
        expect(response.body.error).toContain('Failed to render thumbnail');
    });

    test('should return 500 and still close the browser when the render times out', async () => {
        const fake = fakeBrowser();
        fake.page.waitForSelector.mockRejectedValue(new Error('Timeout 20000ms exceeded'));
        (launchBrowser as Mock).mockResolvedValue({ browser: fake.browser, displayName: 'Fake Chrome' });

        const response = await request(app).post('/calm/render/thumbnail').send(VALID_BODY);

        expect(response.status).toBe(500);
        expect(response.body.error).toContain('Timeout');
        expect(fake.browser.close).toHaveBeenCalledTimes(1);
    });

    test('should normalize a trailing slash off uiBaseUrl before navigating', async () => {
        const fake = fakeBrowser();
        (launchBrowser as Mock).mockResolvedValue({ browser: fake.browser, displayName: 'Fake Chrome' });

        await request(app)
            .post('/calm/render/thumbnail')
            .send({ ...VALID_BODY, uiBaseUrl: ' http://localhost:8080/ ' });

        expect(fake.page.goto).toHaveBeenCalledWith('http://localhost:8080/#/render', { timeout: 20000 });
    });

    test('should accept documents larger than the 100kb express default', async () => {
        const fake = fakeBrowser();
        (launchBrowser as Mock).mockResolvedValue({ browser: fake.browser, displayName: 'Fake Chrome' });

        // ~300kb document — over express.json's default limit, under the render router's 10mb.
        const bigDocument = { nodes: [{ description: 'x'.repeat(300 * 1024) }] };
        const response = await request(app)
            .post('/calm/render/thumbnail')
            .send({ ...VALID_BODY, documentJson: JSON.stringify(bigDocument) });

        expect(response.status).toBe(200);
        expect(fake.page.addInitScript).toHaveBeenCalledWith(expect.any(Function), {
            documentType: 'architecture',
            document: bigDocument,
        });
    });

    test('should support pattern documents', async () => {
        const fake = fakeBrowser();
        (launchBrowser as Mock).mockResolvedValue({ browser: fake.browser, displayName: 'Fake Chrome' });

        const response = await request(app)
            .post('/calm/render/thumbnail')
            .send({ ...VALID_BODY, documentType: 'pattern' });

        expect(response.status).toBe(200);
        expect(fake.page.addInitScript).toHaveBeenCalledWith(expect.any(Function), {
            documentType: 'pattern',
            document: { nodes: [], relationships: [] },
        });
    });
});

// computeDiagramClip runs inside the page via page.evaluate (mocked above), so its
// branches are exercised here directly against a stubbed DOM.
describe('computeDiagramClip', () => {
    interface FakeRect {
        left: number;
        top: number;
        right: number;
        bottom: number;
        width: number;
        height: number;
    }

    function fakeElement(left: number, top: number, right: number, bottom: number) {
        const rect: FakeRect = { left, top, right, bottom, width: right - left, height: bottom - top };
        return { getBoundingClientRect: () => rect };
    }

    function stubDom(nodes: ReturnType<typeof fakeElement>[], edges: ReturnType<typeof fakeElement>[] = []) {
        vi.stubGlobal('document', {
            querySelectorAll: (selector: string) => (selector === '.react-flow__node' ? nodes : edges),
        });
        vi.stubGlobal('window', { innerWidth: 1000, innerHeight: 450 });
    }

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test('pads the union of node and edge boxes and widens it to the target aspect', () => {
        // The edge lies inside the node's box, so the union is the node box: content
        // (200,100)-(300,200) → padded by 16 to (184,84) 132x132, then widened
        // (aspect 1 < 1.75) by 99 centred: x 184-49.5, width 231.
        stubDom([fakeElement(200, 100, 300, 200)], [fakeElement(250, 150, 300, 200)]);

        expect(computeDiagramClip()).toEqual({ x: 134.5, y: 84, width: 231, height: 132 });
    });

    test('expands the height of a very wide content box toward the target aspect', () => {
        // Padded box 350x82 (aspect ~4.3 > 1.75): height grows to 350/1.75 = 200,
        // centred (y 184 - 59 = 125); width is untouched.
        stubDom([fakeElement(300, 200, 618, 250)]);

        expect(computeDiagramClip()).toEqual({ x: 284, y: 125, width: 350, height: 200 });
    });

    test('expands the width of a tall content box toward the target aspect', () => {
        // Padded box 132x232 (aspect ~0.57 < 1.75): width grows to 232*1.75 = 406,
        // centred (x 384 - 137 = 247); height is untouched.
        stubDom([fakeElement(400, 100, 500, 300)]);

        expect(computeDiagramClip()).toEqual({ x: 247, y: 84, width: 406, height: 232 });
    });

    test('returns null when the page has no nodes or edges', () => {
        stubDom([], []);

        expect(computeDiagramClip()).toBeNull();
    });

    test('returns null when every element has a zero-size rect', () => {
        // Unmeasured/hidden elements report 0x0 rects and are skipped.
        stubDom([fakeElement(0, 0, 0, 0)], [fakeElement(0, 0, 0, 0)]);

        expect(computeDiagramClip()).toBeNull();
    });

    test('clamps a box pushed past the viewport origin by padding and aspect expansion', () => {
        // Content at the top-left corner: padding takes x/y negative and the aspect
        // expansion pushes x further left; both clamp to 0 and the width/height
        // shrink by the clamped amount.
        stubDom([fakeElement(0, 0, 30, 10)]);

        expect(computeDiagramClip()).toEqual({ x: 0, y: 0, width: 51.75, height: 26 });
    });
});
