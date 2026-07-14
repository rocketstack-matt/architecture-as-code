import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Background,
    Controls,
    MiniMap,
    Panel,
    useNodesState,
    useEdgesState,
    type Viewport,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { readViewportForKey, saveViewportForKey } from './utils/viewportStore.js';
import { FloatingEdge } from './FloatingEdge.js';
import { CustomNode } from './CustomNode.js';
import { SystemGroupNode } from './SystemGroupNode.js';
import { DecisionGroupNode } from './DecisionGroupNode.js';
import { RenderReadySignal } from './RenderReadySignal.js';
import { SearchBar } from './SearchBar.js';
import { THEME } from './theme.js';
import { EmptyGraphState } from './EmptyGraphState.js';
import { parsePatternData } from './utils/patternTransformer.js';
import { getMatchingNodeIds, isEdgeVisible, getUniqueNodeTypes } from './utils/searchUtils.js';
import { useGraphInteractions } from './hooks/useGraphInteractions.js';
import { applyStoredPositions } from '../../services/node-position-service.js';
import { useIsMobile } from '../../../hooks/useMediaQuery.js';
import { useNodeSearch } from './node-search-context.js';
import { DecisionSelectorPanel } from './DecisionSelectorPanel.js';
import {
    extractDecisionPoints,
    DecisionSelections,
    isDecisionFilterActive,
    getVisibleNodeIds,
    getVisibleEdgeIds,
} from './utils/decisionUtils.js';

const edgeTypes = { custom: FloatingEdge };
const nodeTypes = {
    custom: CustomNode,
    group: SystemGroupNode,
    decisionGroup: DecisionGroupNode,
};
const GROUP_NODE_TYPES = ['group', 'decisionGroup'];

/**
 * Chromeless (thumbnail render) fit: the screenshot must show the whole graph in a
 * fixed wide-and-short viewport (a minimap-style strip), so the zoom floor drops
 * below ReactFlow's default — a partially cropped thumbnail is worse than a small
 * one. Margins don't matter to framing because the screenshot is clipped to the
 * graph's content server-side. maxZoom sits below the interactive fit so tiny
 * graphs don't render as oversized strips that overflow the clip's card-aspect
 * expansion.
 */
const CHROMELESS_FIT_VIEW_OPTIONS = { padding: 0.1, minZoom: 0.05, maxZoom: 0.8 } as const;

interface PatternGraphProps {
    patternData: Record<string, unknown>;
    onNodeClick?: (nodeData: Record<string, unknown>) => void;
    onEdgeClick?: (edgeData: Record<string, unknown>) => void;
    viewportKey?: string;
    /**
     * Headless-render mode (the `/render` route driven by calm-server): suppresses
     * the Controls, MiniMap, DecisionSelector and SearchBar chrome (`<Background>`
     * stays), fits the whole graph, and sets `data-render-ready="true"` on the graph
     * wrapper once nodes are measured and the first paint has settled.
     */
    chromeless?: boolean;
}

export function PatternGraph({ patternData, onNodeClick, onEdgeClick, viewportKey, chromeless = false }: PatternGraphProps) {
    const savedViewport = useMemo<Viewport | undefined>(
        () => (viewportKey ? readViewportForKey(viewportKey) : undefined),
        [viewportKey]
    );

    // Chromeless render mode: true once nodes are measured and the first paint has
    // settled (RenderReadySignal), surfaced as data-render-ready on the wrapper so
    // calm-server's headless browser knows the graph is safe to screenshot.
    const [renderReady, setRenderReady] = useState(false);
    const markRenderReady = useCallback(() => setRenderReady(true), []);

    // Distinguishes "not parsed yet" (initial empty node state) from a genuinely
    // empty document, so chromeless mode never signals ready before the parse ran.
    const [parsed, setParsed] = useState(false);

    const [nodes, setNodes, onNodesChangeBase] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { searchTerm, setSearchTerm, typeFilter, setTypeFilter, availableNodeTypes, setAvailableNodeTypes, external: externalSearch } =
        useNodeSearch();
    const [decisionSelections, setDecisionSelections] = useState<DecisionSelections>(new Map());

    // Refs hold the structural node/edge data from parsing.
    // Filter effects read from these instead of reactive state to avoid
    // re-triggering when setNodes/setEdges update styles.
    const sourceNodesRef = useRef<Node[]>([]);
    const sourceEdgesRef = useRef<Edge[]>([]);

    const [decisionPoints, setDecisionPoints] = useState<ReturnType<typeof extractDecisionPoints>>([]);
    const isMobile = useIsMobile();

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
        persistKey: viewportKey,
    });

    useEffect(() => {
        const { nodes: parsedNodes, edges: parsedEdges } = parsePatternData(patternData);
        sourceNodesRef.current = parsedNodes;
        sourceEdgesRef.current = parsedEdges;
        // Restore any custom layout the user dragged for this diagram, falling
        // back to the parsed auto-layout when none is stored.
        setNodes(viewportKey ? applyStoredPositions(viewportKey, parsedNodes) : parsedNodes);
        setEdges(parsedEdges);
        setAvailableNodeTypes(getUniqueNodeTypes(parsedNodes));
        setDecisionPoints(extractDecisionPoints(parsedNodes));
        setParsed(true);
    }, [patternData, setNodes, setEdges, setAvailableNodeTypes, viewportKey]);

    // Search & filter
    const isSearchActive = searchTerm !== '' || typeFilter !== '';
    const isDecisionActive = isDecisionFilterActive(decisionSelections);

    useEffect(() => {
        if (!isSearchActive && !isDecisionActive) {
            setNodes((nds) => nds.map((n) => ({ ...n, style: { ...n.style, opacity: undefined } })));
            setEdges((eds) => eds.map((e) => ({ ...e, style: { ...e.style, opacity: undefined } })));
            return;
        }

        const srcNodes = sourceNodesRef.current;
        const srcEdges = sourceEdgesRef.current;

        const searchVisibleNodeIds = isSearchActive ? getMatchingNodeIds(srcNodes, searchTerm, typeFilter) : null;
        const decisionVisibleNodeIds = getVisibleNodeIds(srcNodes, decisionPoints, decisionSelections);

        // Intersect: a node is visible if it passes both filters (null = no constraint)
        const finalVisibleNodeIds = new Set<string>();
        for (const node of srcNodes) {
            const inSearch = searchVisibleNodeIds === null || searchVisibleNodeIds.has(node.id);
            const inDecision = decisionVisibleNodeIds === null || decisionVisibleNodeIds.has(node.id);
            if (inSearch && inDecision) {
                finalVisibleNodeIds.add(node.id);
            }
        }

        setNodes((nds) =>
            nds.map((n) => ({
                ...n,
                style: { ...n.style, opacity: finalVisibleNodeIds.has(n.id) ? 1 : 0.15 },
            }))
        );

        const decisionVisibleEdgeIds = isDecisionActive && decisionVisibleNodeIds
            ? getVisibleEdgeIds(srcEdges, decisionVisibleNodeIds, decisionPoints, decisionSelections)
            : null;

        setEdges((eds) =>
            eds.map((e) => {
                const searchVisible = searchVisibleNodeIds === null || isEdgeVisible(e, searchVisibleNodeIds);
                const decisionVisible = decisionVisibleEdgeIds === null || decisionVisibleEdgeIds.has(e.id);
                return {
                    ...e,
                    style: { ...e.style, opacity: searchVisible && decisionVisible ? 1 : 0.1 },
                };
            })
        );
    }, [searchTerm, typeFilter, isSearchActive, isDecisionActive, decisionSelections, decisionPoints, setNodes, setEdges]);

    const handleDecisionSelectionChange = useCallback(
        (groupId: string, selectedIndices: number[]) => {
            setDecisionSelections((prev) => {
                const next = new Map(prev);
                if (selectedIndices.length === 0) {
                    next.delete(groupId);
                } else {
                    next.set(groupId, selectedIndices);
                }
                return next;
            });
        },
        []
    );

    const handleDecisionReset = useCallback(() => {
        setDecisionSelections(new Map());
    }, []);

    if (nodes.length === 0) {
        const emptyState = <EmptyGraphState message="No pattern data to display. Load a CALM pattern to visualize." />;
        // A chromeless render of a genuinely empty document must still signal ready,
        // otherwise calm-server waits out its full render timeout for nothing.
        return chromeless && parsed ? (
            <div style={{ height: '100%', width: '100%' }} data-render-ready="true">
                {emptyState}
            </div>
        ) : (
            emptyState
        );
    }

    return (
        <div style={{ height: '100%', width: '100%' }} data-render-ready={renderReady ? 'true' : undefined}>
            <ReactFlow
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
                fitView={chromeless || !savedViewport}
                defaultViewport={chromeless ? undefined : savedViewport}
                fitViewOptions={chromeless ? CHROMELESS_FIT_VIEW_OPTIONS : { padding: 0.2 }}
                attributionPosition="bottom-left"
                style={{ background: THEME.colors.background }}
            >
                {/* Dot colour lives in index.css — see ArchitectureGraph. */}
                <Background gap={16} />
                {chromeless && <RenderReadySignal onReady={markRenderReady} />}
                {!chromeless && !isMobile && (
                    <Controls
                        style={{
                            background: THEME.colors.card,
                            border: `1px solid ${THEME.colors.border}`,
                            borderRadius: '8px',
                        }}
                    />
                )}
                {!chromeless && !isMobile && (
                    <MiniMap
                        className="calm-minimap-mask-base"
                        style={{
                            background: THEME.colors.backgroundSecondary,
                            border: `1px solid ${THEME.colors.border}`,
                        }}
                        nodeColor={THEME.colors.accent}
                    />
                )}
                {!chromeless && (
                    <Panel position="top-left">
                        <DecisionSelectorPanel
                            decisionPoints={decisionPoints}
                            selections={decisionSelections}
                            onSelectionChange={handleDecisionSelectionChange}
                            onReset={handleDecisionReset}
                        />
                    </Panel>
                )}
                {!chromeless && !externalSearch && (
                <Panel position="top-right">
                    <SearchBar
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        typeFilter={typeFilter}
                        onTypeFilterChange={setTypeFilter}
                        nodeTypes={availableNodeTypes}
                    />
                </Panel>
                )}
            </ReactFlow>
        </div>
    );
}
