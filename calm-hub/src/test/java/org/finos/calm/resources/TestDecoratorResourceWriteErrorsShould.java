package org.finos.calm.resources;

import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import org.finos.calm.domain.DecoratorSchemaError;
import org.finos.calm.domain.exception.DecoratorSchemaValidationException;
import org.finos.calm.domain.exception.ReservedDecoratorTypeException;
import org.finos.calm.services.DecoratorWriteService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

// The write service is mocked: the schema tests in TestDecoratorResourceShould skip when the
// meta-schemas are not built, and REST delete never makes the real service refuse a reserved type.
@TestSecurity(authorizationEnabled = false)
@QuarkusTest
class TestDecoratorResourceWriteErrorsShould {

    private static final String DECORATOR_JSON = "{\"type\": \"deployment\", \"data\": {}}";

    @InjectMock
    DecoratorWriteService decoratorWriteService;

    @Test
    void return_400_with_the_errors_when_create_does_not_match_its_schema() throws Exception {
        when(decoratorWriteService.createDecorator(any(), eq("finos"), anyString()))
                .thenThrow(new DecoratorSchemaValidationException(List.of(
                        new DecoratorSchemaError("/data/status", "must be one of the enum values"))));

        given()
                .contentType(ContentType.JSON)
                .body(DECORATOR_JSON)
                .when()
                .post("/api/calm/namespaces/finos/decorators")
                .then()
                .statusCode(400)
                .body("error", equalTo("Decorator does not match its $schema"))
                .body("errors.location", contains("/data/status"))
                .body("errors.error", contains("must be one of the enum values"));
    }

    @Test
    void return_400_with_the_errors_when_update_does_not_match_its_schema() throws Exception {
        when(decoratorWriteService.updateDecorator(any(), eq("finos"), eq(1), anyString()))
                .thenThrow(new DecoratorSchemaValidationException(List.of(
                        new DecoratorSchemaError("/target-type", "required property is missing"))));

        given()
                .contentType(ContentType.JSON)
                .body(DECORATOR_JSON)
                .when()
                .put("/api/calm/namespaces/finos/decorators/1")
                .then()
                .statusCode(400)
                .body("error", equalTo("Decorator does not match its $schema"))
                .body("errors.location", contains("/target-type"))
                .body("errors.error", contains("required property is missing"));
    }

    @Test
    void return_403_when_delete_refuses_a_reserved_type() throws Exception {
        doThrow(new ReservedDecoratorTypeException("control-evaluation"))
                .when(decoratorWriteService).deleteDecorator(any(), anyBoolean(), eq("finos"), anyInt());

        given()
                .when()
                .delete("/api/calm/namespaces/finos/decorators/1")
                .then()
                .statusCode(403)
                .body(equalTo("Decorator type is reserved and the caller may not write it: control-evaluation"));
    }
}
