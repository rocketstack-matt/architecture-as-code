package org.finos.calm.intellij.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.ui.Messages
import org.finos.calm.intellij.services.CalmModelService

class OpenPreviewAction : AnAction() {
    
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val file = e.getData(CommonDataKeys.VIRTUAL_FILE) ?: return
        
        val calmModelService = project.getService(CalmModelService::class.java)
        
        if (!calmModelService.isCalmFile(file)) {
            Messages.showWarningDialog(
                project,
                "This file does not appear to be a CALM model.",
                "CALM Preview"
            )
            return
        }
        
        // Open file in CALM preview editor
        val fileEditorManager = FileEditorManager.getInstance(project)
        fileEditorManager.openFile(file, true)
    }
    
    override fun update(e: AnActionEvent) {
        val project = e.project
        val file = e.getData(CommonDataKeys.VIRTUAL_FILE)
        
        e.presentation.isEnabledAndVisible = project != null && file != null && 
                !file.isDirectory && file.extension?.lowercase() in listOf("json", "yaml", "yml")
    }
}