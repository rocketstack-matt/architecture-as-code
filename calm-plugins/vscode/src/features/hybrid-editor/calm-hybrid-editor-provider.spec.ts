import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CalmHybridEditorProvider } from './calm-hybrid-editor-provider'
import * as vscode from 'vscode'

// Mock vscode module
vi.mock('vscode', () => ({
    window: {
        registerCustomEditorProvider: vi.fn(() => ({ dispose: vi.fn() })),
    },
    Uri: {
        joinPath: vi.fn(),
        file: vi.fn(),
    },
    Range: vi.fn(),
    WorkspaceEdit: vi.fn(),
    workspace: {
        applyEdit: vi.fn(),
    },
}))

describe('CalmHybridEditorProvider', () => {
    let mockContext: any
    let mockLogger: any

    beforeEach(() => {
        mockContext = {
            extensionUri: { fsPath: '/test/extension' },
        }

        mockLogger = {
            info: vi.fn(),
            error: vi.fn(),
        }
        
        vi.clearAllMocks()
    })

    describe('registration', () => {
        it('should register the custom editor provider', () => {
            const registerSpy = vi.spyOn(vscode.window, 'registerCustomEditorProvider')

            CalmHybridEditorProvider.register(mockContext, mockLogger)

            expect(registerSpy).toHaveBeenCalledWith(
                'calm.hybridEditor',
                expect.any(CalmHybridEditorProvider),
                expect.objectContaining({
                    webviewOptions: {
                        retainContextWhenHidden: true,
                    },
                    supportsMultipleEditorsPerDocument: false,
                })
            )
        })

        it('should return a disposable', () => {
            const mockDisposable = { dispose: vi.fn() }
            vi.spyOn(vscode.window, 'registerCustomEditorProvider').mockReturnValue(mockDisposable)

            const result = CalmHybridEditorProvider.register(mockContext, mockLogger)

            expect(result).toBe(mockDisposable)
        })
    })

    describe('provider instance', () => {
        it('should create instance with provided dependencies', () => {
            const provider = new CalmHybridEditorProvider(mockContext, mockLogger)

            expect(provider).toBeDefined()
            expect(provider).toBeInstanceOf(CalmHybridEditorProvider)
        })
    })
})
