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
    routes: [{ id: 'summary', path: '/summary', method: 'GET', scope: 'global', readOnly: true }],
    contributes: {},
};
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
        expect(screen.getByRole('alert')).toHaveTextContent('read-only GET');
        expect(spy).not.toHaveBeenCalled();
    });
    it('confirms a non-read-only action before calling it', async () => {
        const spy = vi.spyOn(ExtensionService.prototype, 'call').mockResolvedValue(undefined);
        const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
        render(
            <ExtensionSlot
                action
                extension={{ ...extension, routes: [{ ...extension.routes[0], method: 'POST', readOnly: false }] }}
                contribution={contribution}
            />
        );
        fireEvent.click(screen.getByRole('button'));
        expect(confirm).toHaveBeenCalled();
        expect(spy).not.toHaveBeenCalled();
        confirm.mockReturnValue(true);
        fireEvent.click(screen.getByRole('button'));
        await waitFor(() => expect(spy).toHaveBeenCalledOnce());
    });
    it('does not confirm read-only actions and reports failures', async () => {
        vi.spyOn(ExtensionService.prototype, 'call').mockRejectedValue(new Error());
        const confirm = vi.spyOn(window, 'confirm');
        render(<ExtensionSlot action extension={extension} contribution={contribution} />);
        fireEvent.click(screen.getByRole('button'));
        expect(await screen.findByRole('alert')).toHaveTextContent('failed');
        expect(confirm).not.toHaveBeenCalled();
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

it('aborts an action when its host slot unmounts', async () => {
    const spy = vi.spyOn(ExtensionService.prototype, 'call').mockReturnValue(new Promise(() => {}));
    const view = render(<ExtensionSlot action extension={extension} contribution={contribution} />);
    fireEvent.click(screen.getByRole('button'));
    view.unmount();
    expect(spy.mock.calls[0][3]?.aborted).toBe(true);
});
