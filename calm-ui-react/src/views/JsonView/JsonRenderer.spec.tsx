import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { JsonRenderer } from './JsonRenderer.js'

vi.mock('@monaco-editor/react', () => ({
    Editor: ({ value, options }: { value: string; options?: { lineNumbers?: 'on' | 'off' } }) => (
        <textarea
            value={value}
            readOnly
            data-testid="monaco-editor"
            data-line-numbers={options?.lineNumbers}
        />
    ),
}))

describe('JsonRenderer', () => {
    it('renders default message when json is undefined', () => {
        render(<JsonRenderer json={undefined} />)
        expect(screen.getByText(/please select a document to load/i)).toBeInTheDocument()
        expect(screen.queryByText(/visualize/i)).not.toBeInTheDocument()
    })

    it('renders the editor when json is provided', () => {
        const data = {
            id: '42',
            version: '0.0.1',
            name: 'bar',
            calmType: 'Architectures',
            data: undefined,
        }
        render(<JsonRenderer json={data} />)

        const textarea = screen.getByTestId('monaco-editor')
        expect(textarea).toHaveValue(JSON.stringify(data, null, 2))
    })

    it('shows line numbers by default', () => {
        render(<JsonRenderer json={{ test: 'data' }} />)
        expect(screen.getByTestId('monaco-editor')).toHaveAttribute('data-line-numbers', 'on')
    })

    it('shows line numbers when showLineNumbers is true', () => {
        render(<JsonRenderer json={{ test: 'data' }} showLineNumbers={true} />)
        expect(screen.getByTestId('monaco-editor')).toHaveAttribute('data-line-numbers', 'on')
    })

    it('hides line numbers when showLineNumbers is false', () => {
        render(<JsonRenderer json={{ test: 'data' }} showLineNumbers={false} />)
        expect(screen.getByTestId('monaco-editor')).toHaveAttribute('data-line-numbers', 'off')
    })
})
