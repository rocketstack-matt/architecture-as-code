package org.finos.calm.intellij.settings

import com.intellij.openapi.options.Configurable
import com.intellij.openapi.ui.ComboBox
import com.intellij.ui.components.JBCheckBox
import com.intellij.ui.components.JBTextField
import java.awt.GridBagConstraints
import java.awt.GridBagLayout
import javax.swing.JComponent
import javax.swing.JLabel
import javax.swing.JPanel

class CalmSettingsConfigurable : Configurable {
    
    private var settingsPanel: JPanel? = null
    private var autoOpenCheckbox: JBCheckBox? = null
    private var layoutComboBox: ComboBox<String>? = null
    private var showLabelsCheckbox: JBCheckBox? = null
    private var fileGlobsField: JBTextField? = null
    
    override fun getDisplayName(): String = "CALM"
    
    override fun createComponent(): JComponent {
        settingsPanel = JPanel(GridBagLayout())
        val gbc = GridBagConstraints()
        
        // Auto-open preview setting
        gbc.gridx = 0; gbc.gridy = 0; gbc.anchor = GridBagConstraints.WEST
        settingsPanel!!.add(JLabel("Auto-open preview:"), gbc)
        
        gbc.gridx = 1
        autoOpenCheckbox = JBCheckBox("Automatically open CALM preview when opening CALM files")
        settingsPanel!!.add(autoOpenCheckbox!!, gbc)
        
        // Layout setting
        gbc.gridx = 0; gbc.gridy = 1
        settingsPanel!!.add(JLabel("Default layout:"), gbc)
        
        gbc.gridx = 1
        layoutComboBox = ComboBox(arrayOf("dagre", "fcose", "cose"))
        settingsPanel!!.add(layoutComboBox!!, gbc)
        
        // Show labels setting
        gbc.gridx = 0; gbc.gridy = 2
        settingsPanel!!.add(JLabel("Show labels:"), gbc)
        
        gbc.gridx = 1
        showLabelsCheckbox = JBCheckBox("Show labels by default in graph view")
        settingsPanel!!.add(showLabelsCheckbox!!, gbc)
        
        // File globs setting
        gbc.gridx = 0; gbc.gridy = 3
        settingsPanel!!.add(JLabel("File patterns:"), gbc)
        
        gbc.gridx = 1; gbc.fill = GridBagConstraints.HORIZONTAL; gbc.weightx = 1.0
        fileGlobsField = JBTextField("calm/**/*.json,calm/**/*.yaml,calm/**/*.yml")
        settingsPanel!!.add(fileGlobsField!!, gbc)
        
        return settingsPanel!!
    }
    
    override fun isModified(): Boolean {
        val settings = CalmSettings.getInstance()
        return autoOpenCheckbox?.isSelected != settings.autoOpenPreview ||
                layoutComboBox?.selectedItem != settings.defaultLayout ||
                showLabelsCheckbox?.isSelected != settings.showLabels ||
                fileGlobsField?.text != settings.fileGlobs
    }
    
    override fun apply() {
        val settings = CalmSettings.getInstance()
        settings.autoOpenPreview = autoOpenCheckbox?.isSelected ?: false
        settings.defaultLayout = layoutComboBox?.selectedItem as? String ?: "dagre"
        settings.showLabels = showLabelsCheckbox?.isSelected ?: true
        settings.fileGlobs = fileGlobsField?.text ?: "calm/**/*.json,calm/**/*.yaml,calm/**/*.yml"
    }
    
    override fun reset() {
        val settings = CalmSettings.getInstance()
        autoOpenCheckbox?.isSelected = settings.autoOpenPreview
        layoutComboBox?.selectedItem = settings.defaultLayout
        showLabelsCheckbox?.isSelected = settings.showLabels
        fileGlobsField?.text = settings.fileGlobs
    }
}