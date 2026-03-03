import { CalmCoreCanonicalModel, CalmNodeCanonicalModel } from '@finos/calm-models/canonical';
import { prettyLabel } from './utils';
import { BlockArchVM, NormalizedOptions, VMContainer, VMLeafNode, VMAttach, VMEdge, VMFlow, VMFlowTransition } from '../types';
import { buildParentHierarchy, ParentHierarchyResult } from './relationship-analyzer';
import { resolveVisibilityWithStrategies, VisibilityResult } from './visibility-resolver';
import { buildContainerForest, pruneEmptyContainers } from './builders/container-builder';
import { buildInterfaceNameMap, buildEdges } from './builders/edge-builder';
import { toVMControls } from './factories/node-factory';

interface ContainerResult {
    containers: VMContainer[];
    attachments: VMAttach[];
    looseNodes: VMLeafNode[];
}

/**
 * Builder class for constructing Block Architecture View Models.
 * Implements the Builder pattern to provide a fluent, step-by-step construction process
 * that can be customized or tested independently.
 */
export class BlockArchVMBuilder {
    private context: CalmCoreCanonicalModel;
    private options: NormalizedOptions;
    private parentHierarchyResult?: ParentHierarchyResult;
    private visibilityResult?: VisibilityResult;
    private containerResult?: ContainerResult;
    private edges?: VMEdge[];

    constructor(context: CalmCoreCanonicalModel, options: NormalizedOptions) {
        this.context = context;
        this.options = options;
    }

    /**
     * Step 1: Analyze relationships and build parent hierarchies
     */
    analyzeRelationships(): this {
        this.parentHierarchyResult = buildParentHierarchy(this.context.relationships ?? []);
        return this;
    }

    /**
     * Step 2: Resolve visibility using the strategy chain
     */
    resolveVisibility(): this {
        if (!this.parentHierarchyResult) {
            throw new Error('Must call analyzeRelationships() first');
        }

        const nodes = this.context.nodes ?? [];
        const nodesById = new Map(nodes.map(n => [n['unique-id'], n] as const));

        this.visibilityResult = resolveVisibilityWithStrategies(
            this.context,
            this.options,
            this.parentHierarchyResult,
            nodesById
        );
        return this;
    }

    /**
     * Step 3: Build container structure
     */
    buildContainers(): this {
        if (!this.visibilityResult || !this.parentHierarchyResult) {
            throw new Error('Must call resolveVisibility() first');
        }

        const filteredNodes = this.visibilityResult.filteredNodes.slice();
        const existingIds = new Set(filteredNodes.map(n => n['unique-id']));
        for (const id of this.visibilityResult.visibleNodes) {
            if (!existingIds.has(id)) {
                const placeholder: CalmNodeCanonicalModel = {
                    'unique-id': id,
                    'node-type': 'unknown',
                    name: prettyLabel(id),
                    description: ''
                };
                filteredNodes.push(placeholder);
            }
        }

        const { containers: initialContainers, attachments, looseNodes: initialLooseNodes } = buildContainerForest(
            filteredNodes,
            this.parentHierarchyResult.parentOf,
            this.visibilityResult.containerIds,
            this.options.renderInterfaces,
            this.options.enrichForReactFlow
        );

        let looseNodes = initialLooseNodes;
        if (this.visibilityResult.containerIds.size > 0 && looseNodes.length > 0) {
            looseNodes = looseNodes.filter(n => !this.visibilityResult!.containerIds.has(n.id));
        }

        const containers = pruneEmptyContainers(initialContainers);

        this.containerResult = { containers, attachments, looseNodes };
        return this;
    }

    /**
     * Step 4: Build edges
     */
    buildEdges(): this {
        if (!this.visibilityResult) {
            throw new Error('Must call resolveVisibility() first');
        }

        const nodes = this.context.nodes ?? [];
        const nodesById = new Map(nodes.map(n => [n['unique-id'], n] as const));
        const ifaceNames = buildInterfaceNameMap(nodes);

        // Build flow transition lookup when enriching for ReactFlow
        let flowTransitionsByRelId: Map<string, VMFlowTransition[]> | undefined;
        if (this.options.enrichForReactFlow && this.context.flows) {
            flowTransitionsByRelId = new Map();
            for (const flow of this.context.flows) {
                for (const t of flow.transitions ?? []) {
                    const relId = t['relationship-unique-id'];
                    if (!flowTransitionsByRelId.has(relId)) {
                        flowTransitionsByRelId.set(relId, []);
                    }
                    flowTransitionsByRelId.get(relId)!.push({
                        flowId: flow['unique-id'],
                        flowName: flow.name,
                        sequenceNumber: t['sequence-number'],
                        description: t.description,
                        direction: t.direction,
                    });
                }
            }
        }

        this.edges = this.options.edges === 'none'
            ? []
            : buildEdges(
                this.visibilityResult.filteredRels,
                this.options.renderInterfaces,
                this.options.edgeLabels,
                this.options.collapseRelationships,
                ifaceNames,
                nodesById,
                this.options.enrichForReactFlow,
                flowTransitionsByRelId
            );
        return this;
    }

    /**
     * Step 5: Finalize view model (sorting and other final transformations)
     */
    finalizeViewModel(): this {
        if (!this.containerResult) {
            throw new Error('Must call buildContainers() first');
        }

        // Sort all view model components alphabetically for stable, predictable layouts
        this.sortViewModel(this.containerResult.containers, this.containerResult.looseNodes);
        return this;
    }

    /**
     * Sorts all view model components alphabetically by label for stable output.
     * Recursively sorts containers and their children, and also sorts loose nodes.
     */
    private sortViewModel(containers: VMContainer[], looseNodes: VMLeafNode[]): void {
        const sortContainers = (c: VMContainer): void => {
            c.nodes.sort((a, b) => a.label.localeCompare(b.label));
            c.containers.sort((a, b) => a.label.localeCompare(b.label));
            c.containers.forEach(sortContainers);
        };

        containers.sort((a, b) => a.label.localeCompare(b.label));
        containers.forEach(sortContainers);
        looseNodes.sort((a, b) => a.label.localeCompare(b.label));
    }

    /**
     * Final step: Build the complete view model
     */
    build(): BlockArchVM {
        if (!this.containerResult || !this.edges || !this.visibilityResult) {
            throw new Error('Must complete all build steps first. Call: analyzeRelationships() -> resolveVisibility() -> buildContainers() -> buildEdges() -> finalizeViewModel()');
        }

        const highlightSet = new Set<string>(this.options.highlightNodes ?? []);
        for (const id of this.options.focusNodes ?? []) highlightSet.add(id);
        const highlightNodeIds = Array.from(highlightSet);

        const vm: BlockArchVM = {
            containers: this.containerResult.containers,
            edges: this.edges,
            attachments: this.containerResult.attachments,
            looseNodes: this.containerResult.looseNodes,
            highlightNodeIds,
            renderNodeTypeShapes: this.options.renderNodeTypeShapes,
            linkPrefix: this.options.linkPrefix,
            linkMap: this.options.linkMap,
            nodeTypeMap: this.options.nodeTypeMap,
            themeColors: this.options.themeColors,
            layoutEngine: this.options.layoutEngine,
            warnings: this.visibilityResult.warnings,
        };

        if (this.options.enrichForReactFlow) {
            // Populate architecture-level flows
            if (this.context.flows && this.context.flows.length > 0) {
                vm.flows = this.context.flows.map(f => {
                    const vmFlow: VMFlow = {
                        id: f['unique-id'],
                        name: f.name,
                        description: f.description,
                        transitions: (f.transitions ?? []).map(t => ({
                            flowId: f['unique-id'],
                            flowName: f.name,
                            sequenceNumber: t['sequence-number'],
                            description: t.description,
                            direction: t.direction,
                        })),
                    };
                    const flowControls = toVMControls(f.controls as Record<string, unknown> | undefined);
                    if (flowControls) vmFlow.controls = flowControls;
                    const flowMetadata = f.metadata as Record<string, unknown> | undefined;
                    if (flowMetadata) vmFlow.metadata = flowMetadata;
                    return vmFlow;
                });
            }

            // Populate architecture-level controls
            const archControls = toVMControls(this.context.controls as Record<string, unknown> | undefined);
            if (archControls) vm.controls = archControls;
        }

        return vm;
    }

    /**
     * Convenience method that executes all steps in sequence
     */
    buildComplete(): BlockArchVM {
        return this
            .analyzeRelationships()
            .resolveVisibility()
            .buildContainers()
            .buildEdges()
            .finalizeViewModel()
            .build();
    }
}

/**
 * Factory function that maintains the original API while using the builder internally
 */
export function buildBlockArchVM(
    context: CalmCoreCanonicalModel,
    opts: NormalizedOptions
): BlockArchVM {
    return new BlockArchVMBuilder(context, opts).buildComplete();
}
