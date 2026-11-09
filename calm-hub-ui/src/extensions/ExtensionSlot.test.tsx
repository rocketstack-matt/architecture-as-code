import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExtensionSlot } from './ExtensionSlot.js';
import { ExtensionService } from '../service/extension-service.js';
import { ExtensionSummary } from '../model/extensions.js';
import { ExtensionsProvider } from './ExtensionsContext.js';
const contribution = { id: 'summary', title: 'Summary', route: 'summary' };
const extension: ExtensionSummary = {
    id: 'test',
    name: 'Test',
    hubApi: 0,
    routes: [{ id: 'summary', path: '/summary', method: 'GET', scope: 'authenticated', readOnly: true }],
    contributes: {},
};
const writeExtension: ExtensionSummary = { ...extension, routes: [{ ...extension.routes[0], method: 'POST', readOnly: false }] };
afterEach(() => vi.restoreAllMocks());

describe('ExtensionSlot', () => {
    it('renders a block reply', async () => {
        vi.spyOn(ExtensionService.prototype, 'call').mockResolvedValue({ hubApi: 0, blocks: [{ type: 'markdown', text: 'ready' }] });
        render(<ExtensionSlot extension={extension} contribution={contribution} />);
        expect(await screen.findByText('ready')).toBeInTheDocument();
    });
    it('shows request failures', async () => {
        vi.spyOn(ExtensionService.prototype, 'call').mockRejectedValue(new Error());
        render(<ExtensionSlot extension={extension} contribution={contribution} />);
        expect(await screen.findByRole('alert')).toHaveTextContent('failed');
    });
    it('contains malformed replies', async () => {
        vi.spyOn(ExtensionService.prototype, 'call').mockResolvedValue({ hubApi: 1, blocks: [] });
        render(<ExtensionSlot extension={extension} contribution={contribution} />);
        expect(await screen.findByRole('alert')).toHaveTextContent('failed');
    });
    it('does not call a write route to load blocks', async () => {
        const spy = vi.spyOn(ExtensionService.prototype, 'call');
        render(
            <ExtensionSlot
                extension={{ ...extension, routes: [{ ...extension.routes[0], method: 'POST', readOnly: false }] }}
                contribution={contribution}
            />
        );
        expect(screen.getByRole('alert')).toHaveTextContent('must use GET');
        expect(spy).not.toHaveBeenCalled();
    });
    it('confirms a non-read-only action in a dialog before calling it', async () => {
        const spy = vi.spyOn(ExtensionService.prototype, 'call').mockResolvedValue(undefined);
        render(<ExtensionSlot action extension={writeExtension} contribution={contribution} context={{ version: '1' }} />);
        fireEvent.click(screen.getByRole('button', { name: 'Summary' }));
        expect(screen.getByRole('dialog')).toHaveTextContent('Run Summary?');
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(spy).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Summary' }));
        fireEvent.click(screen.getByRole('button', { name: 'Run' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await waitFor(() => expect(spy).toHaveBeenCalledOnce());
        expect(spy.mock.calls[0][2]).toEqual({ version: '1' });
    });
    it('reports a failed write', async () => {
        vi.spyOn(ExtensionService.prototype, 'call').mockRejectedValue(new Error());
        render(<ExtensionSlot action extension={writeExtension} contribution={contribution} />);
        fireEvent.click(screen.getByRole('button', { name: 'Summary' }));
        fireEvent.click(screen.getByRole('button', { name: 'Run' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('failed');
        expect(screen.getByRole('button', { name: 'Summary' })).toHaveAttribute('aria-disabled', 'false');
    });
    it('does not confirm read-only actions and reports failures', async () => {
        vi.spyOn(ExtensionService.prototype, 'call').mockRejectedValue(new Error());
        render(<ExtensionSlot action extension={extension} contribution={contribution} />);
        fireEvent.click(screen.getByRole('button'));
        expect(await screen.findByRole('alert')).toHaveTextContent('failed');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});

it('aborts a previous slot request and ignores its late reply', async () => {
    let complete: (value: unknown) => void = () => {};
    const spy = vi
        .spyOn(ExtensionService.prototype, 'call')
        .mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    complete = resolve;
                })
        )
        .mockResolvedValue({ hubApi: 0, blocks: [{ type: 'markdown', text: 'current' }] });
    const view = render(<ExtensionSlot extension={extension} contribution={contribution} context={{ version: '1' }} />);
    const signal = spy.mock.calls[0][3];
    view.rerender(<ExtensionSlot extension={extension} contribution={contribution} context={{ version: '2' }} />);
    expect(signal?.aborted).toBe(true);
    expect(await screen.findByText('current')).toBeInTheDocument();
    complete({ hubApi: 0, blocks: [{ type: 'markdown', text: 'stale' }] });
    await waitFor(() => expect(screen.queryByText('stale')).toBeNull());
});

it('aborts a read-only action when its host slot unmounts', async () => {
    const spy = vi.spyOn(ExtensionService.prototype, 'call').mockReturnValue(new Promise(() => {}));
    const view = render(<ExtensionSlot action extension={extension} contribution={contribution} />);
    fireEvent.click(screen.getByRole('button'));
    view.unmount();
    expect(spy.mock.calls[0][3]?.aborted).toBe(true);
});

it('does not abort a confirmed write when its host slot unmounts', async () => {
    const spy = vi.spyOn(ExtensionService.prototype, 'call').mockReturnValue(new Promise(() => {}));
    const view = render(<ExtensionSlot action extension={writeExtension} contribution={contribution} />);
    fireEvent.click(screen.getByRole('button', { name: 'Summary' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    await waitFor(() => expect(spy).toHaveBeenCalledOnce());
    view.unmount();
    expect(spy.mock.calls[0][3]).toBeUndefined();
});

it('keeps a confirmed write running when the context changes', async () => {
    let complete: (value: unknown) => void = () => {};
    const spy = vi.spyOn(ExtensionService.prototype, 'call').mockReturnValue(
        new Promise((resolve) => {
            complete = resolve;
        })
    );
    const view = render(<ExtensionSlot action extension={writeExtension} contribution={contribution} context={{ version: '1' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Summary' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    await waitFor(() => expect(spy).toHaveBeenCalledOnce());
    view.rerender(<ExtensionSlot action extension={writeExtension} contribution={contribution} context={{ version: '2' }} />);
    expect(spy.mock.calls[0][3]).toBeUndefined();
    expect(spy.mock.calls[0][2]).toEqual({ version: '1' });
    expect(screen.getByRole('button', { name: 'Summary' })).toHaveAttribute('aria-disabled', 'true');
    complete(undefined);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Summary' })).toHaveAttribute('aria-disabled', 'false'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('loads a GET block route without the optional readOnly flag', async () => {
    vi.spyOn(ExtensionService.prototype, 'call').mockResolvedValue({ hubApi: 0, blocks: [] });
    render(
        <ExtensionSlot extension={{ ...extension, routes: [{ ...extension.routes[0], readOnly: false }] }} contribution={contribution} />
    );
    expect(await screen.findByRole('heading', { name: 'Summary' })).toBeInTheDocument();
});

describe('ExtensionSlot actions', () => {
    const target = { namespace: 'finos', resource: 'architecture/trading', version: '1.0.0', selectedElement: 'web-app' };
    function providerService() {
        const service = new ExtensionService();
        vi.spyOn(service, 'fetchExtensions').mockReturnValue(new Promise(() => {}));
        return service;
    }

    it('keeps a write disabled across a remount, so it cannot run twice', async () => {
        let complete: (value: unknown) => void = () => {};
        const spy = vi.spyOn(ExtensionService.prototype, 'call').mockReturnValue(new Promise((resolve) => (complete = resolve)));
        const service = providerService();
        const page = (shown: boolean) => (
            <ExtensionsProvider service={service}>
                {shown && <ExtensionSlot action extension={writeExtension} contribution={contribution} context={target} />}
            </ExtensionsProvider>
        );
        const view = render(page(true));
        fireEvent.click(screen.getByRole('button', { name: 'Summary' }));
        fireEvent.click(screen.getByRole('button', { name: 'Run' }));
        await waitFor(() => expect(spy).toHaveBeenCalledOnce());

        view.rerender(page(false));
        view.rerender(page(true));
        const button = screen.getByRole('button', { name: 'Summary' });
        expect(button).toHaveAttribute('aria-disabled', 'true');
        fireEvent.click(button);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        await act(async () => complete(undefined));
        expect(screen.getByRole('button', { name: 'Summary' })).toHaveAttribute('aria-disabled', 'false');
        expect(spy).toHaveBeenCalledOnce();
    });

    it('clears a failure when the context changes', async () => {
        vi.spyOn(ExtensionService.prototype, 'call').mockRejectedValue(new Error());
        const view = render(<ExtensionSlot action extension={extension} contribution={contribution} context={{ version: '1' }} />);
        fireEvent.click(screen.getByRole('button', { name: 'Summary' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('failed');

        view.rerender(<ExtensionSlot action extension={extension} contribution={contribution} context={{ version: '2' }} />);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();

        view.rerender(<ExtensionSlot action extension={extension} contribution={contribution} context={{ version: '1' }} />);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows the result of a write that ends while the button is not on screen', async () => {
        let complete: (value: unknown) => void = () => {};
        vi.spyOn(ExtensionService.prototype, 'call').mockReturnValue(new Promise((resolve) => (complete = resolve)));
        const service = providerService();
        const page = (shown: boolean) => (
            <ExtensionsProvider service={service}>
                {shown && <ExtensionSlot action extension={writeExtension} contribution={contribution} context={target} />}
            </ExtensionsProvider>
        );
        const view = render(page(true));
        fireEvent.click(screen.getByRole('button', { name: 'Summary' }));
        fireEvent.click(screen.getByRole('button', { name: 'Run' }));

        view.rerender(page(false));
        await act(async () => complete(undefined));
        view.rerender(page(true));
        expect(screen.getByRole('status')).toHaveTextContent('Summary: done.');
    });

    it('gives focus back to the action button when the dialog closes', async () => {
        vi.spyOn(ExtensionService.prototype, 'call').mockResolvedValue(undefined);
        render(<ExtensionSlot action extension={writeExtension} contribution={contribution} context={target} />);
        const button = screen.getByRole('button', { name: 'Summary' });
        fireEvent.click(button);
        screen.getByRole('button', { name: 'Cancel' }).focus();
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(button).toHaveFocus();

        fireEvent.click(button);
        screen.getByRole('button', { name: 'Run' }).focus();
        fireEvent.click(screen.getByRole('button', { name: 'Run' }));
        expect(button).toHaveFocus();
        expect(await screen.findByRole('status')).toBeInTheDocument();
    });

    it('says when an action is done, until the context changes', async () => {
        vi.spyOn(ExtensionService.prototype, 'call').mockResolvedValue(undefined);
        const view = render(<ExtensionSlot action extension={extension} contribution={contribution} context={{ version: '1' }} />);
        fireEvent.click(screen.getByRole('button', { name: 'Summary' }));
        expect(await screen.findByRole('status')).toHaveTextContent('Summary: done.');

        view.rerender(<ExtensionSlot action extension={extension} contribution={contribution} context={{ version: '2' }} />);
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('names the target in the dialog, and sends the context of the click after the context changes', async () => {
        const spy = vi.spyOn(ExtensionService.prototype, 'call').mockResolvedValue(undefined);
        const view = render(<ExtensionSlot action extension={writeExtension} contribution={contribution} context={target} />);
        fireEvent.click(screen.getByRole('button', { name: 'Summary' }));
        const dialog = screen.getByRole('dialog', { name: 'Confirm action' });
        expect(within(dialog).getAllByRole('definition').map((value) => value.textContent)).toEqual([
            'finos',
            'architecture/trading',
            '1.0.0',
            'web-app',
        ]);
        expect(dialog).toHaveTextContent('Resourcearchitecture/trading');
        expect(dialog).toHaveTextContent('Version1.0.0');
        expect(dialog).toHaveTextContent('Elementweb-app');

        view.rerender(
            <ExtensionSlot action extension={writeExtension} contribution={contribution} context={{ ...target, version: '2.0.0' }} />
        );
        expect(screen.getByRole('dialog')).toHaveTextContent('Version1.0.0');
        fireEvent.click(screen.getByRole('button', { name: 'Run' }));
        await waitFor(() => expect(spy).toHaveBeenCalledOnce());
        expect(spy.mock.calls[0][2]).toEqual(target);
    });

    it('opens the dialog as a modal, and closes it on Escape without a call', () => {
        const showModal = vi.fn(function (this: HTMLDialogElement) {
            this.setAttribute('open', '');
        });
        Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: showModal });
        try {
            const spy = vi.spyOn(ExtensionService.prototype, 'call');
            render(<ExtensionSlot action extension={writeExtension} contribution={contribution} context={target} />);
            fireEvent.click(screen.getByRole('button', { name: 'Summary' }));
            expect(showModal).toHaveBeenCalledOnce();

            fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            expect(spy).not.toHaveBeenCalled();
        } finally {
            delete (HTMLDialogElement.prototype as { showModal?: unknown }).showModal;
        }
    });
});

it('makes the slot a size container, so its blocks follow the slot width', async () => {
    vi.spyOn(ExtensionService.prototype, 'call').mockResolvedValue({ hubApi: 0, blocks: [] });
    render(<ExtensionSlot extension={extension} contribution={contribution} />);
    expect(await screen.findByRole('region', { name: 'Summary' })).toHaveClass('@container');
});
