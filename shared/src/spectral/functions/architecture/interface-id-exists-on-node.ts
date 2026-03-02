import { JSONPath } from 'jsonpath-plus';
import { difference } from 'lodash';

/**
 * Checks that the input value exists as an interface with matching unique ID defined under a node in the document.
 * Supports both "interface" (singular string) and "interfaces" (array) forms in connects relationships.
 */
export function interfaceIdExistsOnNode(input, _, context) {
    if (!input) {
        return [];
    }

    // Support both "interface" (singular string) and "interfaces" (array) forms
    const desiredInterfaces: string[] = [];
    if (input.interfaces && Array.isArray(input.interfaces)) {
        desiredInterfaces.push(...input.interfaces);
    }
    if (typeof input.interface === 'string') {
        desiredInterfaces.push(input.interface);
    }

    if (desiredInterfaces.length === 0) {
        return [];
    }

    if (!input.node) {
        return [{
            message: 'Invalid connects relationship - no node defined.',
            path: [...context.path]
        }];
    }

    const nodeId = input.node;
    const nodeMatch: object[] = JSONPath({ path: `$.nodes[?(@['unique-id'] == '${nodeId}')]`, json: context.document.data });
    if (!nodeMatch || nodeMatch.length === 0) {
        // other rule will report undefined node
        return [];
    }

    // all of these must be present on the referenced node

    const node = nodeMatch[0];

    const nodeInterfaces = JSONPath({ path: '$.interfaces[*].unique-id', json: node });
    if (!nodeInterfaces || nodeInterfaces.length === 0) {
        return [
            { message: `Node with unique-id ${nodeId} has no interfaces defined, expected interfaces [${desiredInterfaces}].` }
        ];
    }

    const missingInterfaces = difference(desiredInterfaces, nodeInterfaces);

    // difference always returns an array
    if (missingInterfaces.length === 0) {
        return [];
    }
    const results = [];

    for (const missing of missingInterfaces) {
        results.push({
            message: `Referenced interface with ID '${missing}' was not defined on the node with ID '${nodeId}'.`,
            path: [...context.path]
        });
    }
    return results;
}