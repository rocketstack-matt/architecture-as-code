import { describe, it, expect } from 'vitest'
import {
    colors,
    fonts,
    getNodeTypeColor,
    getRiskLevelColor,
    getAdrStatusColor,
} from './index.js'

describe('@finos/calm-design-tokens', () => {
    describe('colors', () => {
        it('exposes the documented brand palette', () => {
            expect(colors.brand.primary).toBe('#000063')
            expect(colors.brand.accent).toBe('#007dff')
            expect(colors.brand.accentLight).toBe('#b2d8f5')
        })

        it('exposes the documented node-type palette', () => {
            expect(colors.nodeTypes.system).toBe('#3b82f6')
            expect(colors.nodeTypes.service).toBe('#06b6d4')
            expect(colors.nodeTypes.database).toBe('#10b981')
            expect(colors.nodeTypes['external-service']).toBe('#ec4899')
            expect(colors.nodeTypes.default).toBe('#64748b')
        })

        it('exposes the documented diff palette', () => {
            expect(colors.diffPalette.add.bg).toBe('#e8f6ee')
            expect(colors.diffPalette.mod.bg).toBe('#fdf3e2')
            expect(colors.diffPalette.del.bg).toBe('#fde8e8')
            expect(colors.diffPalette.add.sign).toBe('+')
            expect(colors.diffPalette.mod.sign).toBe('~')
            expect(colors.diffPalette.del.sign).toBe('−')
        })
    })

    describe('fonts', () => {
        it('exposes the Inter sans stack', () => {
            expect(fonts.sans).toContain('Inter')
        })

        it('exposes the JetBrains Mono stack', () => {
            expect(fonts.monoJb).toContain('JetBrains Mono')
        })
    })

    describe('helper functions', () => {
        it('getNodeTypeColor resolves known types case-insensitively', () => {
            expect(getNodeTypeColor('system')).toBe(colors.nodeTypes.system)
            expect(getNodeTypeColor('SYSTEM')).toBe(colors.nodeTypes.system)
            expect(getNodeTypeColor('Database')).toBe(colors.nodeTypes.database)
        })

        it('getNodeTypeColor falls back to default for unknown types', () => {
            expect(getNodeTypeColor('completely-made-up')).toBe(
                colors.nodeTypes.default
            )
        })

        it('getRiskLevelColor resolves known levels', () => {
            expect(getRiskLevelColor('critical')).toBe(colors.risk.critical)
            expect(getRiskLevelColor('LOW')).toBe(colors.risk.low)
        })

        it('getRiskLevelColor falls back to muted text for unknown levels', () => {
            expect(getRiskLevelColor('whatever')).toBe(colors.text.secondary)
        })

        it('getAdrStatusColor resolves known statuses', () => {
            expect(getAdrStatusColor('accepted')).toBe(colors.adrStatus.accepted)
            expect(getAdrStatusColor('SUPERSEDED')).toBe(
                colors.adrStatus.superseded
            )
        })

        it('getAdrStatusColor falls back to dark border for unknown statuses', () => {
            expect(getAdrStatusColor('unknown')).toBe(colors.border.dark)
        })
    })
})
