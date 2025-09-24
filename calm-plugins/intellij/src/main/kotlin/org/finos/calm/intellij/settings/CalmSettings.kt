package org.finos.calm.intellij.settings

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.util.xmlb.XmlSerializerUtil

@State(
    name = "CalmSettings",
    storages = [Storage("calm.xml")]
)
class CalmSettings : PersistentStateComponent<CalmSettings> {
    
    var autoOpenPreview: Boolean = false
    var defaultLayout: String = "dagre"
    var showLabels: Boolean = true
    var fileGlobs: String = "calm/**/*.json,calm/**/*.yaml,calm/**/*.yml"
    
    companion object {
        fun getInstance(): CalmSettings {
            return ApplicationManager.getApplication().getService(CalmSettings::class.java)
        }
    }
    
    override fun getState(): CalmSettings = this
    
    override fun loadState(state: CalmSettings) {
        XmlSerializerUtil.copyBean(state, this)
    }
}