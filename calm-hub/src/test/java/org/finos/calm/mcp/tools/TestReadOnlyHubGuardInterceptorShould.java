package org.finos.calm.mcp.tools;

import io.quarkiverse.mcp.server.Tool;
import io.quarkiverse.mcp.server.ToolResponse;
import io.quarkus.security.Authenticated;
import io.quarkus.security.PermissionsAllowed;
import jakarta.interceptor.InvocationContext;
import org.finos.calm.security.CalmHubScopes;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.lang.reflect.Method;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.sameInstance;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TestReadOnlyHubGuardInterceptorShould {

    @SuppressWarnings("unused")
    static class SampleTools {
        @Tool(description = "read")
        @PermissionsAllowed(CalmHubScopes.READ)
        public ToolResponse read() {
            return null;
        }

        @Tool(description = "domain read")
        @PermissionsAllowed(CalmHubScopes.DOMAIN_READ)
        public ToolResponse domainRead() {
            return null;
        }

        @Tool(description = "search")
        @Authenticated
        public ToolResponse search() {
            return null;
        }

        @Tool(description = "write")
        @PermissionsAllowed(CalmHubScopes.WRITE)
        public ToolResponse write() {
            return null;
        }

        @Tool(description = "read or write")
        @PermissionsAllowed({CalmHubScopes.READ, CalmHubScopes.WRITE})
        public ToolResponse readOrWrite() {
            return null;
        }

        @Tool(description = "admin")
        @PermissionsAllowed(CalmHubScopes.GLOBAL_ADMIN)
        public ToolResponse admin() {
            return null;
        }

        @Tool(description = "no annotation")
        public ToolResponse unannotated() {
            return null;
        }

        public ToolResponse notATool() {
            return null;
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"read", "domainRead", "search", "notATool"})
    void treat_a_method_that_needs_only_read_scopes_or_authentication_as_a_read(String name) throws Exception {
        assertThat(ReadOnlyHubGuardInterceptor.changesData(method(name)), is(false));
    }

    @ParameterizedTest
    @ValueSource(strings = {"write", "readOrWrite", "admin", "unannotated"})
    void treat_any_other_tool_as_one_that_changes_data(String name) throws Exception {
        assertThat(ReadOnlyHubGuardInterceptor.changesData(method(name)), is(true));
    }

    @Test
    void refuse_a_tool_that_changes_data_on_a_read_only_hub() throws Exception {
        InvocationContext context = context("write");

        ToolResponse response = (ToolResponse) ReadOnlyHubGuardInterceptor.refuseWrites(context, true);

        assertThat(response.isError(), is(true));
        assertThat(response.firstContent().asText().text(), is(ReadOnlyHubGuardInterceptor.READ_ONLY_MESSAGE));
        verify(context, never()).proceed();
    }

    @Test
    void run_a_read_tool_on_a_read_only_hub() throws Exception {
        InvocationContext context = context("read");
        Object result = new Object();
        when(context.proceed()).thenReturn(result);

        assertThat(ReadOnlyHubGuardInterceptor.refuseWrites(context, true), is(sameInstance(result)));
    }

    @Test
    void run_a_tool_that_changes_data_on_a_hub_that_is_not_read_only() throws Exception {
        InvocationContext context = context("write");
        Object result = new Object();
        when(context.proceed()).thenReturn(result);

        assertThat(ReadOnlyHubGuardInterceptor.refuseWrites(context, false), is(sameInstance(result)));
    }

    @Test
    void run_a_read_tool_whatever_the_configured_setting() throws Exception {
        InvocationContext context = context("read");
        Object result = new Object();
        when(context.proceed()).thenReturn(result);

        assertThat(new ReadOnlyHubGuardInterceptor().refuseWritesOnReadOnlyHub(context), is(sameInstance(result)));
    }

    private static InvocationContext context(String name) throws Exception {
        InvocationContext context = mock(InvocationContext.class);
        when(context.getMethod()).thenReturn(method(name));
        return context;
    }

    private static Method method(String name) throws NoSuchMethodException {
        return SampleTools.class.getMethod(name);
    }
}
