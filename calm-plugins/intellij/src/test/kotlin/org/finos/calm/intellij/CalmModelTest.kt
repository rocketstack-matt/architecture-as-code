package org.finos.calm.intellij

import org.finos.calm.intellij.model.CalmModel
import org.finos.calm.intellij.model.CalmNode
import org.finos.calm.intellij.model.CalmRelationship
import org.finos.calm.intellij.model.CalmFlow
import org.junit.Test
import org.junit.Assert.*

class CalmModelTest {
    
    @Test
    fun testEmptyModel() {
        val model = CalmModel()
        assertTrue(model.nodes.isEmpty())
        assertTrue(model.relationships.isEmpty())
        assertTrue(model.flows.isEmpty())
    }
    
    @Test
    fun testNodeEffectiveMethods() {
        val node = CalmNode(
            id = "test-node",
            type = "service",
            label = "Test Service"
        )
        
        assertEquals("test-node", node.effectiveId())
        assertEquals("service", node.effectiveType())
        assertEquals("Test Service", node.effectiveLabel())
    }
    
    @Test
    fun testNodeWithUniqueId() {
        val node = CalmNode(
            id = "",
            uniqueId = "unique-test-node",
            name = "Test Node Name"
        )
        
        assertEquals("unique-test-node", node.effectiveId())
        assertEquals("Test Node Name", node.effectiveLabel())
    }
    
    @Test
    fun testRelationshipEffectiveMethods() {
        val relationship = CalmRelationship(
            id = "test-rel",
            type = "connects",
            source = "node1",
            target = "node2",
            label = "Connection"
        )
        
        assertEquals("test-rel", relationship.effectiveId())
        assertEquals("connects", relationship.effectiveType())
        assertEquals("Connection", relationship.effectiveLabel())
    }
    
    @Test
    fun testFlowEffectiveMethods() {
        val flow = CalmFlow(
            id = "test-flow",
            source = "node1",
            target = "node2",
            label = "Data Flow"
        )
        
        assertEquals("test-flow", flow.effectiveId())
        assertEquals("Data Flow", flow.effectiveLabel())
    }
}