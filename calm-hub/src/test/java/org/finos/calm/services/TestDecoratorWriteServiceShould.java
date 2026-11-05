package org.finos.calm.services;

import io.quarkus.security.identity.SecurityIdentity;
import org.bson.json.JsonParseException;
import org.finos.calm.config.DecoratorConfig;
import org.finos.calm.domain.Decorator;
import org.finos.calm.domain.DecoratorHistoryEntry;
import org.finos.calm.domain.DecoratorSchemaError;
import org.finos.calm.domain.exception.DecoratorNotFoundException;
import org.finos.calm.domain.exception.DecoratorSchemaValidationException;
import org.finos.calm.domain.exception.DecoratorSupersededException;
import org.finos.calm.domain.exception.ReservedDecoratorTypeException;
import org.finos.calm.store.DecoratorStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TestDecoratorWriteServiceShould {

    private static final String NAMESPACE = "finos";
    private static final String WRITER = "policy-engine";
    private static final String RESERVED_JSON = "{\"type\": \"control-evaluation\", \"data\": {}}";
    private static final String UNRESERVED_JSON = "{\"type\": \"threat-model\", \"data\": {}}";

    @Mock
    DecoratorStore mockDecoratorStore;

    @Mock
    DecoratorConfig mockConfig;

    @Mock
    DecoratorSchemaValidator mockSchemaValidator;

    DecoratorWriteService service;

    @BeforeEach
    void setup() {
        DecoratorConfig.ReservedType reserved = () -> List.of(WRITER);
        lenient().when(mockConfig.reserved()).thenReturn(Map.of("control-evaluation", reserved));
        lenient().when(mockSchemaValidator.validate(any())).thenReturn(List.of());
        service = new DecoratorWriteService(mockDecoratorStore, mockConfig, mockSchemaValidator);
    }

    @Test
    void create_a_reserved_decorator_for_a_configured_writer() throws Exception {
        when(mockDecoratorStore.createDecorator(NAMESPACE, RESERVED_JSON)).thenReturn(7);

        assertThat(service.createDecorator(WRITER, NAMESPACE, RESERVED_JSON), is(7));
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"alice"})
    void refuse_a_reserved_decorator_from_any_other_principal(String principal) {
        ReservedDecoratorTypeException e = assertThrows(ReservedDecoratorTypeException.class,
                () -> service.createDecorator(principal, NAMESPACE, RESERVED_JSON));

        assertThat(e.getType(), is("control-evaluation"));
        verifyNoInteractions(mockDecoratorStore);
    }

    @ParameterizedTest
    @ValueSource(strings = {UNRESERVED_JSON, "{\"type\": 42}", "{}"})
    void create_an_unreserved_decorator_for_any_principal(String json) throws Exception {
        service.createDecorator("alice", NAMESPACE, json);

        verify(mockDecoratorStore).createDecorator(NAMESPACE, json);
    }

    @Test
    void refuse_a_decorator_that_does_not_match_its_schema() {
        List<DecoratorSchemaError> errors = List.of(new DecoratorSchemaError("/data", "bad"));
        when(mockSchemaValidator.validate(any())).thenReturn(errors);

        DecoratorSchemaValidationException e = assertThrows(DecoratorSchemaValidationException.class,
                () -> service.createDecorator("alice", NAMESPACE, UNRESERVED_JSON));

        assertThat(e.getErrors(), is(errors));
        verifyNoInteractions(mockDecoratorStore);
    }

    @Test
    void check_the_reserved_type_before_the_schema() {
        assertThrows(ReservedDecoratorTypeException.class,
                () -> service.createDecorator("alice", NAMESPACE, RESERVED_JSON));

        verifyNoInteractions(mockSchemaValidator);
    }

    @ParameterizedTest
    @ValueSource(strings = {"not json", "[1, 2]", "null"})
    void refuse_json_that_is_not_an_object(String json) {
        assertThrows(JsonParseException.class, () -> service.createDecorator("alice", NAMESPACE, json));
    }

    @Test
    void refuse_a_missing_body() {
        assertThrows(JsonParseException.class, () -> service.createDecorator("alice", NAMESPACE, null));
    }

    @Test
    void update_an_unreserved_decorator_for_any_principal() throws Exception {
        when(mockDecoratorStore.getDecoratorById(NAMESPACE, 1)).thenReturn(Optional.of(decorator("threat-model")));

        assertThat(service.updateDecorator("alice", NAMESPACE, 1, UNRESERVED_JSON), is(1));

        verify(mockDecoratorStore).updateDecorator(NAMESPACE, 1, UNRESERVED_JSON);
        verify(mockDecoratorStore, never()).supersedeDecorator(anyString(), anyInt(), anyString());
    }

    @Test
    void supersede_a_reserved_decorator_instead_of_updating_it() throws Exception {
        when(mockDecoratorStore.getDecoratorById(NAMESPACE, 1)).thenReturn(Optional.of(decorator("control-evaluation")));
        when(mockDecoratorStore.supersedeDecorator(NAMESPACE, 1, RESERVED_JSON)).thenReturn(8);

        assertThat(service.updateDecorator(WRITER, NAMESPACE, 1, RESERVED_JSON), is(8));

        verify(mockDecoratorStore, never()).updateDecorator(anyString(), anyInt(), anyString());
    }

    @Test
    void supersede_an_unreserved_decorator_that_changes_to_a_reserved_type() throws Exception {
        when(mockDecoratorStore.getDecoratorById(NAMESPACE, 1)).thenReturn(Optional.of(decorator("threat-model")));
        when(mockDecoratorStore.supersedeDecorator(NAMESPACE, 1, RESERVED_JSON)).thenReturn(8);

        assertThat(service.updateDecorator(WRITER, NAMESPACE, 1, RESERVED_JSON), is(8));
    }

    @Test
    void pass_on_that_a_decorator_has_already_been_superseded() throws Exception {
        when(mockDecoratorStore.getDecoratorById(NAMESPACE, 1)).thenReturn(Optional.of(decorator("control-evaluation")));
        when(mockDecoratorStore.supersedeDecorator(NAMESPACE, 1, RESERVED_JSON)).thenThrow(new DecoratorSupersededException());

        assertThrows(DecoratorSupersededException.class,
                () -> service.updateDecorator(WRITER, NAMESPACE, 1, RESERVED_JSON));
    }

    @Test
    void refuse_updating_an_unreserved_entry_that_has_been_superseded() throws Exception {
        when(mockDecoratorStore.getDecoratorById(NAMESPACE, 1)).thenReturn(Optional.of(decorator("threat-model")));
        when(mockDecoratorStore.getDecoratorHistory(NAMESPACE, 1)).thenReturn(List.of(
                new DecoratorHistoryEntry(1, null, 2, decorator("threat-model"))));

        assertThrows(DecoratorSupersededException.class,
                () -> service.updateDecorator("alice", NAMESPACE, 1, UNRESERVED_JSON));

        verify(mockDecoratorStore, never()).updateDecorator(anyString(), anyInt(), anyString());
    }

    @Test
    void refuse_an_update_of_a_reserved_decorator_from_another_principal() throws Exception {
        when(mockDecoratorStore.getDecoratorById(NAMESPACE, 1)).thenReturn(Optional.of(decorator("control-evaluation")));

        assertThrows(ReservedDecoratorTypeException.class,
                () -> service.updateDecorator("alice", NAMESPACE, 1, UNRESERVED_JSON));
        verify(mockDecoratorStore, never()).updateDecorator(anyString(), anyInt(), anyString());
    }

    @Test
    void refuse_an_update_to_a_reserved_type_from_another_principal() throws Exception {
        when(mockDecoratorStore.getDecoratorById(NAMESPACE, 1)).thenReturn(Optional.of(decorator("threat-model")));

        assertThrows(ReservedDecoratorTypeException.class,
                () -> service.updateDecorator("alice", NAMESPACE, 1, RESERVED_JSON));
        verify(mockDecoratorStore, never()).updateDecorator(anyString(), anyInt(), anyString());
    }

    @Test
    void leave_a_missing_decorator_on_update_to_the_store() throws Exception {
        when(mockDecoratorStore.getDecoratorById(NAMESPACE, 1)).thenReturn(Optional.empty());
        doThrow(new DecoratorNotFoundException())
                .when(mockDecoratorStore).updateDecorator(NAMESPACE, 1, UNRESERVED_JSON);

        assertThrows(DecoratorNotFoundException.class,
                () -> service.updateDecorator("alice", NAMESPACE, 1, UNRESERVED_JSON));
    }

    @Test
    void delete_a_reserved_decorator_for_a_configured_writer() throws Exception {
        when(mockDecoratorStore.getDecoratorById(NAMESPACE, 1)).thenReturn(Optional.of(decorator("control-evaluation")));

        when(mockDecoratorStore.getDecoratorHistory(NAMESPACE, 1)).thenReturn(List.of(
                new DecoratorHistoryEntry(1, null, null, decorator("control-evaluation"))));

        service.deleteDecorator(WRITER, NAMESPACE, 1);

        verify(mockDecoratorStore).deleteCurrentDecoratorHistory(NAMESPACE, 1);
    }

    @Test
    void delete_only_the_history_that_was_authorized() throws Exception {
        when(mockDecoratorStore.getDecoratorById(NAMESPACE, 1)).thenReturn(Optional.of(decorator("control-evaluation")));
        when(mockDecoratorStore.getDecoratorHistory(NAMESPACE, 1)).thenReturn(List.of(
                new DecoratorHistoryEntry(2, 1, null, decorator("control-evaluation")),
                new DecoratorHistoryEntry(1, null, 2, decorator("control-evaluation"))));

        service.deleteDecorator(WRITER, NAMESPACE, 1);

        verify(mockDecoratorStore).deleteCurrentDecoratorHistory(NAMESPACE, 2);
        verify(mockDecoratorStore, never()).deleteDecorator(anyString(), anyInt());
    }

    @Test
    void refuse_a_delete_of_a_reserved_decorator_from_another_principal() throws Exception {
        when(mockDecoratorStore.getDecoratorById(NAMESPACE, 1)).thenReturn(Optional.of(decorator("control-evaluation")));

        assertThrows(ReservedDecoratorTypeException.class, () -> service.deleteDecorator("alice", NAMESPACE, 1));
        verify(mockDecoratorStore, never()).deleteDecorator(anyString(), anyInt());
    }

    @Test
    void refuse_deleting_reserved_history_through_an_unreserved_entry() throws Exception {
        when(mockDecoratorStore.getDecoratorById(NAMESPACE, 1)).thenReturn(Optional.of(decorator("threat-model")));
        when(mockDecoratorStore.getDecoratorHistory(NAMESPACE, 1)).thenReturn(List.of(
                new DecoratorHistoryEntry(2, 1, null, decorator("control-evaluation")),
                new DecoratorHistoryEntry(1, null, 2, decorator("threat-model"))));

        assertThrows(ReservedDecoratorTypeException.class, () -> service.deleteDecorator("alice", NAMESPACE, 1));

        verify(mockDecoratorStore, never()).deleteDecorator(anyString(), anyInt());
    }

    @Test
    void leave_a_missing_decorator_on_delete_to_the_store() throws Exception {
        when(mockDecoratorStore.getDecoratorById(NAMESPACE, 1)).thenReturn(Optional.empty());

        service.deleteDecorator("alice", NAMESPACE, 1);

        verify(mockDecoratorStore).deleteDecorator(NAMESPACE, 1);
    }

    @Test
    void report_which_types_are_reserved() {
        assertThat(service.isReserved("control-evaluation"), is(true));
        assertThat(service.isReserved("threat-model"), is(false));
        assertThat(service.isReserved(null), is(false));
    }

    @Test
    void name_the_principal_of_an_identity() {
        SecurityIdentity identity = mock(SecurityIdentity.class);
        Principal principal = () -> "alice";
        when(identity.getPrincipal()).thenReturn(principal);

        assertThat(DecoratorWriteService.principalName(identity), is("alice"));
    }

    @Test
    void name_no_principal_for_an_anonymous_or_missing_identity() {
        SecurityIdentity identity = mock(SecurityIdentity.class);
        when(identity.isAnonymous()).thenReturn(true);

        assertThat(DecoratorWriteService.principalName(identity), is(nullValue()));
        assertThat(DecoratorWriteService.principalName(null), is(nullValue()));
    }

    private static Decorator decorator(String type) {
        return new Decorator.DecoratorBuilder().setType(type).build();
    }
}
