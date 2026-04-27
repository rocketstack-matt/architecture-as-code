package org.finos.calm.mcp.results;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

class TestMcpResultsShould {

    @Test
    void return_null_when_json_input_is_null() {
        assertThat(McpResults.parseJson(null), is(nullValue()));
    }

    @Test
    void parse_valid_json_string_into_json_node() {
        JsonNode node = McpResults.parseJson("{\"key\":\"value\"}");

        assertThat(node, is(notNullValue()));
        assertThat(node.get("key").asText(), is("value"));
    }

    @Test
    void return_text_node_when_json_is_unparseable() {
        JsonNode node = McpResults.parseJson("not-valid-json{{{");

        assertThat(node, is(notNullValue()));
        assertThat(node.isTextual(), is(true));
        assertThat(node.asText(), is("not-valid-json{{{"));
    }
}
