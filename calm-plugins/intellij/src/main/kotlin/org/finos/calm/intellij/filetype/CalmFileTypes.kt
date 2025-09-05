package org.finos.calm.intellij.filetype

import com.intellij.openapi.fileTypes.FileType
import com.intellij.openapi.vfs.VirtualFile
import javax.swing.Icon

class CalmJsonFileType : FileType {
    companion object {
        val INSTANCE = CalmJsonFileType()
    }
    
    override fun getName(): String = "CALM JSON"
    override fun getDescription(): String = "CALM Architecture Model (JSON)"
    override fun getDefaultExtension(): String = "json"
    override fun getIcon(): Icon? = null // TODO: Add icon
    override fun isBinary(): Boolean = false
    override fun isReadOnly(): Boolean = false
}

class CalmYamlFileType : FileType {
    companion object {
        val INSTANCE = CalmYamlFileType()
    }
    
    override fun getName(): String = "CALM YAML"
    override fun getDescription(): String = "CALM Architecture Model (YAML)"
    override fun getDefaultExtension(): String = "yaml"
    override fun getIcon(): Icon? = null // TODO: Add icon
    override fun isBinary(): Boolean = false
    override fun isReadOnly(): Boolean = false
}