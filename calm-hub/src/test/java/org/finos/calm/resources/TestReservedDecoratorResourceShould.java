package org.finos.calm.resources;

import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import org.finos.calm.domain.Decorator;
import org.finos.calm.domain.DecoratorHistoryEntry;
import java.util.List;
import org.finos.calm.domain.exception.DecoratorSupersededException;
import org.finos.calm.store.DecoratorStore;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Optional;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@QuarkusTest
@TestProfile(TestReservedDecoratorResourceShould.ReservedTypeProfile.class)
class TestReservedDecoratorResourceShould {

    public static class ReservedTypeProfile implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of("calm.decorators.reserved.\"control-evaluation\".writers", "policy-engine");
        }
    }

    private static final String RESERVED_DECORATOR_JSON = """
            {
                "unique-id": "eval-1",
                "type": "control-evaluation",
                "target": ["/api/calm/namespaces/finos/architectures/1/versions/1-0-0"],
                "applies-to": ["web-service"],
                "data": {}
            }
            """;

    private static final String UNRESERVED_DECORATOR_JSON = RESERVED_DECORATOR_JSON
            .replace("control-evaluation", "threat-model");

    @InjectMock
    DecoratorStore mockDecoratorStore;

    @Test
    @TestSecurity(user = "policy-engine", authorizationEnabled = false)
    void create_a_reserved_decorator_for_a_configured_writer() throws Exception {
        when(mockDecoratorStore.createDecorator(anyString(), anyString())).thenReturn(1);

        given()
                .contentType(ContentType.JSON)
                .body(RESERVED_DECORATOR_JSON)
                .when()
                .post("/api/calm/namespaces/finos/decorators")
                .then()
                .statusCode(201);
    }

    @Test
    @TestSecurity(user = "alice", authorizationEnabled = false)
    void return_403_when_another_principal_creates_a_reserved_decorator() throws Exception {
        given()
                .contentType(ContentType.JSON)
                .body(RESERVED_DECORATOR_JSON)
                .when()
                .post("/api/calm/namespaces/finos/decorators")
                .then()
                .statusCode(403)
                .body(containsString("control-evaluation"));

        verify(mockDecoratorStore, never()).createDecorator(anyString(), anyString());
    }

    @Test
    @TestSecurity(user = "alice", authorizationEnabled = false)
    void create_an_unreserved_decorator_for_any_writer() throws Exception {
        when(mockDecoratorStore.createDecorator(anyString(), anyString())).thenReturn(1);

        given()
                .contentType(ContentType.JSON)
                .body(UNRESERVED_DECORATOR_JSON)
                .when()
                .post("/api/calm/namespaces/finos/decorators")
                .then()
                .statusCode(201);
    }

    @Test
    @TestSecurity(user = "alice", authorizationEnabled = false)
    void return_403_when_another_principal_changes_an_unreserved_decorator_to_a_reserved_type() throws Exception {
        when(mockDecoratorStore.getDecoratorById("finos", 1)).thenReturn(Optional.of(decorator("threat-model")));

        given()
                .contentType(ContentType.JSON)
                .body(RESERVED_DECORATOR_JSON)
                .when()
                .put("/api/calm/namespaces/finos/decorators/1")
                .then()
                .statusCode(403);

        verify(mockDecoratorStore, never()).updateDecorator(anyString(), anyInt(), anyString());
    }

    @Test
    @TestSecurity(user = "alice", authorizationEnabled = false)
    void return_403_when_another_principal_changes_a_reserved_decorator_to_an_unreserved_type() throws Exception {
        when(mockDecoratorStore.getDecoratorById("finos", 1)).thenReturn(Optional.of(decorator("control-evaluation")));

        given()
                .contentType(ContentType.JSON)
                .body(UNRESERVED_DECORATOR_JSON)
                .when()
                .put("/api/calm/namespaces/finos/decorators/1")
                .then()
                .statusCode(403);

        verify(mockDecoratorStore, never()).updateDecorator(anyString(), anyInt(), anyString());
    }

    @Test
    @TestSecurity(user = "alice", authorizationEnabled = false)
    void return_403_when_another_principal_deletes_a_reserved_decorator() throws Exception {
        when(mockDecoratorStore.getDecoratorById("finos", 1)).thenReturn(Optional.of(decorator("control-evaluation")));

        given()
                .when()
                .delete("/api/calm/namespaces/finos/decorators/1")
                .then()
                .statusCode(403);

        verify(mockDecoratorStore, never()).deleteDecorator(anyString(), anyInt());
    }

    @Test
    @TestSecurity(user = "policy-engine", authorizationEnabled = false)
    void delete_a_reserved_decorator_for_a_configured_writer() throws Exception {
        when(mockDecoratorStore.getDecoratorById("finos", 1)).thenReturn(Optional.of(decorator("control-evaluation")));

        when(mockDecoratorStore.getDecoratorHistory("finos", 1)).thenReturn(List.of(
                new DecoratorHistoryEntry(1, null, null, decorator("control-evaluation"))));

        given()
                .when()
                .delete("/api/calm/namespaces/finos/decorators/1")
                .then()
                .statusCode(204);

        verify(mockDecoratorStore).deleteCurrentDecoratorHistory("finos", 1);
    }

    @Test
    @TestSecurity(user = "policy-engine", authorizationEnabled = false)
    void return_201_with_the_new_id_when_a_writer_updates_a_reserved_decorator() throws Exception {
        when(mockDecoratorStore.getDecoratorById("finos", 1)).thenReturn(Optional.of(decorator("control-evaluation")));
        when(mockDecoratorStore.supersedeDecorator(eq("finos"), eq(1), anyString())).thenReturn(5);

        given()
                .contentType(ContentType.JSON)
                .body(RESERVED_DECORATOR_JSON)
                .when()
                .put("/api/calm/namespaces/finos/decorators/1")
                .then()
                .statusCode(201)
                .header("Location", containsString("/api/calm/namespaces/finos/decorators/5"))
                .body("id", equalTo(5));

        verify(mockDecoratorStore, never()).updateDecorator(anyString(), anyInt(), anyString());
    }

    @Test
    @TestSecurity(user = "policy-engine", authorizationEnabled = false)
    void return_409_when_a_writer_updates_a_superseded_decorator() throws Exception {
        when(mockDecoratorStore.getDecoratorById("finos", 1)).thenReturn(Optional.of(decorator("control-evaluation")));
        when(mockDecoratorStore.supersedeDecorator(eq("finos"), eq(1), anyString())).thenThrow(new DecoratorSupersededException());

        given()
                .contentType(ContentType.JSON)
                .body(RESERVED_DECORATOR_JSON)
                .when()
                .put("/api/calm/namespaces/finos/decorators/1")
                .then()
                .statusCode(409)
                .body(containsString("superseded"));
    }

    private static Decorator decorator(String type) {
        return new Decorator.DecoratorBuilder().setType(type).build();
    }
}
