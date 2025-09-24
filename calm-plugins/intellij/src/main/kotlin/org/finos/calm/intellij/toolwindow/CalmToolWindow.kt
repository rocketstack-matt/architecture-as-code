package org.finos.calm.intellij.toolwindow

import com.intellij.openapi.editor.Editor
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.treeStructure.Tree
import org.finos.calm.intellij.model.CalmModel
import org.finos.calm.intellij.model.IndexedElement
import org.finos.calm.intellij.model.ModelIndex
import org.finos.calm.intellij.services.CalmModelService
import org.finos.calm.intellij.ui.CalmTreeModel
import java.awt.BorderLayout
import javax.swing.JPanel
import javax.swing.tree.DefaultMutableTreeNode
import javax.swing.tree.TreeSelectionModel

class CalmToolWindow(private val project: Project) {
    
    private val calmModelService = project.getService(CalmModelService::class.java)
    private val tree = Tree()
    private val panel = JPanel(BorderLayout())
    
    init {
        tree.selectionModel.selectionMode = TreeSelectionModel.SINGLE_TREE_SELECTION
        tree.addTreeSelectionListener { handleTreeSelection() }
        
        panel.add(JBScrollPane(tree), BorderLayout.CENTER)
        
        updateModel(null)
    }
    
    fun getContent(): JPanel = panel
    
    fun updateModel(model: CalmModel?) {
        val treeModel = if (model != null) {
            CalmTreeModel(model)
        } else {
            CalmTreeModel(CalmModel()) // Empty model
        }
        tree.model = treeModel
        tree.expandRow(0) // Expand root
        for (i in 1 until tree.rowCount) {
            tree.expandRow(i) // Expand category nodes
        }
    }
    
    private fun handleTreeSelection() {
        val selectedNode = tree.lastSelectedPathComponent as? DefaultMutableTreeNode
        val userObject = selectedNode?.userObject
        
        if (userObject is IndexedElement && userObject.textRange != null) {
            navigateToTextRange(userObject.textRange)
        }
    }
    
    private fun navigateToTextRange(range: IntRange) {
        val editor = getCurrentEditor() ?: return
        val document = editor.document
        
        if (range.first >= 0 && range.last < document.textLength) {
            editor.caretModel.moveToOffset(range.first)
            editor.scrollingModel.scrollToCaret(com.intellij.openapi.editor.ScrollType.CENTER)
            editor.selectionModel.setSelection(range.first, range.last + 1)
        }
    }
    
    private fun getCurrentEditor(): Editor? {
        val fileEditorManager = FileEditorManager.getInstance(project)
        return fileEditorManager.selectedTextEditor
    }
}