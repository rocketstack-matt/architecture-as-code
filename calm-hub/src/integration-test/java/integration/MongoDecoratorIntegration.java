package integration;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.bson.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;

import static io.restassured.RestAssured.given;
import static integration.MongoSetup.counterSetup;
import static integration.MongoSetup.namespaceSetup;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
@TestProfile(IntegrationTestProfile.class)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class MongoDecoratorIntegration {

    private static final Logger logger = LoggerFactory.getLogger(MongoDecoratorIntegration.class);

    private static int reservedId;
    private static int successorId;

    private static final String VALID_DECORATOR = """
            {
                "unique-id": "finos-architecture-1-deployment",
                "type": "deployment",
                "target": ["/api/calm/namespaces/finos/architectures/1/versions/1-0-0"],
                "target-type": ["architecture"],
                "applies-to": ["example-node"],
                "data": {
                    "start-time": "2026-02-23T10:00:00Z",
                    "status": "in-progress",
                    "notes": "Integration test decorator"
                }
            }
            """;

    private static final String UPDATED_DECORATOR = """
            {
                "unique-id": "finos-architecture-1-deployment",
                "type": "deployment",
                "target": ["/api/calm/namespaces/finos/architectures/1/versions/1-0-0"],
                "target-type": ["architecture"],
                "applies-to": ["example-node"],
                "data": {
                    "start-time": "2026-02-23T10:00:00Z",
                    "status": "completed",
                    "notes": "Integration test decorator"
                }
            }
            """;

    @Inject
    MongoTestConnection mongoTestConnection;

    @BeforeEach
    public void setup() {
        String mongoUri = mongoTestConnection.connectionString();
        String mongoDatabase = mongoTestConnection.database();

        if (mongoUri == null || mongoUri.isBlank()) {
            logger.error("MongoDB URI is not set. Check the EndToEndResource configuration.");
            throw new IllegalStateException("MongoDB URI is not set. Check the EndToEndResource configuration.");
        }

        try (MongoClient mongoClient = MongoClients.create(mongoUri)) {
            MongoDatabase database = mongoClient.getDatabase(mongoDatabase);

            if (!database.listCollectionNames().into(new ArrayList<>()).contains("decorators")) {
                database.createCollection("decorators");
                database.getCollection("decorators").insertOne(
                        new Document("namespace", "finos").append("decorators", new ArrayList<>())
                );
            }

            counterSetup(database);
            namespaceSetup(database);
        }
    }

    @Test
    @Order(1)
    void end_to_end_get_with_no_decorators() {
        given()
                .when().get("/api/calm/namespaces/finos/decorators")
                .then()
                .statusCode(200)
                .body("values", empty());
    }

    @Test
    @Order(2)
    void end_to_end_create_a_decorator() {
        given()
                .contentType(ContentType.JSON)
                .body(VALID_DECORATOR)
                .when().post("/api/calm/namespaces/finos/decorators")
                .then()
                .statusCode(201)
                .header("Location", containsString("/api/calm/namespaces/finos/decorators/1"))
                .body("id", equalTo(1));
    }

    @Test
    @Order(3)
    void end_to_end_list_decorators_contains_created_id() {
        given()
                .when().get("/api/calm/namespaces/finos/decorators")
                .then()
                .statusCode(200)
                .body("values", hasSize(1))
                .body("values[0]", equalTo(1));
    }

    @Test
    @Order(4)
    void end_to_end_retrieve_decorator_by_id() {
        given()
                .when().get("/api/calm/namespaces/finos/decorators/1")
                .then()
                .statusCode(200)
                .body("type", equalTo("deployment"))
                .body("uniqueId", equalTo("finos-architecture-1-deployment"))
                .body("target[0]", equalTo("/api/calm/namespaces/finos/architectures/1/versions/1-0-0"))
                .body("targetType[0]", equalTo("architecture"))
                .body("appliesTo[0]", equalTo("example-node"));
    }

    @Test
    @Order(5)
    void end_to_end_update_decorator_by_id() {
        given()
                .when().get("/api/calm/namespaces/finos/decorators/1")
                .then()
                .statusCode(200)
                .body("data.status", equalTo("in-progress"));

        given()
                .contentType(ContentType.JSON)
                .body(UPDATED_DECORATOR)
                .when().put("/api/calm/namespaces/finos/decorators/1")
                .then()
                .statusCode(200);

        given()
                .when().get("/api/calm/namespaces/finos/decorators/1")
                .then()
                .statusCode(200)
                .body("data.status", equalTo("completed"));
    }

    @Test
    @Order(6)
    void end_to_end_retrieve_nonexistent_decorator_returns_404() {
        given()
                .when().get("/api/calm/namespaces/finos/decorators/999")
                .then()
                .statusCode(404)
                .body(containsString("Decorator with ID 999 does not exist in namespace: finos"));
    }

    @Test
    @Order(7)
    void end_to_end_supersede_a_reserved_decorator_and_keep_the_old_one_in_the_history() {
        reservedId = given()
                .contentType(ContentType.JSON)
                .body(reservedDecorator("open"))
                .when().post("/api/calm/namespaces/finos/decorators")
                .then()
                .statusCode(201)
                .extract().path("id");
        String created = given()
                .when().get("/api/calm/namespaces/finos/decorators/" + reservedId)
                .then()
                .statusCode(200)
                .body("updateDateTime", notNullValue())
                .extract().path("creationDateTime");

        successorId = given()
                .contentType(ContentType.JSON)
                .body(reservedDecorator("closed"))
                .when().put("/api/calm/namespaces/finos/decorators/" + reservedId)
                .then()
                .statusCode(201)
                .header("Location", containsString("/api/calm/namespaces/finos/decorators/"))
                .extract().path("id");

        given()
                .when().get("/api/calm/namespaces/finos/decorators/" + reservedId)
                .then()
                .statusCode(200)
                .body("data.status", equalTo("open"))
                .body("creationDateTime", equalTo(created))
                .body("updateDateTime", equalTo(created));
        String successorCreated = given()
                .when().get("/api/calm/namespaces/finos/decorators/" + successorId)
                .then()
                .statusCode(200)
                .body("data.status", equalTo("closed"))
                .body("creationDateTime", greaterThanOrEqualTo(created))
                .extract().path("creationDateTime");
        given()
                .when().get("/api/calm/namespaces/finos/decorators/" + successorId)
                .then()
                .body("updateDateTime", equalTo(successorCreated));

        given()
                .when().get("/api/calm/namespaces/finos/decorators?type=integration-evaluation")
                .then()
                .statusCode(200)
                .body("values", contains(successorId));

        given()
                .when().get("/api/calm/namespaces/finos/decorators/" + reservedId + "/history")
                .then()
                .statusCode(200)
                .body("values", hasSize(2))
                .body("values[0].id", equalTo(successorId))
                .body("values[0].supersedes", equalTo(reservedId))
                .body("values[0].supersededBy", nullValue())
                .body("values[1].id", equalTo(reservedId))
                .body("values[1].supersededBy", equalTo(successorId))
                .body("values[1].supersededDateTime", equalTo(successorCreated))
                .body("values[1].decorator.data.status", equalTo("open"));
    }

    @Test
    @Order(8)
    void end_to_end_refuse_to_supersede_a_superseded_decorator() {
        given()
                .contentType(ContentType.JSON)
                .body(reservedDecorator("reopened"))
                .when().put("/api/calm/namespaces/finos/decorators/" + reservedId)
                .then()
                .statusCode(409)
                .body(containsString("superseded"));

        given()
                .when().get("/api/calm/namespaces/finos/decorators/" + reservedId + "/history")
                .then()
                .statusCode(200)
                .body("values", hasSize(2));
    }

    @Test
    @Order(9)
    void end_to_end_return_the_whole_history_from_any_decorator_in_it() {
        int thirdId = given()
                .contentType(ContentType.JSON)
                .body(reservedDecorator("reopened"))
                .when().put("/api/calm/namespaces/finos/decorators/" + successorId)
                .then()
                .statusCode(201)
                .extract().path("id");

        given()
                .when().get("/api/calm/namespaces/finos/decorators/" + successorId + "/history")
                .then()
                .statusCode(200)
                .body("values.id", contains(thirdId, successorId, reservedId));
    }

    @Test
    @Order(10)
    void end_to_end_delete_the_whole_history_through_an_old_decorator() {
        given()
                .when().delete("/api/calm/namespaces/finos/decorators/" + reservedId)
                .then()
                .statusCode(204);

        given()
                .when().get("/api/calm/namespaces/finos/decorators/" + reservedId + "/history")
                .then()
                .statusCode(404);
        given()
                .when().get("/api/calm/namespaces/finos/decorators/" + successorId)
                .then()
                .statusCode(404);
        given()
                .when().get("/api/calm/namespaces/finos/decorators?type=integration-evaluation")
                .then()
                .statusCode(200)
                .body("values", empty());
        given()
                .when().get("/api/calm/namespaces/finos/decorators/1")
                .then()
                .statusCode(200);
    }

    private static String reservedDecorator(String status) {
        return """
                {
                    "unique-id": "finos-architecture-1-evaluation",
                    "type": "integration-evaluation",
                    "target": ["/api/calm/namespaces/finos/architectures/1/versions/1-0-0"],
                    "target-type": ["architecture"],
                    "applies-to": ["example-node"],
                    "data": {"status": "%s"}
                }
                """.formatted(status);
    }
}
