package org.finos.calm.spike;

import io.vertx.core.Vertx;
import io.vertx.core.json.Json;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.json.schema.Draft;
import io.vertx.json.schema.JsonSchema;
import io.vertx.json.schema.JsonSchemaOptions;
import io.vertx.json.schema.OutputFormat;
import io.vertx.json.schema.SchemaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Q2, wider: runs vertx-json-schema over the official JSON-Schema-Test-Suite (required
 * draft2020-12 tests, not {@code optional/}) and prints a score for each file. Measures; does
 * not gate. Run with {@code -Dspike.jsts.dir=<clone of json-schema-org/JSON-Schema-Test-Suite>}.
 */
@EnabledIfSystemProperty(named = "spike.jsts.dir", matches = ".+")
class TestSpikeJsonSchemaSuite {

    private static final String REMOTES = "http://localhost:1234/";

    @Test
    void score_the_draft_2020_12_suite() throws IOException {
        Path root = Path.of(System.getProperty("spike.jsts.dir"));
        Vertx vertx = Vertx.vertx();
        int passed = 0;
        int total = 0;
        List<String> failures = new ArrayList<>();
        try (Stream<Path> files = Files.list(root.resolve("tests/draft2020-12"))) {
            for (Path file : files.filter(p -> p.toString().endsWith(".json")).sorted().toList()) {
                int filePassed = 0;
                int fileTotal = 0;
                JsonArray groups = new JsonArray(Files.readString(file));
                for (Object g : groups) {
                    JsonObject group = (JsonObject) g;
                    for (Object t : group.getJsonArray("tests")) {
                        JsonObject test = (JsonObject) t;
                        fileTotal++;
                        boolean expected = test.getBoolean("valid");
                        String outcome;
                        try {
                            boolean actual = validate(vertx, root, group.getValue("schema"), test.getValue("data"));
                            outcome = actual == expected ? null : "got " + actual;
                        } catch (RuntimeException e) {
                            outcome = e.getClass().getSimpleName() + ": " + firstLine(e.getMessage());
                        }
                        if (outcome == null) {
                            filePassed++;
                        } else {
                            failures.add(file.getFileName() + " / " + group.getString("description")
                                    + " / " + test.getString("description") + " -> " + outcome);
                        }
                    }
                }
                System.out.printf("[jsts] %-32s %3d/%3d%n", file.getFileName(), filePassed, fileTotal);
                passed += filePassed;
                total += fileTotal;
            }
        } finally {
            vertx.close();
        }
        System.out.printf("[jsts] TOTAL %d/%d (%.1f%%)%n", passed, total, 100.0 * passed / total);
        failures.forEach(f -> System.out.println("[jsts-fail] " + f));
        assertTrue(total > 0);
    }

    private static boolean validate(Vertx vertx, Path root, Object schema, Object data) throws RuntimeException {
        JsonSchemaOptions options = new JsonSchemaOptions()
                .setDraft(Draft.DRAFT202012)
                .setBaseUri("https://test.json-schema.org/")
                .setOutputFormat(OutputFormat.Flag);
        SchemaRepository repository = SchemaRepository.create(options);
        repository.preloadMetaSchema(vertx.fileSystem(), Draft.DRAFT202012);
        loadRemotes(repository, root.resolve("remotes"));
        if (schema instanceof Boolean b) {
            return repository.validator(JsonSchema.of(b), options).validate(data).getValid();
        }
        // As SpikeSchemaValidator does: put the schema in the repository so local refs resolve.
        JsonObject object = (JsonObject) schema;
        String id = object.getString("$id", "https://test.json-schema.org/root.json");
        repository.dereference(id, JsonSchema.of(object));
        return repository.validator(id, options).validate(data).getValid();
    }

    private static void loadRemotes(SchemaRepository repository, Path remotes) {
        try (Stream<Path> paths = Files.walk(remotes)) {
            for (Path p : paths.filter(f -> f.toString().endsWith(".json")).toList()) {
                String rel = remotes.relativize(p).toString().replace('\\', '/');
                if (rel.startsWith("draft") && !rel.startsWith("draft2020-12/")) {
                    continue;
                }
                Object json = Json.decodeValue(Files.readString(p));
                if (json instanceof JsonObject object) {
                    repository.dereference(REMOTES + rel, JsonSchema.of(object));
                }
            }
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String firstLine(String message) {
        return message == null ? "" : message.lines().findFirst().orElse("");
    }
}
