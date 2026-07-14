import { useEffect } from 'react';
import { useNodesInitialized } from 'reactflow';

/**
 * Signals when the graph is safe to screenshot. Mounted as a `<ReactFlow>` child
 * (it needs the flow store context) by the chromeless render mode.
 *
 * `useNodesInitialized()` turns true once every node has been measured, but edge
 * paths derive from those measured nodeInternals (see {@link FloatingEdge}), so
 * we wait one further `requestAnimationFrame` for the paint to settle before
 * calling {@link RenderReadySignalProps.onReady}.
 */
interface RenderReadySignalProps {
    onReady: () => void;
}

export function RenderReadySignal({ onReady }: RenderReadySignalProps) {
    const nodesInitialized = useNodesInitialized();

    useEffect(() => {
        if (!nodesInitialized) return;
        const frame = requestAnimationFrame(() => onReady());
        return () => cancelAnimationFrame(frame);
    }, [nodesInitialized, onReady]);

    return null;
}
