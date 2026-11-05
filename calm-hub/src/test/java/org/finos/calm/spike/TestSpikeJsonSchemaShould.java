package org.finos.calm.spike;

import io.quarkus.test.common.WithTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import io.restassured.response.ValidatableResponse;
import io.vertx.core.json.JsonObject;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;

/**
 * Q2: vertx-json-schema (the Quarkus BOM's 4.5.x) on the 2020-12 keywords that the decorator
 * Standards are likely to use. Each row is: schema, instance, expected result.
 */
@QuarkusTest
@TestProfile(SpikeProfile.class)
@WithTestResource(SpikeUpstream.class)
public class TestSpikeJsonSchemaShould {

    private static final String KNOWN = "https://calm.finos.org/spike/control-evaluation.json";

    @ParameterizedTest(name = "{0}")
    @CsvSource(delimiter = '|', textBlock = """
            prefixItems ok        | {"prefixItems":[{"type":"string"},{"type":"number"}],"items":false} | ["a",1]       | true
            prefixItems extra     | {"prefixItems":[{"type":"string"},{"type":"number"}],"items":false} | ["a",1,2]     | false
            prefixItems order     | {"prefixItems":[{"type":"string"},{"type":"number"}],"items":false} | [1,"a"]       | false
            unevaluated ok        | {"allOf":[{"properties":{"a":{"type":"string"}}}],"properties":{"b":{}},"unevaluatedProperties":false} | {"a":"x","b":1} | true
            unevaluated extra     | {"allOf":[{"properties":{"a":{"type":"string"}}}],"properties":{"b":{}},"unevaluatedProperties":false} | {"a":"x","c":1} | false
            anchor ref            | {"$defs":{"s":{"$anchor":"str","type":"string"}},"properties":{"x":{"$ref":"#str"}}} | {"x":1} | false
            defs ref              | {"$defs":{"s":{"type":"string"}},"properties":{"x":{"$ref":"#/$defs/s"}}} | {"x":"ok"} | true
            dependentRequired     | {"dependentRequired":{"a":["b"]}} | {"a":1} | false
            const                 | {"properties":{"v":{"const":2}}} | {"v":3} | false
            known schema ok       | {"$ref":"https://calm.finos.org/spike/control-evaluation.json"} | {"control-id":"c1","status":"pass"} | true
            known schema bad enum | {"$ref":"https://calm.finos.org/spike/control-evaluation.json"} | {"control-id":"c1","status":"maybe"} | false
            known schema missing  | {"$ref":"https://calm.finos.org/spike/control-evaluation.json"} | {"status":"pass"} | false
            """)
    void validate_2020_12_keywords(String name, String schema, String instance, boolean valid) {
        validate(schema, instance, false).statusCode(200).body("valid", equalTo(valid));
    }

    @Test
    void follow_dynamic_ref_to_the_outermost_dynamic_anchor() {
        String schema = """
                {"$id":"https://calm.finos.org/spike/strict-tree.json","$dynamicAnchor":"node",
                 "$ref":"tree.json","unevaluatedProperties":false,
                 "$defs":{"tree":{"$id":"tree.json","$dynamicAnchor":"node","type":"object",
                   "properties":{"data":true,"children":{"type":"array","items":{"$dynamicRef":"#node"}}}}}}
                """;
        validate(schema, "{\"children\":[{\"data\":1}]}", false).statusCode(200).body("valid", equalTo(true));
        validate(schema, "{\"children\":[{\"daat\":1}]}", false).statusCode(200).body("valid", equalTo(false));
    }

    @Test
    void report_where_the_instance_failed() {
        validate("{\"$ref\":\"" + KNOWN + "\"}", "{\"control-id\":\"c1\",\"status\":\"maybe\"}", false)
                .statusCode(200)
                .body("errors.instanceLocation", hasItem("#/status"));
    }

    @Test
    // 2020-12 makes format an annotation by default; vertx-json-schema asserts it.
    void assert_format_unlike_the_2020_12_default() {
        validate("{\"format\":\"email\"}", "\"not-an-email\"", false).statusCode(200).body("valid", equalTo(false));
    }

    @Test
    void reject_a_schema_that_breaks_the_meta_schema_when_asked() {
        validate("{\"type\":\"strng\"}", "1", true).statusCode(200).body("schemaValid", equalTo(false));
        validate("{\"type\":\"string\"}", "\"x\"", true).statusCode(200)
                .body("schemaValid", equalTo(true)).body("valid", equalTo(true));
    }

    @Test
    void not_fetch_an_unknown_remote_ref() {
        validate("{\"$ref\":\"https://example.invalid/unknown.json\"}", "1", false)
                .statusCode(400).body("error", notNullValue());
    }

    private static ValidatableResponse validate(String schema, String instance, boolean checkSchema) {
        String body = new JsonObject()
                .put("schema", new JsonObject(schema))
                .put("instance", io.vertx.core.json.Json.decodeValue(instance))
                .put("checkSchema", checkSchema)
                .encode();
        return given().contentType("application/json").body(body).post("/spike/schema/validate").then().log().ifValidationFails();
    }
}
