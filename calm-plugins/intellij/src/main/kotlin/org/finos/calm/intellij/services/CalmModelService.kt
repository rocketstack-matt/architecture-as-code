package org.finos.calm.intellij.services

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.module.kotlin.KotlinModule
import com.fasterxml.jackson.module.kotlin.readValue
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.thisLogger
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import org.finos.calm.intellij.model.CalmModel
import org.finos.calm.intellij.model.IndexedElement
import org.finos.calm.intellij.model.ModelIndex
import java.util.regex.Pattern

@Service(Service.Level.PROJECT)
class CalmModelService(private val project: Project) {
    
    private val logger = thisLogger()
    private val jsonMapper = ObjectMapper().registerModule(KotlinModule.Builder().build())
    private val yamlMapper = ObjectMapper(YAMLFactory()).registerModule(KotlinModule.Builder().build())
    
    /**
     * Detects if the given file content represents a CALM model
     */
    fun detectCalmModel(content: String): Boolean {
        return try {
            val parsed = parseContent(content)
            parsed != null && (
                parsed.containsKey("nodes") || 
                parsed.containsKey("relationships") || 
                parsed.containsKey("flows")
            )
        } catch (e: Exception) {
            false
        }
    }
    
    /**
     * Loads a CALM model from file content
     */
    fun loadCalmModel(content: String): CalmModel? {
        return try {
            val parsed = parseContent(content) ?: return null
            normalizeModel(parsed)
        } catch (e: Exception) {
            logger.warn("Failed to load CALM model", e)
            null
        }
    }
    
    /**
     * Creates an index of model elements with their text positions
     */
    fun createModelIndex(content: String, model: CalmModel): ModelIndex {
        val idPattern = Pattern.compile("\"(?:id|unique-id)\"\\s*:\\s*\"([^\"]+)\"")
        val yamlIdPattern = Pattern.compile("(?:^|\\s)(?:id|unique-id)\\s*:\\s*([\\w.-]+|\"[^\"]+\"|'[^']+')")
        
        val foundIds = mutableMapOf<String, IntRange>()
        
        // Try JSON pattern first
        var matcher = idPattern.matcher(content)
        while (matcher.find()) {
            val id = matcher.group(1)
            foundIds[id] = matcher.start()..matcher.end()
        }
        
        // Try YAML pattern if no JSON matches found
        if (foundIds.isEmpty()) {
            matcher = yamlIdPattern.matcher(content)
            while (matcher.find()) {
                var id = matcher.group(1)
                if (id.startsWith("\"") || id.startsWith("'")) {
                    id = id.substring(1, id.length - 1)
                }
                foundIds[id] = matcher.start()..matcher.end()
            }
        }
        
        fun createIndexedElements(elements: List<Any>): List<IndexedElement> {
            return elements.mapNotNull { element ->
                when (element) {
                    is org.finos.calm.intellij.model.CalmNode -> {
                        val id = element.effectiveId()
                        IndexedElement(id, element.effectiveLabel(), foundIds[id])
                    }
                    is org.finos.calm.intellij.model.CalmRelationship -> {
                        val id = element.effectiveId()
                        IndexedElement(id, element.effectiveLabel(), foundIds[id])
                    }
                    is org.finos.calm.intellij.model.CalmFlow -> {
                        val id = element.effectiveId()
                        IndexedElement(id, element.effectiveLabel(), foundIds[id])
                    }
                    else -> null
                }
            }
        }
        
        return ModelIndex(
            nodes = createIndexedElements(model.nodes),
            relationships = createIndexedElements(model.relationships),
            flows = createIndexedElements(model.flows)
        )
    }
    
    /**
     * Checks if a virtual file is a potential CALM model file
     */
    fun isCalmFile(file: VirtualFile): Boolean {
        if (!file.isValid || file.isDirectory) return false
        
        val extension = file.extension?.lowercase()
        if (extension !in listOf("json", "yaml", "yml")) return false
        
        return try {
            val content = String(file.contentsToByteArray())
            detectCalmModel(content)
        } catch (e: Exception) {
            false
        }
    }
    
    private fun parseContent(content: String): Map<String, Any>? {
        val trimmed = content.trim()
        if (trimmed.isEmpty()) return null
        
        return try {
            if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
                jsonMapper.readValue<Map<String, Any>>(content)
            } else {
                yamlMapper.readValue<Map<String, Any>>(content)
            }
        } catch (e: Exception) {
            logger.debug("Failed to parse content", e)
            null
        }
    }
    
    private fun normalizeModel(data: Map<String, Any>): CalmModel {
        val nodes = (data["nodes"] as? List<*>)?.mapNotNull { item ->
            (item as? Map<*, *>)?.let { nodeMap ->
                val stringMap = nodeMap.mapKeys { it.key.toString() }.mapValues { it.value?.toString() }
                org.finos.calm.intellij.model.CalmNode(
                    id = stringMap["id"] ?: stringMap["unique-id"] ?: "",
                    uniqueId = stringMap["unique-id"],
                    type = stringMap["type"],
                    nodeType = stringMap["node-type"],
                    name = stringMap["name"],
                    label = stringMap["label"],
                    description = stringMap["description"]
                )
            }
        } ?: emptyList()
        
        val relationships = (data["relationships"] as? List<*>)?.mapNotNull { item ->
            (item as? Map<*, *>)?.let { relMap ->
                val stringMap = relMap.mapKeys { it.key.toString() }.mapValues { it.value?.toString() }
                org.finos.calm.intellij.model.CalmRelationship(
                    id = stringMap["id"] ?: stringMap["unique-id"] ?: "",
                    uniqueId = stringMap["unique-id"],
                    type = stringMap["type"],
                    relationshipType = stringMap["relationship-type"],
                    source = stringMap["source"],
                    target = stringMap["target"],
                    label = stringMap["label"],
                    description = stringMap["description"]
                )
            }
        } ?: emptyList()
        
        val flows = (data["flows"] as? List<*>)?.mapNotNull { item ->
            (item as? Map<*, *>)?.let { flowMap ->
                val stringMap = flowMap.mapKeys { it.key.toString() }.mapValues { it.value?.toString() }
                org.finos.calm.intellij.model.CalmFlow(
                    id = stringMap["id"] ?: stringMap["unique-id"] ?: "",
                    uniqueId = stringMap["unique-id"],
                    source = stringMap["source"],
                    target = stringMap["target"],
                    label = stringMap["label"],
                    description = stringMap["description"]
                )
            }
        } ?: emptyList()
        
        return CalmModel(nodes, relationships, flows)
    }
}