package org.finos.calm.mcp.tools;

import io.quarkiverse.mcp.server.ToolResponse;
import org.finos.calm.domain.search.GroupedSearchResults;
import org.finos.calm.domain.search.SearchResult;
import org.finos.calm.mcp.results.McpResults.SearchGroup;
import org.finos.calm.mcp.results.McpResults.SearchResultEnvelope;
import org.finos.calm.store.SearchStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.finos.calm.mcp.tools.McpResponseAssert.errorText;
import static org.finos.calm.mcp.tools.McpResponseAssert.structured;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TestSearchToolsShould {

    @Mock
    SearchStore searchStore;

    @InjectMocks
    SearchTools searchTools;

    @BeforeEach
    void setup() {
        searchTools.mcpEnabled = true;
    }

    private static final List<SearchResult> EMPTY = List.of();

    @Test
    void return_grouped_results_for_valid_query() {
        List<SearchResult> archResults = List.of(
                new SearchResult("workshop", 1, "Trade Platform", "Trading architecture")
        );
        List<SearchResult> controlResults = List.of(
                new SearchResult("api-threats", 2, "BOLA", "Broken Object Level Authorization")
        );

        GroupedSearchResults grouped = new GroupedSearchResults(
                archResults, EMPTY, EMPTY, EMPTY, EMPTY, controlResults, EMPTY);

        when(searchStore.search("trade")).thenReturn(grouped);

        ToolResponse result = searchTools.searchHub("trade");

        assertThat(result.isError(), is(false));
        SearchResultEnvelope body = structured(result, SearchResultEnvelope.class);
        assertThat(body.query(), is("trade"));
        assertThat(body.groups(), hasSize(2));

        SearchGroup archGroup = body.groups().get(0);
        assertThat(archGroup.type(), is("architectures"));
        assertThat(archGroup.total(), is(1));
        assertThat(archGroup.shown(), is(1));
        assertThat(archGroup.items().get(0).name(), is("Trade Platform"));
        assertThat(archGroup.items().get(0).namespace(), is("workshop"));

        SearchGroup controlGroup = body.groups().get(1);
        assertThat(controlGroup.type(), is("controls"));
        assertThat(controlGroup.items().get(0).name(), is("BOLA"));
    }

    @Test
    void return_empty_groups_when_no_results() {
        GroupedSearchResults grouped = new GroupedSearchResults(
                EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY);

        when(searchStore.search("nonexistent")).thenReturn(grouped);

        ToolResponse result = searchTools.searchHub("nonexistent");

        assertThat(result.isError(), is(false));
        SearchResultEnvelope body = structured(result, SearchResultEnvelope.class);
        assertThat(body.query(), is("nonexistent"));
        assertThat(body.groups(), is(empty()));
    }

    @Test
    void return_error_for_null_query() {
        ToolResponse response = searchTools.searchHub(null);

        assertThat(response.isError(), is(true));
        assertThat(errorText(response), containsString("blank"));
        verifyNoInteractions(searchStore);
    }

    @Test
    void return_error_for_blank_query() {
        ToolResponse response = searchTools.searchHub("   ");

        assertThat(response.isError(), is(true));
        assertThat(errorText(response), containsString("blank"));
        verifyNoInteractions(searchStore);
    }

    @Test
    void return_error_for_query_exceeding_max_length() {
        String longQuery = "a".repeat(201);

        ToolResponse response = searchTools.searchHub(longQuery);

        assertThat(response.isError(), is(true));
        assertThat(errorText(response), containsString("200"));
        verifyNoInteractions(searchStore);
    }

    @Test
    void accept_query_at_max_length_boundary() {
        String maxQuery = "a".repeat(200);

        GroupedSearchResults grouped = new GroupedSearchResults(
                EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY);
        when(searchStore.search(maxQuery)).thenReturn(grouped);

        ToolResponse response = searchTools.searchHub(maxQuery);

        assertThat(response.isError(), is(false));
        assertThat(structured(response, SearchResultEnvelope.class).groups(), is(empty()));
    }

    @Test
    void omit_empty_groups_in_results() {
        List<SearchResult> archResults = List.of(
                new SearchResult("workshop", 1, "My Arch", "desc")
        );

        GroupedSearchResults grouped = new GroupedSearchResults(
                archResults, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY);

        when(searchStore.search("arch")).thenReturn(grouped);

        SearchResultEnvelope body = structured(searchTools.searchHub("arch"), SearchResultEnvelope.class);

        assertThat(body.groups(), hasSize(1));
        assertThat(body.groups().get(0).type(), is("architectures"));
    }

    // --- MCP disabled ---

    @Test
    void return_disabled_message_when_mcp_is_disabled() {
        searchTools.mcpEnabled = false;

        ToolResponse response = searchTools.searchHub("trade");
        assertThat(response.isError(), is(true));
        assertThat(errorText(response), containsString("disabled"));
        verifyNoInteractions(searchStore);
    }
}
