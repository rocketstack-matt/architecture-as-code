package org.finos.calm.resources;

import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import org.bson.json.JsonParseException;
import org.finos.calm.domain.Pattern;
import org.finos.calm.domain.exception.NamespaceNotFoundException;
import org.finos.calm.domain.exception.PatternNotFoundException;
import org.finos.calm.domain.exception.PatternVersionExistsException;
import org.finos.calm.domain.exception.PatternVersionNotFoundException;
import org.finos.calm.domain.pattern.CreatePatternRequest;
import org.finos.calm.domain.namespaces.NamespaceResourceSummary;
import org.finos.calm.services.ThumbnailService;
import org.finos.calm.store.PageRequest;
import org.finos.calm.store.PatternStore;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import static io.restassured.RestAssured.given;
import static org.finos.calm.resources.ResourceValidationConstants.LIMIT_MESSAGE;
import static org.finos.calm.resources.ResourceValidationConstants.NAMESPACE_MESSAGE;
import static org.finos.calm.resources.ResourceValidationConstants.OFFSET_MESSAGE;
import static org.finos.calm.resources.ResourceValidationConstants.VERSION_MESSAGE;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@TestSecurity(authorizationEnabled = false)
@QuarkusTest
@ExtendWith(MockitoExtension.class)
public class TestPatternResourceShould {

    @InjectMock
    PatternStore mockPatternStore;

    @InjectMock
    ThumbnailService mockThumbnailService;

    @Test
    void return_a_404_when_an_invalid_namespace_is_provided_on_get_patterns() throws NamespaceNotFoundException {
        when(mockPatternStore.getPatternsForNamespace(anyString(), any())).thenThrow(new NamespaceNotFoundException());

        given()
                .when()
                .get("/api/calm/namespaces/invalid/patterns")
                .then()
                .statusCode(404);

        verify(mockPatternStore, times(1)).getPatternsForNamespace("invalid", PageRequest.UNPAGED);
    }

    @Test
    void return_a_400_when_an_invalid_format_of_namespace_is_provided_on_get_patterns() throws NamespaceNotFoundException {
        given()
                .when()
                .get("/api/calm/namespaces/fin_os/patterns")
                .then()
                .statusCode(400)
                .body(containsString(NAMESPACE_MESSAGE));
    }

    @Test
    void return_list_of_pattern_summaries_when_valid_namespace_provided_on_get_patterns() throws NamespaceNotFoundException {
        List<NamespaceResourceSummary> summaries = Arrays.asList(
                new NamespaceResourceSummary("Pattern One", "First", 12345, 3),
                new NamespaceResourceSummary("Pattern Two", "Second", 54321, 1)
        );
        when(mockPatternStore.getPatternsForNamespace(anyString(), any())).thenReturn(summaries);

        given()
                .when()
                .get("/api/calm/namespaces/finos/patterns")
                .then()
                .statusCode(200)
                .body("values[0].name", equalTo("Pattern One"))
                .body("values[0].description", equalTo("First"))
                .body("values[0].id", equalTo(12345))
                .body("values[0].versionCount", equalTo(3))
                .body("values[1].name", equalTo("Pattern Two"))
                .body("values[1].description", equalTo("Second"))
                .body("values[1].id", equalTo(54321))
                .body("values[1].versionCount", equalTo(1));

        verify(mockPatternStore, times(1)).getPatternsForNamespace("finos", PageRequest.UNPAGED);
    }

    @Test
    void pass_limit_and_offset_to_store_when_provided_on_get_patterns() throws NamespaceNotFoundException {
        when(mockPatternStore.getPatternsForNamespace(anyString(), any())).thenReturn(List.of());

        given()
                .when()
                .get("/api/calm/namespaces/finos/patterns?limit=3&offset=6")
                .then()
                .statusCode(200);

        verify(mockPatternStore, times(1)).getPatternsForNamespace("finos", new PageRequest(3, 6));
    }

    @Test
    void return_a_400_when_limit_is_less_than_one_on_get_patterns() {
        given()
                .when()
                .get("/api/calm/namespaces/finos/patterns?limit=0")
                .then()
                .statusCode(400)
                .body(containsString(LIMIT_MESSAGE));
    }

    @Test
    void return_a_400_when_offset_is_negative_on_get_patterns() {
        given()
                .when()
                .get("/api/calm/namespaces/finos/patterns?offset=-1")
                .then()
                .statusCode(400)
                .body(containsString(OFFSET_MESSAGE));
    }

    @Test
    void return_a_404_when_invalid_namespace_is_provided_on_create_pattern() throws NamespaceNotFoundException {
        when(mockPatternStore.createPatternForNamespace(any(CreatePatternRequest.class), anyString()))
                .thenThrow(new NamespaceNotFoundException());

        String requestBody = "{ \"name\": \"Test\", \"description\": \"desc\", \"patternJson\": \"{ \\\"test\\\": \\\"json\\\" }\" }";

        given()
                .header("Content-Type", "application/json")
                .body(requestBody)
                .when()
                .post("/api/calm/namespaces/invalid/patterns")
                .then()
                .statusCode(404);

        verify(mockPatternStore, times(1)).createPatternForNamespace(any(CreatePatternRequest.class), eq("invalid"));
    }

    @Test
    void return_a_400_when_invalid_pattern_json_is_provided_on_create_pattern() throws NamespaceNotFoundException {
        when(mockPatternStore.createPatternForNamespace(any(CreatePatternRequest.class), anyString()))
                .thenThrow(new JsonParseException());

        String requestBody = "{ \"name\": \"Test\", \"description\": \"desc\", \"patternJson\": \"invalid json\" }";

        given()
                .header("Content-Type", "application/json")
                .body(requestBody)
                .when()
                .post("/api/calm/namespaces/invalid/patterns")
                .then()
                .statusCode(400);

        verify(mockPatternStore, times(1)).createPatternForNamespace(any(CreatePatternRequest.class), eq("invalid"));
    }

    @Test
    void return_a_400_when_an_invalid_format_of_namespace_is_provided_on_create_pattern() throws NamespaceNotFoundException {

        String requestBody = "{ \"name\": \"Test\", \"description\": \"desc\", \"patternJson\": \"{}\" }";

        given()
                .header("Content-Type", "application/json")
                .body(requestBody)
                .when()
                .post("/api/calm/namespaces/invalid_/patterns")
                .then()
                .statusCode(400)
                .body(containsString(NAMESPACE_MESSAGE));
    }

    @Test
    void return_a_created_with_location_of_pattern_when_creating_pattern() throws NamespaceNotFoundException {
        String patternJson = "{ \"test\": \"json\" }";
        String namespace = "finos";

        Pattern stubbedReturnPattern = new Pattern.PatternBuilder()
                .setPattern(patternJson)
                .setVersion("1.0.0")
                .setId(12)
                .setNamespace(namespace)
                .build();

        when(mockPatternStore.createPatternForNamespace(any(CreatePatternRequest.class), eq(namespace))).thenReturn(stubbedReturnPattern);

        String requestBody = "{ \"name\": \"Test\", \"description\": \"desc\", \"patternJson\": \"{ \\\"test\\\": \\\"json\\\" }\" }";

        given()
                .header("Content-Type", "application/json")
                .body(requestBody)
                .when()
                .post("/api/calm/namespaces/finos/patterns")
                .then()
                .statusCode(201)
                //Derived from stubbed pattern in resource
                .header("Location", containsString("/api/calm/namespaces/finos/patterns/12/versions/1.0.0"));

        verify(mockPatternStore, times(1)).createPatternForNamespace(any(CreatePatternRequest.class), eq(namespace));
    }

    @Test
    void return_a_400_when_an_invalid_format_of_namespace_is_provided_on_get_pattern_versions() throws NamespaceNotFoundException {
        given()
                .when()
                .get("/api/calm/namespaces/fin_os/patterns/12/versions")
                .then()
                .statusCode(400)
                .body(containsString(NAMESPACE_MESSAGE));
    }

    private void verifyExpectedPatternForVersions(String namespace) throws PatternNotFoundException, NamespaceNotFoundException {
        Pattern expectedPatternToRetrieve = new Pattern.PatternBuilder()
                .setNamespace(namespace)
                .setId(12)
                .build();

        verify(mockPatternStore, times(1)).getPatternVersions(expectedPatternToRetrieve);
    }

    static Stream<Arguments> provideParametersForPatternVersionTests() {
        return Stream.of(
                Arguments.of("invalid", new NamespaceNotFoundException(), 404),
                Arguments.of("valid", new PatternNotFoundException(), 404),
                Arguments.of("valid", null, 200)
        );
    }

    @ParameterizedTest
    @MethodSource("provideParametersForPatternVersionTests")
    void respond_correctly_to_get_pattern_versions_query(String namespace, Throwable exceptionToThrow, int expectedStatusCode) throws PatternNotFoundException, NamespaceNotFoundException {
        var versions = List.of("1.0.0", "1.0.1");
        if (exceptionToThrow != null) {
            when(mockPatternStore.getPatternVersions(any(Pattern.class))).thenThrow(exceptionToThrow);
        } else {
            when(mockPatternStore.getPatternVersions(any(Pattern.class))).thenReturn(versions);
        }

        if (expectedStatusCode == 200 ) {
            String expectedBody = "{\"values\":[\"1.0.0\",\"1.0.1\"]}";
            given()
                    .when()
                    .get("/api/calm/namespaces/" + namespace + "/patterns/12/versions")
                    .then()
                    .statusCode(expectedStatusCode)
                    .body(equalTo(expectedBody));
        } else {
            given()
                    .when()
                    .get("/api/calm/namespaces/" + namespace + "/patterns/12/versions")
                    .then()
                    .statusCode(expectedStatusCode);
        }

        verifyExpectedPatternForVersions(namespace);
    }

    @Test
    void return_a_400_when_an_invalid_format_of_namespace_is_provided_on_get_pattern() throws NamespaceNotFoundException {
        given()
                .when()
                .get("/api/calm/namespaces/fin_os/patterns/12/versions/1.0.0")
                .then()
                .statusCode(400)
                .body(containsString(NAMESPACE_MESSAGE));
    }

    @Test
    void return_a_400_when_an_invalid_format_of_version_is_provided_on_get_pattern() throws NamespaceNotFoundException {
        given()
                .when()
                .get("/api/calm/namespaces/finos/patterns/12/versions/1.0.invalid0")
                .then()
                .statusCode(400)
                .body(containsString(VERSION_MESSAGE));
    }

    private void verifyExpectedGetPattern(String namespace) throws PatternNotFoundException, NamespaceNotFoundException, PatternVersionNotFoundException {
        Pattern expectedPatternToRetrieve = new Pattern.PatternBuilder()
                .setNamespace(namespace)
                .setId(12)
                .setVersion("1.0.0")
                .build();

        verify(mockPatternStore, times(1)).getPatternForVersion(expectedPatternToRetrieve);
    }

    static Stream<Arguments> provideParametersForGetPatternTests() {
        return Stream.of(
                Arguments.of("invalid", new NamespaceNotFoundException(), 404),
                Arguments.of("valid", new PatternNotFoundException(), 404),
                Arguments.of("valid", new PatternVersionNotFoundException(), 404),
                Arguments.of("valid", null, 200)
        );
    }

    @ParameterizedTest
    @MethodSource("provideParametersForGetPatternTests")
    void respond_to_get_pattern_for_a_specific_version_correctly(String namespace, Throwable exceptionToThrow, int expectedStatusCode) throws PatternNotFoundException, NamespaceNotFoundException, PatternVersionNotFoundException {
        if (exceptionToThrow != null) {
            when(mockPatternStore.getPatternForVersion(any(Pattern.class))).thenThrow(exceptionToThrow);
        } else {
            String pattern = "{ \"test\": \"json\" }";
            when(mockPatternStore.getPatternForVersion(any(Pattern.class))).thenReturn(pattern);
        }

        if (expectedStatusCode == 200) {
            given()
                    .when()
                    .get("/api/calm/namespaces/" + namespace + "/patterns/12/versions/1.0.0")
                    .then()
                    .statusCode(expectedStatusCode)
                    .body(equalTo("{ \"test\": \"json\" }"));
        } else {
            given()
                    .when()
                    .get("/api/calm/namespaces/" + namespace + "/patterns/12/versions/1.0.0")
                    .then()
                    .statusCode(expectedStatusCode);
        }

        verifyExpectedGetPattern(namespace);
    }

    @Test
    void return_a_400_when_an_invalid_format_of_namespace_is_provided_on_create_new_pattern_version() throws NamespaceNotFoundException {
        given()
                .when()
                .header("Content-Type", "application/json")
                .body("{\"name\":\"n\",\"description\":\"d\",\"patternJson\":\"{ \\\"test\\\": \\\"json\\\" }\"}")
                .post("/api/calm/namespaces/fin_os/patterns/20/versions/1.0.1")
                .then()
                .statusCode(400)
                .body(containsString(NAMESPACE_MESSAGE));
    }

    @Test
    void return_a_400_when_an_invalid_format_of_version_is_provided_on_create_new_pattern_version() throws NamespaceNotFoundException {
        given()
                .when()
                .header("Content-Type", "application/json")
                .body("{\"name\":\"n\",\"description\":\"d\",\"patternJson\":\"{ \\\"test\\\": \\\"json\\\" }\"}")
                .post("/api/calm/namespaces/finos/patterns/20/versions/1.0invalid.1")
                .then()
                .statusCode(400)
                .body(containsString(VERSION_MESSAGE));
    }

    @Test
    void return_a_400_when_envelope_patternJson_is_missing_on_create_new_pattern_version() {
        given()
                .when()
                .header("Content-Type", "application/json")
                .body("{\"name\":\"n\",\"description\":\"d\"}")
                .post("/api/calm/namespaces/finos/patterns/20/versions/1.0.1")
                .then()
                .statusCode(400);
    }

    static Stream<Arguments> provideParametersForCreatePatternTests() {
        return Stream.of(
                Arguments.of( new NamespaceNotFoundException(), 404),
                Arguments.of( new PatternNotFoundException(), 404),
                Arguments.of(new PatternVersionExistsException(), 409),
                Arguments.of(new JsonParseException(), 400),
                Arguments.of(null, 201)
        );
    }

    @ParameterizedTest
    @MethodSource("provideParametersForCreatePatternTests")
    void respond_correctly_to_create_new_pattern_version(Throwable exceptionToThrow, int expectedStatusCode) throws PatternNotFoundException, PatternVersionExistsException, NamespaceNotFoundException {
        Pattern expectedPattern = new Pattern.PatternBuilder()
                .setNamespace("test")
                .setVersion("1.0.1")
                .setPattern("{ \"test\": \"json\" }")
                .setId(20)
                .build();

        String envelopeBody = "{\"name\":\"my-pattern\",\"description\":\"desc\",\"patternJson\":\"{ \\\"test\\\": \\\"json\\\" }\"}";

        if (exceptionToThrow != null) {
            when(mockPatternStore.createPatternForVersion(expectedPattern)).thenThrow(exceptionToThrow);
        } else {
            when(mockPatternStore.createPatternForVersion(expectedPattern)).thenReturn(expectedPattern);
        }

        if(expectedStatusCode == 201) {
            given()
                    .header("Content-Type", "application/json")
                    .body(envelopeBody)
                    .when()
                    .post("/api/calm/namespaces/test/patterns/20/versions/1.0.1")
                    .then()
                    .statusCode(expectedStatusCode)
                    //Derived from stubbed pattern in resource
                    .header("Location", containsString("/api/calm/namespaces/test/patterns/20/versions/1.0.1"));
        } else {
            given()
                    .header("Content-Type", "application/json")
                    .body(envelopeBody)
                    .when()
                    .post("/api/calm/namespaces/test/patterns/20/versions/1.0.1")
                    .then()
                    .statusCode(expectedStatusCode);
        }

        verify(mockPatternStore, times(1)).createPatternForVersion(expectedPattern);
    }

    @Test
    void return_forbidden_for_put_operations_on_patterns_by_default_and_when_configured() {
        given()
                .header("Content-Type", "application/json")
                .body("{\"name\":\"n\",\"description\":\"d\",\"patternJson\":\"{ \\\"test\\\": \\\"json\\\" }\"}")
                .when()
                .put("/api/calm/namespaces/test/patterns/20/versions/1.0.1")
                .then()
                .statusCode(403);
    }

    // --- Thumbnails ---

    private static final byte[] PNG_BYTES = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47};

    @Test
    void return_stored_thumbnail_bytes_for_a_pattern_version() throws NamespaceNotFoundException, PatternNotFoundException, PatternVersionNotFoundException {
        when(mockPatternStore.getThumbnail(any(Pattern.class))).thenReturn(PNG_BYTES);

        byte[] body = given()
                .when()
                .get("/api/calm/namespaces/finos/patterns/12/versions/1.0.0/thumbnail")
                .then()
                .statusCode(200)
                .contentType("image/png")
                .header("Cache-Control", equalTo("private, max-age=300"))
                .extract().asByteArray();

        assertArrayEquals(PNG_BYTES, body);
        Pattern expected = new Pattern.PatternBuilder()
                .setNamespace("finos").setId(12).setVersion("1.0.0").build();
        verify(mockPatternStore, times(1)).getThumbnail(expected);
    }

    @Test
    void return_a_404_for_a_missing_pattern_thumbnail_when_rendering_is_disabled() throws NamespaceNotFoundException, PatternNotFoundException, PatternVersionNotFoundException {
        when(mockPatternStore.getThumbnail(any(Pattern.class))).thenReturn(null);
        when(mockThumbnailService.isEnabled()).thenReturn(false);

        given()
                .when()
                .get("/api/calm/namespaces/finos/patterns/12/versions/1.0.0/thumbnail")
                .then()
                .statusCode(404);

        verify(mockThumbnailService, never()).renderSync(anyString(), anyString(), anyString(), any());
    }

    @Test
    void render_a_missing_pattern_thumbnail_on_demand_and_return_it() throws NamespaceNotFoundException, PatternNotFoundException, PatternVersionNotFoundException {
        String patternJson = "{ \"test\": \"json\" }";
        when(mockPatternStore.getThumbnail(any(Pattern.class))).thenReturn(null);
        when(mockPatternStore.getPatternForVersion(any(Pattern.class))).thenReturn(patternJson);
        when(mockThumbnailService.isEnabled()).thenReturn(true);
        when(mockThumbnailService.renderSync(anyString(), anyString(), anyString(), any()))
                .thenReturn(Optional.of(PNG_BYTES));

        byte[] body = given()
                .when()
                .get("/api/calm/namespaces/finos/patterns/12/versions/1.0.0/thumbnail")
                .then()
                .statusCode(200)
                .contentType("image/png")
                .extract().asByteArray();

        assertArrayEquals(PNG_BYTES, body);
        verify(mockThumbnailService, times(1)).renderSync(
                eq("finos/patterns/12/1.0.0"), eq("pattern"), eq(patternJson), any());
    }

    @Test
    void return_a_404_when_the_on_demand_pattern_thumbnail_render_fails() throws NamespaceNotFoundException, PatternNotFoundException, PatternVersionNotFoundException {
        when(mockPatternStore.getThumbnail(any(Pattern.class))).thenReturn(null);
        when(mockPatternStore.getPatternForVersion(any(Pattern.class))).thenReturn("{}");
        when(mockThumbnailService.isEnabled()).thenReturn(true);
        when(mockThumbnailService.renderSync(anyString(), anyString(), anyString(), any()))
                .thenReturn(Optional.empty());

        given()
                .when()
                .get("/api/calm/namespaces/finos/patterns/12/versions/1.0.0/thumbnail")
                .then()
                .statusCode(404);
    }

    @Test
    void return_the_latest_version_pattern_thumbnail_when_no_version_is_specified() throws NamespaceNotFoundException, PatternNotFoundException, PatternVersionNotFoundException {
        // 10.0.0 is latest under numeric segment comparison (a lexical compare would pick 9.0.0)
        when(mockPatternStore.getPatternVersions(any(Pattern.class)))
                .thenReturn(List.of("1.0.0", "10.0.0", "9.0.0"));
        when(mockPatternStore.getThumbnail(any(Pattern.class))).thenReturn(PNG_BYTES);

        given()
                .when()
                .get("/api/calm/namespaces/finos/patterns/12/thumbnail")
                .then()
                .statusCode(200)
                .contentType("image/png");

        Pattern expected = new Pattern.PatternBuilder()
                .setNamespace("finos").setId(12).setVersion("10.0.0").build();
        verify(mockPatternStore, times(1)).getThumbnail(expected);
    }

    @Test
    void return_a_404_for_a_latest_thumbnail_of_an_unknown_pattern() throws NamespaceNotFoundException, PatternNotFoundException {
        when(mockPatternStore.getPatternVersions(any(Pattern.class)))
                .thenThrow(new PatternNotFoundException());

        given()
                .when()
                .get("/api/calm/namespaces/finos/patterns/99/thumbnail")
                .then()
                .statusCode(404);
    }

    @Test
    void trigger_an_async_thumbnail_render_after_a_successful_pattern_version_create() throws NamespaceNotFoundException, PatternNotFoundException, PatternVersionExistsException {
        String patternJson = "{ \"test\": \"json\" }";
        when(mockPatternStore.createPatternForVersion(any(Pattern.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CreatePatternRequest patternRequest = new CreatePatternRequest();
        patternRequest.setName("test-pattern");
        patternRequest.setDescription("test description");
        patternRequest.setPatternJson(patternJson);

        given()
                .header("Content-Type", "application/json")
                .body(patternRequest)
                .when()
                .post("/api/calm/namespaces/test/patterns/20/versions/1.0.1")
                .then()
                .statusCode(201);

        verify(mockThumbnailService, times(1)).triggerRender(
                eq("test/patterns/20/1.0.1"), eq("pattern"), eq(patternJson), any());
    }

    @Test
    void not_trigger_a_thumbnail_render_when_the_pattern_version_create_fails() throws NamespaceNotFoundException, PatternNotFoundException, PatternVersionExistsException {
        when(mockPatternStore.createPatternForVersion(any(Pattern.class)))
                .thenThrow(new PatternVersionExistsException());

        CreatePatternRequest patternRequest = new CreatePatternRequest();
        patternRequest.setName("test-pattern");
        patternRequest.setDescription("test description");
        patternRequest.setPatternJson("{ \"test\": \"json\" }");

        given()
                .header("Content-Type", "application/json")
                .body(patternRequest)
                .when()
                .post("/api/calm/namespaces/test/patterns/20/versions/1.0.1")
                .then()
                .statusCode(409);

        verify(mockThumbnailService, never()).triggerRender(anyString(), anyString(), anyString(), any());
    }
}
