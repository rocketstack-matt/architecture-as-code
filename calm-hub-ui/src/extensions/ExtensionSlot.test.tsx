import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExtensionSlot } from './ExtensionSlot.js';
import { ExtensionService } from '../service/extension-service.js';
import { ExtensionSummary } from '../model/extensions.js';
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
        expect(screen.getByRole('button', { name: 'Summary' })).toBeEnabled();
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
    expect(screen.getByRole('button', { name: 'Summary' })).toBeDisabled();
    complete(undefined);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Summary' })).toBeEnabled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('loads a GET block route without the optional readOnly flag', async () => {
    vi.spyOn(ExtensionService.prototype, 'call').mockResolvedValue({ hubApi: 0, blocks: [] });
    render(
        <ExtensionSlot extension={{ ...extension, routes: [{ ...extension.routes[0], readOnly: false }] }} contribution={contribution} />
    );
    expect(await screen.findByRole('heading', { name: 'Summary' })).toBeInTheDocument();
});
