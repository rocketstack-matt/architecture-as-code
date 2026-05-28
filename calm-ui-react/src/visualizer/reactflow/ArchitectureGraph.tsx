import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
    Node,
    Background,
    Controls,
    MiniMap,
    Panel,
    ReactFlowProvider,
    useEdgesState,
    useNodesInitialized,
    useNodesState,
    useReactFlow,
    type Viewport,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { readViewportForKey, saveViewportForKey } from './utils/viewportStore.js';
import { FloatingEdge } from './FloatingEdge.js';
import { CustomNode } from './CustomNode.js';
import { SystemGroupNode } from './SystemGroupNode.js';
import { SearchBar } from './SearchBar.js';
import { THEME } from './theme.js';
import { EmptyGraphState } from './EmptyGraphState.js';
import { parseCALMData } from './utils/calmTransformer.js';
import { getMatchingNodeIds, isEdgeVisible, getUniqueNodeTypes } from './utils/searchUtils.js';
import { useGraphInteractions } from './hooks/useGraphInteractions.js';
import type { ArchitectureGraphProps } from '../contracts/contracts.js';

const edgeTypes = { custom: FloatingEdge };
const nodeTypes = { custom: CustomNode, group: SystemGroupNode };
const GROUP_NODE_TYPES = ['group'];

function ArchitectureGraphInner({ jsonData, onNodeClick, onEdgeClick, viewportKey }: ArchitectureGraphProps) {
    // Restore the saved viewport for this diagram (so a refresh keeps the zoom/pan);
    // a different diagram has no saved viewport for its key, so it fits to view.
    const savedViewport = useMemo<Viewport | undefined>(
        () => (viewportKey ? readViewportForKey(viewportKey) : undefined),
        [viewportKey]
    );

    const [nodes, setNodes, onNodesChangeBase] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const { fitView } = useReactFlow();
    const nodesInitialized = useNodesInitialized();
    const containerRef = useRef<HTMLDivElement>(null);
    const fitFrameRef = useRef<number | undefined>(undefined);

    // Ref holds the structural node data from parsing.
    // Filter effect reads from this instead of reactive state to avoid
    // re-triggering when setNodes/setEdges update styles.
    const sourceNodesRef = useRef<Node[]>([]);

    const [availableNodeTypes, setAvailableNodeTypes] = useState<string[]>([]);

    const {
        onNodesChange,
        handleNodeClick,
        handleEdgeClick,
        handleNodeMouseEnter,
        handleNodeMouseLeave,
    } = useGraphInteractions({
        setNodes,
        onNodesChangeBase,
        onNodeClick,
        onEdgeClick,
        groupNodeTypes: GROUP_NODE_TYPES,
    });

    useEffect(() => {
        const { nodes: parsedNodes, edges: parsedEdges } = parseCALMData(jsonData, onNodeClick);
        sourceNodesRef.current = parsedNodes;
        setNodes(parsedNodes);
        setEdges(parsedEdges);
        setAvailableNodeTypes(getUniqueNodeTypes(parsedNodes));
    }, [jsonData, setNodes, setEdges, onNodeClick]);

    // Fit on the next animation frame so ReactFlow has picked up the container's
    // final dimensions first — a synchronous fitView() can use a stale width when
    // the diagram lives in a panel that's still settling (VSCode webview, Hub UI
    // split panels). The frame is tracked so it can be cancelled on unmount.
    // minZoom keeps the diagram readable even when the panel is much narrower
    // than the dagre LR layout it has to fit (e.g. the VSCode preview pane on
    // a half-screen split, where a three-tier architecture's 4:1 aspect ratio
    // would otherwise zoom to ~0.24 and shrink every node to a sliver). The
    // user can pan/scroll to reach overflow.
    const FIT_VIEW_OPTIONS = { padding: 0.15, minZoom: 0.5 } as const;
    const scheduleFit = useCallback(() => {
        if (fitFrameRef.current !== undefined) cancelAnimationFrame(fitFrameRef.current);
        fitFrameRef.current = requestAnimationFrame(() => fitView(FIT_VIEW_OPTIONS));
    }, [fitView]);

    useEffect(() => () => {
        if (fitFrameRef.current !== undefined) cancelAnimationFrame(fitFrameRef.current);
    }, []);

    // Fit once nodes have been measured by ReactFlow. The built-in `fitView`
    // prop only runs once at mount time, before the data effect above has
    // populated the state — by the time nodes appear, the fit has already
    // happened against an empty graph, so in a narrow panel (e.g. VSCode
    // webview split view) the diagram is pinned to the container's top-left
    // at its raw dagre coordinates. Re-firing fitView once nodes are
    // initialised restores the expected behaviour without changing what the
    // user sees on a refresh that has a saved viewport.
    useEffect(() => {
        if (!nodesInitialized) return;
        if (savedViewport) return;
        scheduleFit();
    }, [nodesInitialized, savedViewport, scheduleFit]);

    // Re-fit on container size changes — when the preview panel reaches its
    // final width after the webview's first layout pass, ReactFlow doesn't
    // refit on its own.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        if (savedViewport) return;
        const observer = new ResizeObserver(() => {
            if (nodesInitialized) scheduleFit();
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [savedViewport, nodesInitialized, scheduleFit]);

    // Search & filter
    const isSearchActive = searchTerm !== '' || typeFilter !== '';

    useEffect(() => {
        if (!isSearchActive) {
            setNodes((nds) => nds.map((n) => ({ ...n, style: { ...n.style, opacity: undefined } })));
            setEdges((eds) => eds.map((e) => ({ ...e, style: { ...e.style, opacity: undefined } })));
            return;
        }
        const srcNodes = sourceNodesRef.current;
        const matchingIds = getMatchingNodeIds(srcNodes, searchTerm, typeFilter);
        setNodes((nds) =>
            nds.map((n) => ({
                ...n,
                style: { ...n.style, opacity: matchingIds.has(n.id) ? 1 : 0.15 },
            }))
        );
        setEdges((eds) =>
            eds.map((e) => ({
                ...e,
                style: { ...e.style, opacity: isEdgeVisible(e, matchingIds) ? 1 : 0.1 },
            }))
        );
    }, [searchTerm, typeFilter, isSearchActive, setNodes, setEdges]);

    if (nodes.length === 0) {
        return <EmptyGraphState message="No architecture data to display. Load a CALM architecture to visualize." />;
    }

    return (
        <div ref={containerRef} style={{ height: '100%', width: '100%' }}>
            <ReactFlow
                // Remount when the diagram (resource) changes so a new architecture fits
                // afresh; switching versions/moments keeps the same key and preserves the view.
                key={viewportKey}
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                onNodeMouseEnter={handleNodeMouseEnter}
                onNodeMouseLeave={handleNodeMouseLeave}
                onEdgeClick={handleEdgeClick}
                onMove={(_, viewport) => {
                    if (viewportKey) saveViewportForKey(viewportKey, viewport);
                }}
                // Keep the built-in fitView for the initial mount path — the
                // programmatic re-fit below covers the case where the data
                // effect hasn't populated nodes by the time ReactFlow's own
                // fit has already run. Both are gated on no saved viewport.
                fitView={!savedViewport}
                defaultViewport={savedViewport}
                fitViewOptions={FIT_VIEW_OPTIONS}
                minZoom={0.1}
                attributionPosition="bottom-left"
                style={{ background: THEME.colors.background }}
            >
                <Background color={THEME.colors.border} gap={16} />
                <Controls
                    style={{
                        background: THEME.colors.card,
                        border: `1px solid ${THEME.colors.border}`,
                        borderRadius: '8px',
                    }}
                />
                <MiniMap
                    style={{
                        background: THEME.colors.backgroundSecondary,
                        border: `1px solid ${THEME.colors.border}`,
                    }}
                    nodeColor={THEME.colors.accent}
                    maskColor={`${THEME.colors.background}cc`}
                />
                <Panel position="top-right">
                    <SearchBar
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        typeFilter={typeFilter}
                        onTypeFilterChange={setTypeFilter}
                        nodeTypes={availableNodeTypes}
                    />
                </Panel>
            </ReactFlow>
        </div>
    );
}

export function ArchitectureGraph(props: ArchitectureGraphProps) {
    // Wrap with ReactFlowProvider so the inner component can use the
    // useReactFlow / useNodesInitialized hooks. The ReactFlow component below
    // creates its own internal provider, but the hooks must be called from a
    // component that's already a descendant of the provider.
    return (
        <ReactFlowProvider>
            <ArchitectureGraphInner {...props} />
        </ReactFlowProvider>
    );
}
