package org.finos.calm.mcp.tools;

import io.quarkiverse.mcp.server.ToolResponse;
import org.finos.calm.domain.exception.FlowNotFoundException;
import org.finos.calm.domain.exception.FlowVersionNotFoundException;
import org.finos.calm.domain.exception.NamespaceNotFoundException;
import org.finos.calm.domain.flow.NamespaceFlowSummary;
import org.finos.calm.mcp.results.McpResults.FlowContentResult;
import org.finos.calm.mcp.results.McpResults.FlowListResult;
import org.finos.calm.store.FlowStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TestFlowToolsShould {

    @Mock
    FlowStore flowStore;

    @InjectMocks
    FlowTools flowTools;

    @BeforeEach
    void setup() {
        flowTools.mcpEnabled = true;
    }

    // --- listFlows ---

    @Test
    void return_flows_for_namespace() throws NamespaceNotFoundException {
        when(flowStore.getFlowsForNamespace("workshop"))
                .thenReturn(List.of(
                        new NamespaceFlowSummary("Signup Flow", "User registration flow", 1)
                ));

        ToolResponse result = flowTools.listFlows("workshop");

        assertThat(result.isError(), is(false));
        FlowListResult body = structured(result, FlowListResult.class);
        assertThat(body.namespace(), is("workshop"));
        assertThat(body.flows(), hasSize(1));
        assertThat(body.flows().get(0).id(), is(1));
        assertThat(body.flows().get(0).name(), is("Signup Flow"));
    }

    @Test
    void return_empty_list_when_no_flows() throws NamespaceNotFoundException {
        when(flowStore.getFlowsForNamespace("empty"))
                .thenReturn(List.of());

        ToolResponse result = flowTools.listFlows("empty");

        assertThat(result.isError(), is(false));
        assertThat(structured(result, FlowListResult.class).flows(), is(empty()));
    }

    @Test
    void return_error_for_nonexistent_namespace() throws NamespaceNotFoundException {
        when(flowStore.getFlowsForNamespace("missing"))
                .thenThrow(new NamespaceNotFoundException());

        ToolResponse response = flowTools.listFlows("missing");

        assertThat(response.isError(), is(true));
        assertThat(errorText(response), containsString("Error:"));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "bad namespace"})
    void reject_invalid_namespace_for_list_flows(String namespace) {
        ToolResponse response = flowTools.listFlows(namespace);

        assertThat(response.isError(), is(true));
        assertThat(errorText(response), containsString("Error:"));
        verifyNoInteractions(flowStore);
    }

    // --- getFlow ---

    @Test
    void return_flow_json_for_valid_version() throws Exception {
        when(flowStore.getFlowForVersion(any()))
                .thenReturn("{\"transitions\":[]}");

        ToolResponse result = flowTools.getFlow("workshop", 1, "1.0.0");

        assertThat(result.isError(), is(false));
        FlowContentResult body = structured(result, FlowContentResult.class);
        assertThat(body.namespace(), is("workshop"));
        assertThat(body.id(), is(1));
        assertThat(body.version(), is("1.0.0"));
        assertThat(body.content().has("transitions"), is(true));
    }

    @Test
    void return_error_when_flow_version_not_found() throws Exception {
        when(flowStore.getFlowForVersion(any()))
                .thenThrow(new FlowVersionNotFoundException());

        ToolResponse response = flowTools.getFlow("workshop", 1, "9.9.9");

        assertThat(response.isError(), is(true));
        assertThat(errorText(response), containsString("Version"));
    }

    @Test
    void return_error_when_flow_not_found() throws Exception {
        when(flowStore.getFlowForVersion(any()))
                .thenThrow(new FlowNotFoundException());

        ToolResponse response = flowTools.getFlow("workshop", 99, "1.0.0");

        assertThat(response.isError(), is(true));
        assertThat(errorText(response), containsString("not found"));
    }

    @Test
    void return_error_when_namespace_not_found_for_get_flow() throws Exception {
        when(flowStore.getFlowForVersion(any()))
                .thenThrow(new NamespaceNotFoundException());

        ToolResponse response = flowTools.getFlow("missing", 1, "1.0.0");

        assertThat(response.isError(), is(true));
        assertThat(errorText(response), containsString("Namespace"));
    }

    @Test
    void reject_invalid_namespace_for_get_flow() {
        ToolResponse response = flowTools.getFlow("bad ns", 1, "1.0.0");

        assertThat(response.isError(), is(true));
        verifyNoInteractions(flowStore);
    }

    @Test
    void reject_invalid_version_for_get_flow() {
        ToolResponse response = flowTools.getFlow("workshop", 1, "not-a-version");

        assertThat(response.isError(), is(true));
        verifyNoInteractions(flowStore);
    }

    // --- MCP disabled ---

    @Test
    void return_disabled_message_when_mcp_is_disabled() {
        flowTools.mcpEnabled = false;

        ToolResponse listFlows = flowTools.listFlows("workshop");
        ToolResponse getFlow = flowTools.getFlow("workshop", 1, "1.0.0");

        assertThat(listFlows.isError(), is(true));
        assertThat(errorText(listFlows), containsString("disabled"));
        assertThat(getFlow.isError(), is(true));
        assertThat(errorText(getFlow), containsString("disabled"));
        verifyNoInteractions(flowStore);
    }
}
