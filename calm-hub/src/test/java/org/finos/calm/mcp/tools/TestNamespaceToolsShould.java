package org.finos.calm.mcp.tools;

import io.quarkiverse.mcp.server.ToolResponse;
import org.finos.calm.domain.exception.NamespaceAlreadyExistsException;
import org.finos.calm.domain.namespaces.NamespaceInfo;
import org.finos.calm.mcp.results.McpResults.CreateNamespaceResult;
import org.finos.calm.mcp.results.McpResults.DomainListResult;
import org.finos.calm.mcp.results.McpResults.NamespaceListResult;
import org.finos.calm.store.DomainStore;
import org.finos.calm.store.NamespaceStore;
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
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TestNamespaceToolsShould {

    @Mock
    NamespaceStore namespaceStore;

    @Mock
    DomainStore domainStore;

    @InjectMocks
    NamespaceTools namespaceTools;

    @BeforeEach
    void setup() {
        namespaceTools.mcpEnabled = true;
    }

    // --- listNamespaces ---

    @Test
    void return_namespaces() {
        when(namespaceStore.getNamespaces())
                .thenReturn(List.of(
                        new NamespaceInfo("finos", "FINOS namespace"),
                        new NamespaceInfo("workshop", "Workshop namespace")
                ));

        ToolResponse result = namespaceTools.listNamespaces();

        assertThat(result.isError(), is(false));
        NamespaceListResult body = structured(result, NamespaceListResult.class);
        assertThat(body.namespaces(), hasSize(2));
        assertThat(body.namespaces().get(0).name(), is("finos"));
        assertThat(body.namespaces().get(1).name(), is("workshop"));
    }

    @Test
    void return_empty_namespaces_list() {
        when(namespaceStore.getNamespaces()).thenReturn(List.of());

        ToolResponse result = namespaceTools.listNamespaces();

        assertThat(result.isError(), is(false));
        assertThat(structured(result, NamespaceListResult.class).namespaces(), is(empty()));
    }

    @Test
    void return_namespace_without_description() {
        when(namespaceStore.getNamespaces())
                .thenReturn(List.of(new NamespaceInfo("test", null)));

        NamespaceListResult body = structured(namespaceTools.listNamespaces(), NamespaceListResult.class);

        assertThat(body.namespaces(), hasSize(1));
        assertThat(body.namespaces().get(0).name(), is("test"));
        assertThat(body.namespaces().get(0).description(), is(org.hamcrest.CoreMatchers.nullValue()));
    }

    // --- createNamespace ---

    @Test
    void create_namespace_successfully() throws NamespaceAlreadyExistsException {
        ToolResponse result = namespaceTools.createNamespace("test", "A test namespace");

        assertThat(result.isError(), is(false));
        CreateNamespaceResult body = structured(result, CreateNamespaceResult.class);
        assertThat(body.name(), is("test"));
        assertThat(body.message(), containsString("created successfully"));
    }

    @Test
    void create_namespace_with_null_description() throws NamespaceAlreadyExistsException {
        ToolResponse result = namespaceTools.createNamespace("no-desc", null);

        assertThat(result.isError(), is(false));
        assertThat(structured(result, CreateNamespaceResult.class).name(), is("no-desc"));
    }

    @Test
    void return_error_when_namespace_exists() throws NamespaceAlreadyExistsException {
        org.mockito.Mockito.doThrow(new NamespaceAlreadyExistsException("duplicate"))
                .when(namespaceStore).createNamespace("existing", "desc");

        ToolResponse response = namespaceTools.createNamespace("existing", "desc");

        assertThat(response.isError(), is(true));
        assertThat(errorText(response), containsString("already exists"));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "bad namespace", "bad/ns"})
    void reject_invalid_name_for_create_namespace(String name) {
        ToolResponse response = namespaceTools.createNamespace(name, "desc");

        assertThat(response.isError(), is(true));
        verifyNoInteractions(namespaceStore);
    }

    // --- listDomains ---

    @Test
    void return_domains() {
        when(domainStore.getDomains()).thenReturn(List.of("api-threats", "cloud-security"));

        ToolResponse result = namespaceTools.listDomains();

        assertThat(result.isError(), is(false));
        assertThat(structured(result, DomainListResult.class).domains(),
                contains("api-threats", "cloud-security"));
    }

    @Test
    void return_empty_domains_list() {
        when(domainStore.getDomains()).thenReturn(List.of());

        ToolResponse result = namespaceTools.listDomains();

        assertThat(result.isError(), is(false));
        assertThat(structured(result, DomainListResult.class).domains(), is(empty()));
    }

    // --- MCP disabled ---

    @Test
    void return_disabled_message_when_mcp_is_disabled() {
        namespaceTools.mcpEnabled = false;

        ToolResponse listNs = namespaceTools.listNamespaces();
        ToolResponse createNs = namespaceTools.createNamespace("test", "desc");
        ToolResponse listDomains = namespaceTools.listDomains();

        assertThat(listNs.isError(), is(true));
        assertThat(errorText(listNs), containsString("disabled"));
        assertThat(createNs.isError(), is(true));
        assertThat(errorText(createNs), containsString("disabled"));
        assertThat(listDomains.isError(), is(true));
        assertThat(errorText(listDomains), containsString("disabled"));
        verifyNoInteractions(namespaceStore);
        verifyNoInteractions(domainStore);
    }
}
