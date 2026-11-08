package org.finos.calm.mcp.tools;

import io.quarkiverse.mcp.server.ToolResponse;
import io.quarkus.arc.Arc;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import io.quarkus.test.security.TestSecurity;
import jakarta.enterprise.inject.Any;
import jakarta.enterprise.inject.spi.Bean;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;

/** MCP is not served through JAX-RS, so the read-only filter does not see it: each write tool must refuse itself. */
@QuarkusTest
@TestProfile(TestMcpToolsReadOnlyShould.ReadOnlyProfile.class)
class TestMcpToolsReadOnlyShould {

    public static class ReadOnlyProfile implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of("calm.readonly", "true", "calm.mcp.enabled", "true", "allow.put.operations", "true");
        }
    }

    @Inject
    DecoratorTools decoratorTools;

    // Each MCP tool bean, so a new tool class that changes data and lacks @ReadOnlyHubGuard fails here.
    @Test
    @TestSecurity(authorizationEnabled = false)
    void refuse_every_tool_that_changes_data() throws Exception {
        List<String> refused = new ArrayList<>();
        for (Bean<?> bean : Arc.container().beanManager().getBeans(Object.class, Any.Literal.INSTANCE)) {
            Class<?> type = bean.getBeanClass();
            for (Method method : type.getDeclaredMethods()) {
                if (!ReadOnlyHubGuardInterceptor.changesData(method)) {
                    continue;
                }
                ToolResponse response = (ToolResponse) method.invoke(Arc.container().instance(type).get(), defaultArguments(method));
                assertThat(type.getSimpleName() + "." + method.getName(),
                        response.firstContent().asText().text(), is(ReadOnlyHubGuardInterceptor.READ_ONLY_MESSAGE));
                refused.add(method.getName());
            }
        }

        assertThat(refused, hasItems("createDecorator", "updateDecorator", "createArchitecture", "updateArchitecture",
                "createNamespace", "createDomain", "createControlRequirement", "createTimeline", "updateAdrStatus"));
    }

    @Test
    @TestSecurity(authorizationEnabled = false)
    void run_a_tool_that_only_reads() {
        ToolResponse response = decoratorTools.listDecorators("not a namespace", null, null);

        assertThat(response.firstContent().asText().text(), not(is(ReadOnlyHubGuardInterceptor.READ_ONLY_MESSAGE)));
        assertThat(response.firstContent().asText().text(), containsString("amespace"));
    }

    private static Object[] defaultArguments(Method method) {
        Class<?>[] types = method.getParameterTypes();
        Object[] arguments = new Object[types.length];
        for (int i = 0; i < types.length; i++) {
            if (types[i] == int.class) {
                arguments[i] = 0;
            } else if (types[i] == long.class) {
                arguments[i] = 0L;
            } else if (types[i] == boolean.class) {
                arguments[i] = false;
            }
        }
        return arguments;
    }
}
