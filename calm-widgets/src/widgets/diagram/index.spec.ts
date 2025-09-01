import { describe, it, expect } from 'vitest';
import { DiagramWidget } from './index';

describe('DiagramWidget', () => {
    describe('validateContext', () => {
        it('should return true for valid CALM model context', () => {
            const validContext = {
                nodes: [
                    {
                        'unique-id': 'node1',
                        'node-type': 'service',
                        name: 'Service 1',
                        description: 'A test service'
                    }
                ],
                relationships: [
                    {
                        'unique-id': 'rel1',
                        'relationship-type': {
                            'connects': {
                                source: { node: 'node1', interfaces: [] },
                                destination: { node: 'node2', interfaces: [] }
                            }
                        }
                    }
                ]
            };

            expect(DiagramWidget.validateContext(validContext)).toBe(true);
        });

        it('should return true for empty CALM model', () => {
            expect(DiagramWidget.validateContext({})).toBe(true);
        });

        it('should return false for null or non-object', () => {
            expect(DiagramWidget.validateContext(null)).toBe(false);
            expect(DiagramWidget.validateContext('string')).toBe(false);
            expect(DiagramWidget.validateContext(123)).toBe(false);
        });

        it('should return false for invalid nodes array', () => {
            const invalidContext = {
                nodes: [
                    {
                        'unique-id': 'node1',
                        // missing name
                        'node-type': 'service'
                    }
                ]
            };

            expect(DiagramWidget.validateContext(invalidContext)).toBe(false);
        });

        it('should return false for invalid relationships array', () => {
            const invalidContext = {
                relationships: [
                    {
                        'unique-id': 'rel1'
                        // missing relationship-type
                    }
                ]
            };

            expect(DiagramWidget.validateContext(invalidContext)).toBe(false);
        });
    });

    describe('transformToViewModel', () => {
        it('should transform simple CALM model to graph structure', () => {
            const context = {
                nodes: [
                    {
                        'unique-id': 'service1',
                        'node-type': 'service',
                        name: 'Auth Service',
                        description: 'Authentication service'
                    },
                    {
                        'unique-id': 'service2',
                        'node-type': 'service',
                        name: 'User Service',
                        description: 'User management service'
                    }
                ],
                relationships: [
                    {
                        'unique-id': 'connection1',
                        'relationship-type': {
                            'connects': {
                                source: { node: 'service1', interfaces: [] },
                                destination: { node: 'service2', interfaces: [] }
                            }
                        },
                        description: 'Auth connects to User service'
                    }
                ]
            };

            const result = DiagramWidget.transformToViewModel!(context, {});

            expect(result.nodes).toHaveLength(2);
            expect(result.edges).toHaveLength(1);
            
            expect(result.nodes[0]).toEqual({
                id: 'service1',
                label: 'Auth Service',
                type: 'service',
                description: 'Authentication service',
                parent: undefined,
                raw: context.nodes[0]
            });

            expect(result.edges[0]).toEqual({
                id: 'connection1',
                source: 'service1',
                target: 'service2',
                label: 'Auth connects to User service',
                type: 'connects',
                description: 'Auth connects to User service',
                raw: context.relationships[0]
            });
        });

        it('should handle containment relationships', () => {
            const context = {
                nodes: [
                    {
                        'unique-id': 'system1',
                        'node-type': 'system',
                        name: 'Banking System'
                    },
                    {
                        'unique-id': 'service1',
                        'node-type': 'service',
                        name: 'Auth Service'
                    }
                ],
                relationships: [
                    {
                        'unique-id': 'composition1',
                        'relationship-type': {
                            'composed-of': {
                                container: 'system1',
                                nodes: ['service1']
                            }
                        }
                    }
                ]
            };

            const result = DiagramWidget.transformToViewModel!(context, {});

            expect(result.nodes).toHaveLength(2);
            expect(result.edges).toHaveLength(0); // containment relationships are not rendered as edges
            
            const service = result.nodes.find(n => n.id === 'service1');
            expect(service?.parent).toBe('system1');
        });

        it('should filter nodes when nodeFilter is provided', () => {
            const context = {
                nodes: [
                    {
                        'unique-id': 'service1',
                        'node-type': 'service',
                        name: 'Auth Service'
                    },
                    {
                        'unique-id': 'service2',
                        'node-type': 'service',
                        name: 'User Service'
                    },
                    {
                        'unique-id': 'service3',
                        'node-type': 'service',
                        name: 'Payment Service'
                    }
                ],
                relationships: [
                    {
                        'unique-id': 'connection1',
                        'relationship-type': {
                            'connects': {
                                source: { node: 'service1', interfaces: [] },
                                destination: { node: 'service2', interfaces: [] }
                            }
                        }
                    },
                    {
                        'unique-id': 'connection2',
                        'relationship-type': {
                            'connects': {
                                source: { node: 'service2', interfaces: [] },
                                destination: { node: 'service3', interfaces: [] }
                            }
                        }
                    }
                ]
            };

            const result = DiagramWidget.transformToViewModel!(context, {
                hash: { nodes: ['service1'] }
            });

            // Should include service1 and service2 (transitively connected)
            expect(result.nodes).toHaveLength(2);
            expect(result.edges).toHaveLength(1);
            expect(result.filteredNodeIds).toBeTruthy();
            expect(result.filteredNodeIds!.has('service1')).toBe(true);
            expect(result.filteredNodeIds!.has('service2')).toBe(true);
            expect(result.filteredNodeIds!.has('service3')).toBe(false);
        });

        it('should handle flows', () => {
            const context = {
                flows: [
                    {
                        'unique-id': 'flow1',
                        source: 'service1',
                        target: 'service2',
                        description: 'Data flow from service1 to service2'
                    }
                ]
            };

            const result = DiagramWidget.transformToViewModel!(context, {});

            expect(result.edges).toHaveLength(1);
            expect(result.edges[0]).toEqual({
                id: 'flow1',
                source: 'service1',
                target: 'service2',
                label: 'Data flow from service1 to service2',
                type: 'flow',
                description: 'Data flow from service1 to service2',
                raw: context.flows[0]
            });
        });
    });

    describe('registerHelpers', () => {
        it('should register helper functions', () => {
            const helpers = DiagramWidget.registerHelpers!();
            
            expect(helpers).toHaveProperty('add');
            expect(helpers).toHaveProperty('multiply');
            expect(helpers).toHaveProperty('subtract');
            expect(helpers).toHaveProperty('getNodeX');
            expect(helpers).toHaveProperty('getNodeY');
            expect(helpers).toHaveProperty('midPointX');
            expect(helpers).toHaveProperty('midPointY');
            expect(helpers).toHaveProperty('arrayFromSet');
            
            // Test arithmetic helpers
            expect(helpers.add(5, 3)).toBe(8);
            expect(helpers.multiply(4, 2)).toBe(8);
            expect(helpers.subtract(10, 3)).toBe(7);
            
            // Test midpoint helpers
            expect(helpers.midPointX(0, 100)).toBe(50);
            expect(helpers.midPointY(0, 200)).toBe(100);
            
            // Test array from set
            const testSet = new Set(['a', 'b', 'c']);
            const array = helpers.arrayFromSet(testSet);
            expect(array).toEqual(['a', 'b', 'c']);
        });
    });
});