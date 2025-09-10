package org.finos.calm.intellij.editor

import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.FileEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import org.finos.calm.intellij.services.CalmModelService

class CalmPreviewEditorProvider : FileEditorProvider, DumbAware {
    
    override fun accept(project: Project, file: VirtualFile): Boolean {
        val calmModelService = project.getService(CalmModelService::class.java)
        return calmModelService.isCalmFile(file)
    }
    
    override fun createEditor(project: Project, file: VirtualFile): FileEditor {
        return CalmPreviewEditor(project, file)
    }
    
    override fun getEditorTypeId(): String = "calm-preview-editor"
    
    override fun getPolicy(): FileEditorPolicy = FileEditorPolicy.PLACE_AFTER_DEFAULT_EDITOR
}