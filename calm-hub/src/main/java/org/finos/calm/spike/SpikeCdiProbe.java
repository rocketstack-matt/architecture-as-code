package org.finos.calm.spike;

import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.annotation.Priority;
import jakarta.decorator.Decorator;
import jakarta.decorator.Delegate;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Any;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Inject;
import jakarta.inject.Qualifier;

import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.util.Map;

/**
 * Spike for ADR 0016: does an ArC {@code @Decorator} apply to a bean from a producer method?
 * The store producers in {@code store/producer/} make beans this way.
 */
@ApplicationScoped
@IfBuildProperty(name = "calm.spike.enabled", stringValue = "true")
public class SpikeCdiProbe {

    @Inject
    @Produced
    SpikeStore produced;

    @Inject
    @Managed
    SpikeStore managed;

    @Inject
    @Wrapped
    SpikeStore wrapped;

    public Map<String, String> probe() {
        return Map.of(
                "producerMethodBean", produced.write("x"),
                "classBean", managed.write("x"),
                "producerReturnsWrapper", wrapped.write("x"));
    }

    public interface SpikeStore {
        String write(String value);
    }

    @Qualifier
    @Retention(RetentionPolicy.RUNTIME)
    public @interface Produced {
    }

    @Qualifier
    @Retention(RetentionPolicy.RUNTIME)
    public @interface Managed {
    }

    @Qualifier
    @Retention(RetentionPolicy.RUNTIME)
    public @interface Wrapped {
    }

    /** Not a bean itself: only the producer below makes it one. */
    static class PlainStore implements SpikeStore {
        @Override
        public String write(String value) {
            return "stored:" + value;
        }
    }

    /** The ADR 0016 plan: the producer wraps the store it selected. */
    static class ObservedStore implements SpikeStore {
        private final SpikeStore delegate;

        ObservedStore(SpikeStore delegate) {
            this.delegate = delegate;
        }

        @Override
        public String write(String value) {
            return "observed(" + delegate.write(value) + ")";
        }
    }

    @ApplicationScoped
    @Managed
    @IfBuildProperty(name = "calm.spike.enabled", stringValue = "true")
    public static class ManagedStore extends PlainStore {
    }

    @ApplicationScoped
    @IfBuildProperty(name = "calm.spike.enabled", stringValue = "true")
    public static class Producers {
        @Produces
        @ApplicationScoped
        @Produced
        SpikeStore produced() {
            return new PlainStore();
        }

        @Produces
        @ApplicationScoped
        @Wrapped
        SpikeStore wrapped() {
            return new ObservedStore(new PlainStore());
        }
    }

    @Decorator
    @Priority(10)
    public abstract static class DecoratedStore implements SpikeStore {
        @Inject
        @Delegate
        @Any
        SpikeStore delegate;

        @Override
        public String write(String value) {
            return "decorated(" + delegate.write(value) + ")";
        }
    }
}
