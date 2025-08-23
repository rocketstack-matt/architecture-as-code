package org.finos.calm.intellij.ui

import com.intellij.openapi.project.Project
import com.intellij.ui.components.JBScrollPane
import org.finos.calm.intellij.model.CalmModel
import java.awt.BorderLayout
import java.awt.Graphics
import java.awt.Graphics2D
import java.awt.RenderingHints
import javax.swing.JPanel
import javax.swing.JTextArea

class CalmGraphPanel(private val project: Project) : JPanel(BorderLayout()) {
    
    private val graphArea = GraphVisualizationPanel()
    private val textArea = JTextArea()
    
    init {
        textArea.isEditable = false
        textArea.text = "CALM Graph Preview\n\nTo view graph visualization, a proper graph library integration is needed.\nThis is a placeholder showing the model structure as text."
        
        add(JBScrollPane(graphArea), BorderLayout.CENTER)
        add(JBScrollPane(textArea), BorderLayout.SOUTH)
    }
    
    fun updateModel(model: CalmModel) {
        graphArea.updateModel(model)
        
        val sb = StringBuilder()
        sb.append("CALM Model Contents:\n\n")
        
        sb.append("Nodes (${model.nodes.size}):\n")
        model.nodes.forEach { node ->
            sb.append("  - ${node.effectiveLabel()} (${node.effectiveId()})\n")
        }
        
        sb.append("\nRelationships (${model.relationships.size}):\n")
        model.relationships.forEach { rel ->
            sb.append("  - ${rel.effectiveLabel()}: ${rel.source} → ${rel.target}\n")
        }
        
        sb.append("\nFlows (${model.flows.size}):\n")
        model.flows.forEach { flow ->
            sb.append("  - ${flow.effectiveLabel()}: ${flow.source} → ${flow.target}\n")
        }
        
        textArea.text = sb.toString()
    }
    
    private class GraphVisualizationPanel : JPanel() {
        private var model: CalmModel? = null
        
        fun updateModel(model: CalmModel) {
            this.model = model
            repaint()
        }
        
        override fun paintComponent(g: Graphics) {
            super.paintComponent(g)
            val g2d = g as Graphics2D
            g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
            
            val model = this.model ?: return
            
            // Simple text-based visualization as placeholder
            val fm = g2d.fontMetrics
            var y = 30
            
            g2d.drawString("CALM Model Graph Visualization", 10, y)
            y += fm.height + 10
            
            g2d.drawString("Nodes:", 10, y)
            y += fm.height + 5
            
            model.nodes.forEach { node ->
                g2d.drawString("  • ${node.effectiveLabel()}", 20, y)
                y += fm.height + 2
            }
            
            y += 10
            g2d.drawString("Relationships:", 10, y)
            y += fm.height + 5
            
            model.relationships.forEach { rel ->
                g2d.drawString("  • ${rel.source} → ${rel.target} (${rel.effectiveType()})", 20, y)
                y += fm.height + 2
            }
            
            // Note: For a real implementation, you would integrate with a graph library
            // like JGraphX, JUNG, or embed a web view with Cytoscape.js
        }
    }
}