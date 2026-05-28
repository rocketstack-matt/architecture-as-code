import { describe, it, expect } from 'vitest';
import { colors as designTokens } from '@finos/calm-design-tokens';
import {
    lightTheme,
    darkTheme,
    highContrastLightTheme,
    highContrastDarkTheme,
    getThemeByName,
} from './default-themes.js';

describe('default themes — brand accent invariant', () => {
    // Every preset's node.stroke (and actor.stroke) must come from main[0],
    // which is the canonical CALM brand accent from @finos/calm-design-tokens.
    // This lock prevents drift between the docify SVG output and Hub UI /
    // VSCode webview rendering.
    const expectedAccent = designTokens.brand.accent;

    it('lightTheme stamps the CALM brand accent on node strokes', () => {
        expect(lightTheme.node.stroke).toBe(expectedAccent);
        expect(lightTheme.actor?.stroke).toBe(expectedAccent);
    });

    it('highContrastLightTheme stamps the CALM brand accent on node strokes', () => {
        expect(highContrastLightTheme.node.stroke).toBe(expectedAccent);
    });

    it('darkTheme stamps the CALM brand accent on node strokes', () => {
        expect(darkTheme.node.stroke).toBe(expectedAccent);
    });

    it('highContrastDarkTheme stamps the CALM brand accent on node strokes', () => {
        expect(highContrastDarkTheme.node.stroke).toBe(expectedAccent);
    });

    it('getThemeByName resolves to the right preset', () => {
        expect(getThemeByName('light')).toBe(lightTheme);
        expect(getThemeByName('dark')).toBe(darkTheme);
        expect(getThemeByName('high-contrast-light')).toBe(highContrastLightTheme);
        expect(getThemeByName('high-contrast-dark')).toBe(highContrastDarkTheme);
        // Unknown name falls back to light.
        expect(getThemeByName('whatever-else')).toBe(lightTheme);
    });
});
