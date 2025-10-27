/* eslint-disable  @typescript-eslint/no-explicit-any */
import {CalmTemplateTransformer} from '../../../template/types';
import {CalmRelationshipGraph} from '../../graphing/relationship-graph';
import {C4Model} from '../../graphing/c4';
import {FlowSequenceHelper} from '../../graphing/flow-sequence-helper';
import {ControlRegistry} from '../../graphing/control-registry';
import {CalmCore} from '../../../model/core';

export default class DocusaurusTransformer implements CalmTemplateTransformer {
    getTransformedModel(architecture: CalmCore) {

        const graph = new CalmRelationshipGraph(architecture.relationships);
        const flowHelper = new FlowSequenceHelper();

        const nodes = architecture.nodes.map(node => ({
            ...node,
            id: node.uniqueId,
            title: node.name,
            description: node.description || 'No description available.',
            nodeType: node.nodeType || 'unknown',
            relatedRelationships: graph.getRelatedRelationships(node.uniqueId),
            relatedNodes: graph.getRelatedNodes(node.uniqueId)
        }));


        const flows = architecture.flows?.map(flow => {
            const transformedTransitions = flowHelper.transformFlowTransitions(flow.transitions, architecture);

            return {
                ...flow,
                title: flow.name,
                id: flow.uniqueId,
                transitions: transformedTransitions
            };
        });

        const relationships = architecture.relationships.map(rel => ({
            ...rel,
            id: rel.uniqueId,
            title: rel.uniqueId,
            relationshipType: rel.relationshipType
        }));

        const metadata = architecture.metadata;

        const controlRegistry = new ControlRegistry(architecture);
        controlRegistry.processControls();

        const controls = controlRegistry.getControls();
        const controlReqs = controlRegistry.getControlRequirements();
        const groupedByDomainRequirements = controlRegistry.getGroupedByDomainRequirements();
        const groupedByDomainConfigurations = controlRegistry.getGroupedByDomainConfigurations();
        const controlConfigurations = controlRegistry.getControlConfigurations();

        const C4model = new C4Model(architecture);
        const adrs = architecture.adrs;

        return {
            nodes,
            relationships,
            flows,
            controls,
            controlReqs,
            C4model,
            metadata,
            adrs,
            docs: {
                nodes,
                flows,
                controls,
                relationships,
                controlReqs,
                groupedByDomainRequirements,
                groupedByDomainConfigurations,
                C4model,
                controlConfigurations,
                metadata,
                adrs
            }
        };
    }


    registerTemplateHelpers(): Record<string, (...args: unknown[]) => unknown> {
        return {
            eq: (a, b) => a === b,
            lookup: (obj, key: any) => obj?.[key],
            json: (obj) => JSON.stringify(obj, null, 2),
            instanceOf: (value, className: string) => value?.constructor?.name === className,
            kebabToTitleCase: (str: string) => str
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' '),
            kebabCase: (str: string) => str
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric characters with hyphens
                .replace(/^-+|-+$/g, ''), // Remove leading or trailing hyphens
            isObject: (value: unknown) => typeof value === 'object' && value !== null && !Array.isArray(value),
            isArray: (value: unknown) => Array.isArray(value),
            notEmpty: (value: unknown): boolean => {
                if (value == null) return false;

                if (Array.isArray(value)) return value.length > 0;

                if (typeof value === 'object') {
                    // Handles plain objects or maps
                    if (value instanceof Map || value instanceof Set) return value.size > 0;
                    return Object.keys(value).length > 0;
                }

                if (typeof value === 'string') return value.trim().length > 0;

                return Boolean(value); // Fallback
            },
            or: (...args: unknown[]) => {
                const actualArgs = args.slice(0, -1);
                return actualArgs.some(Boolean);
            },
            eachInMap: (map: Record<string, any>, options: any) => {
                let result = '';
                for (const key in map) {
                    if (Object.prototype.hasOwnProperty.call(map, key)) {
                        const context = map[key];
                        context.key = key;
                        result += options.fn(context); // pass context with key added
                    }
                }
                return result;
            },
            renderC4Node: (nodeId: string, elements: Record<string, any>, depth: number, options?: any): string => {
                // Handle Handlebars options object if passed
                const actualDepth = typeof depth === 'number' ? depth : 0;

                const node = elements[nodeId];
                if (!node) return '';

                const indent = '    '.repeat(actualDepth + 2); // Base indent is 2 (inside deployment node)
                let result = '';

                // Helper function for recursive rendering
                const renderNode = (id: string, currentDepth: number): string => {
                    const currentNode = elements[id];
                    if (!currentNode) return '';

                    const currentIndent = '    '.repeat(currentDepth + 2);
                    let output = '';

                    // Render Person nodes
                    if (currentNode.elementType === 'Person') {
                        output += `${currentIndent}Person(${currentNode.uniqueId}, "${currentNode.name}", "${currentNode.description}")\n`;
                    }
                    // Render nodes with children as Deployment_Node
                    else if (currentNode.children && currentNode.children.length > 0) {
                        output += `${currentIndent}Deployment_Node(${currentNode.uniqueId}, "${currentNode.name}", "${currentNode.description}"){\n`;

                        // Recursively render children
                        for (const childId of currentNode.children) {
                            output += renderNode(childId, currentDepth + 1);
                        }

                        output += `${currentIndent}}\n`;
                    }
                    // Render leaf nodes as Container
                    else {
                        output += `${currentIndent}Container(${currentNode.uniqueId}, "${currentNode.name}", "", "${currentNode.description}")\n`;
                    }

                    return output;
                };

                result = renderNode(nodeId, actualDepth);
                return result;
            }
        };
    }

}
