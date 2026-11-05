package org.finos.calm.spike;

import io.quarkus.arc.properties.IfBuildProperty;
import io.vertx.core.Vertx;
import io.vertx.core.json.JsonObject;
import io.vertx.json.schema.Draft;
import io.vertx.json.schema.JsonSchema;
import io.vertx.json.schema.JsonSchemaOptions;
import io.vertx.json.schema.OutputFormat;
import io.vertx.json.schema.OutputUnit;
import io.vertx.json.schema.SchemaRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Spike for I2/I3: validates a decorator payload with vertx-json-schema, draft 2020-12. A schema
 * Hub "knows" is registered once, so a request schema can {@code $ref} it by URL with no fetch.
 */
@ApplicationScoped
@IfBuildProperty(name = "calm.spike.enabled", stringValue = "true")
public class SpikeSchemaValidator {

    static final String BASE_URI = "https://calm.finos.org/spike/";
    static final String KNOWN_SCHEMA_ID = BASE_URI + "control-evaluation.json";
    private static final String REQUEST_SCHEMA_ID = BASE_URI + "request.json";
    private static final String META_SCHEMA_ID = "https://json-schema.org/draft/2020-12/schema";

    private static final JsonObject KNOWN_SCHEMA = new JsonObject("""
            {
              "$schema": "https://json-schema.org/draft/2020-12/schema",
              "$id": "%s",
              "type": "object",
              "required": ["control-id", "status"],
              "properties": {
                "control-id": {"type": "string", "minLength": 1},
                "status": {"enum": ["pass", "fail", "warning"]}
              }
            }
            """.formatted(KNOWN_SCHEMA_ID));

    private final JsonSchemaOptions options = new JsonSchemaOptions()
            .setDraft(Draft.DRAFT202012)
            .setBaseUri(BASE_URI)
            .setOutputFormat(OutputFormat.Basic);

    private final Vertx vertx;

    @Inject
    public SpikeSchemaValidator(Vertx vertx) {
        this.vertx = vertx;
    }

    /**
     * Body: {@code {"schema": {...}, "instance": any, "checkSchema": bool}}. With
     * {@code checkSchema}, the schema itself is first validated against the 2020-12 meta-schema.
     */
    public Map<String, Object> validate(String body) {
        JsonObject request = new JsonObject(body);
        JsonObject schema = request.getJsonObject("schema");
        Object instance = request.getValue("instance");
        Map<String, Object> result = new LinkedHashMap<>();

        SchemaRepository repository = SchemaRepository.create(options);
        repository.dereference(JsonSchema.of(KNOWN_SCHEMA));

        if (request.getBoolean("checkSchema", false)) {
            repository.preloadMetaSchema(vertx.fileSystem(), Draft.DRAFT202012);
            OutputUnit meta = repository.validator(META_SCHEMA_ID).validate(schema);
            result.put("schemaValid", meta.getValid());
            result.put("schemaErrors", errors(meta));
            if (!meta.getValid()) {
                return result;
            }
        }
        // Local refs (#/$defs/..., #anchor) only resolve once the schema is in the repository.
        String id = schema.getString("$id", REQUEST_SCHEMA_ID);
        repository.dereference(id, JsonSchema.of(schema));
        OutputUnit unit = repository.validator(id, options).validate(instance);
        result.put("valid", unit.getValid());
        result.put("errors", errors(unit));
        return result;
    }

    private static List<Map<String, String>> errors(OutputUnit unit) {
        List<Map<String, String>> out = new ArrayList<>();
        if (unit.getErrors() != null) {
            for (OutputUnit error : unit.getErrors()) {
                out.add(Map.of(
                        "keywordLocation", String.valueOf(error.getKeywordLocation()),
                        "instanceLocation", String.valueOf(error.getInstanceLocation()),
                        "error", String.valueOf(error.getError())));
            }
        }
        return out;
    }
}
