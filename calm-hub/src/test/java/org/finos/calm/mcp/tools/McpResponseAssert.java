package org.finos.calm.mcp.tools;

import io.quarkiverse.mcp.server.TextContent;
import io.quarkiverse.mcp.server.ToolResponse;

/**
 * Test-only helpers for asserting on {@link ToolResponse} payloads produced
 * by CalmHub MCP tool methods.
 *
 * <p>Successful responses use structured content (no text body), while error
 * responses still carry a human-readable {@link TextContent} so the LLM can
 * surface the failure reason. These helpers expose both shapes.</p>
 */
final class McpResponseAssert {

    private McpResponseAssert() {
    }

    /** Cast the structured payload of a successful response to the expected type. */
    @SuppressWarnings("unchecked")
    static <T> T structured(ToolResponse response, Class<T> type) {
        Object payload = response.structuredContent();
        if (payload == null) {
            throw new AssertionError("Expected structured content of type " + type.getName()
                    + " but ToolResponse had none. isError=" + response.isError());
        }
        if (!type.isInstance(payload)) {
            throw new AssertionError("Expected structured content of type " + type.getName()
                    + " but got " + payload.getClass().getName());
        }
        return (T) payload;
    }

    /** Read the text body from an error response. Returns "" when absent. */
    static String errorText(ToolResponse response) {
        if (response.content() == null || response.content().isEmpty()) {
            return "";
        }
        return ((TextContent) response.firstContent()).text();
    }
}
