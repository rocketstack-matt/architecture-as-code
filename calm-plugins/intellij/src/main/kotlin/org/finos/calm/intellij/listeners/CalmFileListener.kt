package org.finos.calm.intellij.listeners

import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.openapi.vfs.VirtualFileEvent
import com.intellij.openapi.vfs.VirtualFileListener
import com.intellij.openapi.wm.ToolWindowManager
import org.finos.calm.intellij.services.CalmModelService
import org.finos.calm.intellij.toolwindow.CalmToolWindow

class CalmFileListener(private val project: Project) : VirtualFileListener {
    
    override fun contentsChanged(event: VirtualFileEvent) {
        val file = event.file
        if (isCalmFile(file)) {
            updateToolWindow(file)
        }
    }
    
    override fun fileCreated(event: VirtualFileEvent) {
        val file = event.file
        if (isCalmFile(file)) {
            updateToolWindow(file)
        }
    }
    
    private fun isCalmFile(file: VirtualFile): Boolean {
        val calmModelService = project.getService(CalmModelService::class.java)
        return calmModelService.isCalmFile(file)
    }
    
    private fun updateToolWindow(file: VirtualFile) {
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow("CALM")
        if (toolWindow?.isVisible == true) {
            // TODO: Implement tool window refresh
            // This would update the tree view with the new model
        }
    }
}