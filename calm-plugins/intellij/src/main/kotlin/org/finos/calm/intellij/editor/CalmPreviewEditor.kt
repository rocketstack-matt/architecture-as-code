package org.finos.calm.intellij.editor

import com.intellij.codeHighlighting.BackgroundEditorHighlighter
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorLocation
import com.intellij.openapi.fileEditor.FileEditorState
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.UserDataHolderBase
import com.intellij.openapi.vfs.VirtualFile
import org.finos.calm.intellij.services.CalmModelService
import org.finos.calm.intellij.ui.CalmGraphPanel
import java.beans.PropertyChangeListener
import javax.swing.JComponent

class CalmPreviewEditor(
    private val project: Project,
    private val file: VirtualFile
) : UserDataHolderBase(), FileEditor {
    
    private val calmModelService = project.getService(CalmModelService::class.java)
    private val graphPanel = CalmGraphPanel(project)
    
    init {
        updateModel()
    }
    
    private fun updateModel() {
        try {
            val content = String(file.contentsToByteArray())
            val model = calmModelService.loadCalmModel(content)
            if (model != null) {
                graphPanel.updateModel(model)
            }
        } catch (e: Exception) {
            // Handle error
        }
    }
    
    override fun getComponent(): JComponent = graphPanel
    
    override fun getPreferredFocusedComponent(): JComponent = graphPanel
    
    override fun getName(): String = "CALM Preview"
    
    override fun setState(state: FileEditorState) {}
    
    override fun isModified(): Boolean = false
    
    override fun isValid(): Boolean = file.isValid
    
    override fun addPropertyChangeListener(listener: PropertyChangeListener) {}
    
    override fun removePropertyChangeListener(listener: PropertyChangeListener) {}
    
    override fun getCurrentLocation(): FileEditorLocation? = null
    
    override fun getBackgroundHighlighter(): BackgroundEditorHighlighter? = null
    
    override fun dispose() {}
}