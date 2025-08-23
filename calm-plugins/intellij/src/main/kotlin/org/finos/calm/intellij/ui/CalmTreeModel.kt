package org.finos.calm.intellij.ui

import org.finos.calm.intellij.model.CalmModel
import org.finos.calm.intellij.model.IndexedElement
import javax.swing.tree.DefaultMutableTreeNode
import javax.swing.tree.DefaultTreeModel

class CalmTreeModel(model: CalmModel) : DefaultTreeModel(createRootNode(model)) {
    
    companion object {
        private fun createRootNode(model: CalmModel): DefaultMutableTreeNode {
            val root = DefaultMutableTreeNode("CALM Model")
            
            // Add Nodes section
            val nodesNode = DefaultMutableTreeNode("Nodes (${model.nodes.size})")
            model.nodes.forEach { node ->
                val nodeElement = IndexedElement(node.effectiveId(), node.effectiveLabel())
                nodesNode.add(DefaultMutableTreeNode(nodeElement))
            }
            root.add(nodesNode)
            
            // Add Relationships section
            val relationshipsNode = DefaultMutableTreeNode("Relationships (${model.relationships.size})")
            model.relationships.forEach { relationship ->
                val relElement = IndexedElement(
                    relationship.effectiveId(), 
                    "${relationship.effectiveLabel()} (${relationship.source} → ${relationship.target})"
                )
                relationshipsNode.add(DefaultMutableTreeNode(relElement))
            }
            root.add(relationshipsNode)
            
            // Add Flows section
            val flowsNode = DefaultMutableTreeNode("Flows (${model.flows.size})")
            model.flows.forEach { flow ->
                val flowElement = IndexedElement(
                    flow.effectiveId(), 
                    "${flow.effectiveLabel()} (${flow.source} → ${flow.target})"
                )
                flowsNode.add(DefaultMutableTreeNode(flowElement))
            }
            root.add(flowsNode)
            
            return root
        }
    }
}