package org.finos.calm.intellij.model

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty

/**
 * Data classes representing CALM model structure
 */
@JsonIgnoreProperties(ignoreUnknown = true)
data class CalmModel(
    val nodes: List<CalmNode> = emptyList(),
    val relationships: List<CalmRelationship> = emptyList(),
    val flows: List<CalmFlow> = emptyList()
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class CalmNode(
    val id: String,
    @JsonProperty("unique-id") val uniqueId: String? = null,
    val type: String? = null,
    @JsonProperty("node-type") val nodeType: String? = null,
    val name: String? = null,
    val label: String? = null,
    val description: String? = null
) {
    fun effectiveId(): String = id.takeIf { it.isNotBlank() } ?: uniqueId ?: ""
    fun effectiveType(): String = type ?: nodeType ?: ""
    fun effectiveLabel(): String = label ?: name ?: effectiveId()
}

@JsonIgnoreProperties(ignoreUnknown = true)
data class CalmRelationship(
    val id: String,
    @JsonProperty("unique-id") val uniqueId: String? = null,
    val type: String? = null,
    @JsonProperty("relationship-type") val relationshipType: String? = null,
    val source: String? = null,
    val target: String? = null,
    val label: String? = null,
    val description: String? = null
) {
    fun effectiveId(): String = id.takeIf { it.isNotBlank() } ?: uniqueId ?: ""
    fun effectiveType(): String = type ?: relationshipType ?: ""
    fun effectiveLabel(): String = label ?: effectiveType().takeIf { it.isNotBlank() } ?: effectiveId()
}

@JsonIgnoreProperties(ignoreUnknown = true)
data class CalmFlow(
    val id: String,
    @JsonProperty("unique-id") val uniqueId: String? = null,
    val source: String? = null,
    val target: String? = null,
    val label: String? = null,
    val description: String? = null
) {
    fun effectiveId(): String = id.takeIf { it.isNotBlank() } ?: uniqueId ?: ""
    fun effectiveLabel(): String = label ?: effectiveId()
}

/**
 * Model index for tracking element positions in document
 */
data class ModelIndex(
    val nodes: List<IndexedElement>,
    val relationships: List<IndexedElement>,
    val flows: List<IndexedElement>
)

data class IndexedElement(
    val id: String,
    val label: String,
    val textRange: IntRange? = null
)