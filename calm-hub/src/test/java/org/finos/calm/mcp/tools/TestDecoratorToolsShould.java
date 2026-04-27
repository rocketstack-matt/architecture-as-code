package org.finos.calm.mcp.tools;

import io.quarkiverse.mcp.server.ToolResponse;
import org.finos.calm.domain.Decorator;
import org.finos.calm.domain.exception.DecoratorNotFoundException;
import org.finos.calm.domain.exception.NamespaceNotFoundException;
import org.finos.calm.mcp.results.McpResults.CreateDecoratorResult;
import org.finos.calm.mcp.results.McpResults.DecoratorDetailResult;
import org.finos.calm.mcp.results.McpResults.DecoratorListResult;
import org.finos.calm.mcp.results.McpResults.UpdateDecoratorResult;
import org.finos.calm.store.DecoratorStore;
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
import java.util.Optional;

import static org.finos.calm.mcp.tools.McpResponseAssert.errorText;
import static org.finos.calm.mcp.tools.McpResponseAssert.structured;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TestDecoratorToolsShould {

    @Mock
    DecoratorStore decoratorStore;

    @InjectMocks
    DecoratorTools decoratorTools;

    @BeforeEach
    void setup() {
        decoratorTools.mcpEnabled = true;
    }

    // --- listDecorators ---

    @Test
    void return_decorators_for_namespace() throws NamespaceNotFoundException {
        Decorator dec = new Decorator.DecoratorBuilder()
                .setUniqueId("test-decorator")
                .setType("threat-model")
                .setTarget(List.of("/calm/namespaces/workshop/architectures/1/versions/1-0-0"))
                .build();

        when(decoratorStore.getDecoratorValuesForNamespace("workshop", null, "threat-model"))
                .thenReturn(List.of(dec));

        ToolResponse result = decoratorTools.listDecorators("workshop", "", "threat-model");

        DecoratorListResult body = structured(result, DecoratorListResult.class);
        assertThat(body.namespace(), is("workshop"));
        assertThat(body.decorators(), hasSize(1));
        assertThat(body.decorators().get(0).uniqueId(), is("test-decorator"));
        assertThat(body.decorators().get(0).type(), is("threat-model"));
    }

    @Test
    void return_decorators_with_both_filters() throws NamespaceNotFoundException {
        Decorator dec = new Decorator.DecoratorBuilder()
                .setUniqueId("filtered-dec")
                .setType("deployment")
                .setTarget(List.of("/calm/ns/1"))
                .build();

        when(decoratorStore.getDecoratorValuesForNamespace("workshop", "/calm/ns/1", "deployment"))
                .thenReturn(List.of(dec));

        DecoratorListResult body = structured(
                decoratorTools.listDecorators("workshop", "/calm/ns/1", "deployment"),
                DecoratorListResult.class);

        assertThat(body.decorators().get(0).uniqueId(), is("filtered-dec"));
    }

    @Test
    void return_empty_list_when_no_decorators() throws NamespaceNotFoundException {
        when(decoratorStore.getDecoratorValuesForNamespace("workshop", null, null))
                .thenReturn(List.of());

        DecoratorListResult body = structured(
                decoratorTools.listDecorators("workshop", "", ""),
                DecoratorListResult.class);

        assertThat(body.decorators(), is(empty()));
    }

    @Test
    void return_decorators_with_target_filter_only() throws NamespaceNotFoundException {
        Decorator dec = new Decorator.DecoratorBuilder()
                .setUniqueId("target-filtered-dec")
                .setType("threat-model")
                .setTarget(List.of("/calm/ns/1"))
                .build();

        when(decoratorStore.getDecoratorValuesForNamespace("workshop", "/calm/ns/1", null))
                .thenReturn(List.of(dec));

        DecoratorListResult body = structured(
                decoratorTools.listDecorators("workshop", "/calm/ns/1", ""),
                DecoratorListResult.class);

        assertThat(body.decorators().get(0).uniqueId(), is("target-filtered-dec"));
    }

    @Test
    void return_error_for_missing_namespace() throws NamespaceNotFoundException {
        when(decoratorStore.getDecoratorValuesForNamespace("missing", null, null))
                .thenThrow(new NamespaceNotFoundException());

        ToolResponse response = decoratorTools.listDecorators("missing", "", "");

        assertThat(response.isError(), is(true));
        assertThat(errorText(response), containsString("Error:"));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "bad namespace"})
    void reject_invalid_namespace_for_list_decorators(String namespace) {
        ToolResponse response = decoratorTools.listDecorators(namespace, null, null);

        assertThat(response.isError(), is(true));
        verifyNoInteractions(decoratorStore);
    }

    // --- getDecorator ---

    @Test
    void return_decorator_by_id() throws Exception {
        Decorator dec = new Decorator.DecoratorBuilder()
                .setUniqueId("threat-model-1")
                .setType("threat-model")
                .setTarget(List.of("/calm/ns/1"))
                .setTargetType(List.of("architecture"))
                .setAppliesTo(List.of("node-1"))
                .setData("test-data")
                .build();

        when(decoratorStore.getDecoratorById("workshop", 1))
                .thenReturn(Optional.of(dec));

        DecoratorDetailResult body = structured(
                decoratorTools.getDecorator("workshop", 1),
                DecoratorDetailResult.class);

        assertThat(body.namespace(), is("workshop"));
        assertThat(body.id(), is(1));
        assertThat(body.decorator().uniqueId(), is("threat-model-1"));
        assertThat(body.decorator().type(), is("threat-model"));
    }

    @Test
    void return_not_found_when_decorator_optional_empty() throws Exception {
        when(decoratorStore.getDecoratorById("workshop", 99))
                .thenReturn(Optional.empty());

        ToolResponse response = decoratorTools.getDecorator("workshop", 99);

        assertThat(response.isError(), is(true));
        assertThat(errorText(response), containsString("not found"));
    }

    @Test
    void return_error_when_namespace_not_found_for_get_decorator() throws Exception {
        when(decoratorStore.getDecoratorById("missing", 1))
                .thenThrow(new NamespaceNotFoundException());

        ToolResponse response = decoratorTools.getDecorator("missing", 1);

        assertThat(response.isError(), is(true));
        assertThat(errorText(response), containsString("Namespace"));
    }

    @Test
    void reject_invalid_namespace_for_get_decorator() {
        ToolResponse response = decoratorTools.getDecorator("bad ns", 1);

        assertThat(response.isError(), is(true));
        verifyNoInteractions(decoratorStore);
    }

    // --- createDecorator ---

    @Test
    void create_decorator_successfully() throws NamespaceNotFoundException {
        when(decoratorStore.createDecorator(eq("workshop"), anyString()))
                .thenReturn(5);

        CreateDecoratorResult body = structured(
                decoratorTools.createDecorator("workshop", "{\"type\":\"threat-model\"}"),
                CreateDecoratorResult.class);

        assertThat(body.namespace(), is("workshop"));
        assertThat(body.id(), is(5));
        assertThat(body.message(), containsString("created successfully"));
    }

    @Test
    void return_error_when_creating_in_missing_namespace() throws NamespaceNotFoundException {
        when(decoratorStore.createDecorator(eq("missing"), anyString()))
                .thenThrow(new NamespaceNotFoundException());

        ToolResponse response = decoratorTools.createDecorator("missing", "{\"type\":\"test\"}");

        assertThat(response.isError(), is(true));
        assertThat(errorText(response), containsString("Error:"));
    }

    @Test
    void reject_invalid_namespace_for_create_decorator() {
        ToolResponse response = decoratorTools.createDecorator("bad ns", "{\"type\":\"test\"}");

        assertThat(response.isError(), is(true));
        verifyNoInteractions(decoratorStore);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void reject_blank_json_for_create_decorator(String json) {
        ToolResponse response = decoratorTools.createDecorator("workshop", json);

        assertThat(response.isError(), is(true));
        assertThat(errorText(response), containsString("Decorator JSON"));
        verifyNoInteractions(decoratorStore);
    }

    // --- updateDecorator ---

    @Test
    void update_decorator_successfully() throws Exception {
        UpdateDecoratorResult body = structured(
                decoratorTools.updateDecorator("workshop", 1, "{\"updated\":true}"),
                UpdateDecoratorResult.class);

        assertThat(body.namespace(), is("workshop"));
        assertThat(body.id(), is(1));
        assertThat(body.message(), containsString("updated successfully"));
    }

    @Test
    void return_error_when_updating_nonexistent_decorator() throws Exception {
        org.mockito.Mockito.doThrow(new DecoratorNotFoundException())
                .when(decoratorStore).updateDecorator(eq("workshop"), eq(99), anyString());

        ToolResponse response = decoratorTools.updateDecorator("workshop", 99, "{\"type\":\"test\"}");

        assertThat(response.isError(), is(true));
        assertThat(errorText(response), containsString("Error:"));
    }

    @Test
    void return_error_when_updating_in_missing_namespace() throws Exception {
        org.mockito.Mockito.doThrow(new NamespaceNotFoundException())
                .when(decoratorStore).updateDecorator(eq("missing"), eq(1), anyString());

        ToolResponse response = decoratorTools.updateDecorator("missing", 1, "{\"type\":\"test\"}");

        assertThat(response.isError(), is(true));
        assertThat(errorText(response), containsString("Namespace"));
    }

    @Test
    void reject_invalid_namespace_for_update_decorator() {
        ToolResponse response = decoratorTools.updateDecorator("bad ns", 1, "{\"type\":\"test\"}");

        assertThat(response.isError(), is(true));
        verifyNoInteractions(decoratorStore);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void reject_blank_json_for_update_decorator(String json) {
        ToolResponse response = decoratorTools.updateDecorator("workshop", 1, json);

        assertThat(response.isError(), is(true));
        assertThat(errorText(response), containsString("Decorator JSON"));
        verifyNoInteractions(decoratorStore);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1, -42})
    void reject_non_positive_id_for_get_decorator(int id) {
        ToolResponse response = decoratorTools.getDecorator("workshop", id);

        assertThat(response.isError(), is(true));
        assertThat(errorText(response), containsString("Decorator ID"));
        verifyNoInteractions(decoratorStore);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1, -42})
    void reject_non_positive_id_for_update_decorator(int id) {
        ToolResponse response = decoratorTools.updateDecorator("workshop", id, "{\"type\":\"test\"}");

        assertThat(response.isError(), is(true));
        assertThat(errorText(response), containsString("Decorator ID"));
        verifyNoInteractions(decoratorStore);
    }

    @Test
    void reject_invalid_json_for_create_decorator() {
        ToolResponse response = decoratorTools.createDecorator("workshop", "not-json");

        assertThat(response.isError(), is(true));
        assertThat(errorText(response), containsString("Decorator JSON"));
        verifyNoInteractions(decoratorStore);
    }

    @Test
    void reject_invalid_json_for_update_decorator() {
        ToolResponse response = decoratorTools.updateDecorator("workshop", 1, "not-json");

        assertThat(response.isError(), is(true));
        assertThat(errorText(response), containsString("Decorator JSON"));
        verifyNoInteractions(decoratorStore);
    }

    @Test
    void return_updated_representation_when_update_succeeds() throws Exception {
        Decorator updated = new Decorator.DecoratorBuilder()
                .setUniqueId("updated-decorator")
                .setType("threat-model")
                .setTarget(List.of("/calm/ns/1"))
                .setData("updated-data")
                .build();

        when(decoratorStore.getDecoratorById("workshop", 1)).thenReturn(Optional.of(updated));

        UpdateDecoratorResult body = structured(
                decoratorTools.updateDecorator("workshop", 1, "{\"updated\":true}"),
                UpdateDecoratorResult.class);

        assertThat(body.message(), containsString("updated successfully"));
        assertThat(body.decorator(), is(notNullValue()));
        assertThat(body.decorator().uniqueId(), is("updated-decorator"));
        assertThat(body.decorator().type(), is("threat-model"));
        assertThat(body.decorator().data(), is("updated-data"));
    }

    // --- MCP disabled ---

    @Test
    void return_disabled_message_when_mcp_is_disabled() {
        decoratorTools.mcpEnabled = false;

        ToolResponse listDec = decoratorTools.listDecorators("workshop", null, null);
        ToolResponse getDec = decoratorTools.getDecorator("workshop", 1);
        ToolResponse createDec = decoratorTools.createDecorator("workshop", "{\"type\":\"test\"}");
        ToolResponse updateDec = decoratorTools.updateDecorator("workshop", 1, "{\"type\":\"test\"}");

        assertThat(listDec.isError(), is(true));
        assertThat(errorText(listDec), containsString("disabled"));
        assertThat(getDec.isError(), is(true));
        assertThat(errorText(getDec), containsString("disabled"));
        assertThat(createDec.isError(), is(true));
        assertThat(errorText(createDec), containsString("disabled"));
        assertThat(updateDec.isError(), is(true));
        assertThat(errorText(updateDec), containsString("disabled"));
        verifyNoInteractions(decoratorStore);
    }
}
