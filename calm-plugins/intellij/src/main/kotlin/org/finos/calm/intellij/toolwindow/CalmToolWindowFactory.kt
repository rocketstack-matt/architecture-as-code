package org.finos.calm.intellij.toolwindow

import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory

class CalmToolWindowFactory : ToolWindowFactory, DumbAware {
    
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val calmToolWindow = CalmToolWindow(project)
        val content = ContentFactory.getInstance().createContent(
            calmToolWindow.getContent(), 
            "", 
            false
        )
        toolWindow.contentManager.addContent(content)
    }
    
    override fun shouldBeAvailable(project: Project): Boolean = true
}