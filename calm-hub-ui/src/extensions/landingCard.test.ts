import { describe, expect, it } from 'vitest';
import { cardHeadline, isBlocksReply } from './landingCard.js';

describe('landing card headline', () => {
    it('shows the first three items of the first stats block', () => {
        const items = [1, 2, 3, 4].map((n) => ({ label: `L${n}`, value: n }));
        expect(
            cardHeadline([
                { type: 'alert', text: 'ignored' },
                { type: 'stats', items },
                { type: 'stats', items: [{ label: 'other', value: 9 }] },
            ])
        ).toEqual({ kind: 'stats', items: items.slice(0, 3) });
    });

    it('falls back to the first alert as one line', () => {
        expect(cardHeadline([{ type: 'cards', items: [] }, { type: 'alert', tone: 'warning', text: 'Rolling out' }])).toEqual({
            kind: 'alert',
            text: 'Rolling out',
            tone: 'warning',
        });
        expect(cardHeadline([{ type: 'alert', text: 'No tone' }])).toMatchObject({ tone: 'info' });
    });

    it('shows nothing for other blocks or an empty stats block', () => {
        expect(cardHeadline([{ type: 'stats', items: [] }, { type: 'markdown', text: '#' }])).toBeUndefined();
    });

    it('accepts only a blocks reply of the extension API version', () => {
        expect(isBlocksReply({ hubApi: 0, blocks: [] }, 0)).toBe(true);
        expect(isBlocksReply({ hubApi: 1, blocks: [] }, 0)).toBe(false);
        expect(isBlocksReply({ hubApi: 0 }, 0)).toBe(false);
        expect(isBlocksReply(null, 0)).toBe(false);
    });
});
