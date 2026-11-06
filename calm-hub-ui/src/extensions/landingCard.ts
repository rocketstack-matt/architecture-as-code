import { ExtensionScreen, ScreenBlock, Tone } from '../model/extensions.js';

export function isBlocksReply(reply: unknown, hubApi: number): reply is ExtensionScreen {
    const value = reply as ExtensionScreen | null;
    return !!value && value.hubApi === hubApi && Array.isArray(value.blocks);
}

export const LANDING_CARD_MAX_STATS = 3;

export type CardHeadline =
    | { kind: 'stats'; items: { label: string; value: string | number }[] }
    | { kind: 'alert'; text: string; tone: Tone };

/**
 * What a home page card shows from a landing card: the first three items of its first `stats` block. Without a
 * `stats` block, the text of its first `alert` block on one line. Other blocks show only on the extension's screen.
 */
export function cardHeadline(blocks: readonly ScreenBlock[]): CardHeadline | undefined {
    const stats = blocks.find((block) => block.type === 'stats');
    if (stats && Array.isArray(stats.items) && stats.items.length > 0) {
        return { kind: 'stats', items: stats.items.slice(0, LANDING_CARD_MAX_STATS) };
    }
    const alert = blocks.find((block) => block.type === 'alert');
    if (alert && typeof alert.text === 'string') return { kind: 'alert', text: alert.text, tone: alert.tone ?? 'info' };
    return undefined;
}
