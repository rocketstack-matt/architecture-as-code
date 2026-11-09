import { useEffect, useState } from 'react';
import { ExtensionContext, ExtensionContribution, ExtensionScreen, ExtensionSummary } from '../model/extensions.js';
import { ExtensionActionButton } from './ExtensionActionButton.js';
import { Heading, HeadingLevel } from './Heading.js';
import { ScreenErrorBoundary } from './ScreenErrorBoundary.js';
import { BlockRenderer } from './blocks/BlockRenderer.js';
import { isBlocksReply } from './blocks/reply.js';
import { useExtensionService } from './ExtensionsContext.js';

export interface ExtensionSlotProps {
    extension: ExtensionSummary;
    contribution: ExtensionContribution;
    context?: ExtensionContext;
    action?: boolean;
    /** The level of the slot title: one below the heading of the place that holds the slot. */
    headingLevel?: HeadingLevel;
}

function SlotContent({ extension, contribution, context = {}, action, headingLevel = 2 }: ExtensionSlotProps) {
    const service = useExtensionService();
    const route = extension.routes.find((entry) => entry.id === contribution.route);
    const [result, setResult] = useState<ExtensionScreen>();
    const [error, setError] = useState(false);
    const { namespace, resource, resourceType, resourceId, version, selectedElement } = context;
    useEffect(() => {
        if (action || !route) return;
        if (route.method !== 'GET') return;
        const controller = new AbortController();
        service
            .call(extension.id, route, { namespace, resource, resourceType, resourceId, version, selectedElement }, controller.signal)
            .then((reply) => {
                if (!isBlocksReply(reply, extension.hubApi)) throw new Error('Invalid blocks reply');
                if (!controller.signal.aborted) setResult(reply);
            })
            .catch(() => {
                if (!controller.signal.aborted) setError(true);
            });
        return () => controller.abort();
    }, [service, extension.id, extension.hubApi, route, action, namespace, resource, resourceType, resourceId, version, selectedElement]);
    if (action) {
        if (!route) return <p role="alert">Extension route unavailable.</p>;
        return <ExtensionActionButton service={service} extension={extension} contribution={contribution} route={route} context={context} />;
    }
    // A slot keeps its heading in every state, so the outline does not change (on a screen page, it is the h1).
    const state = !route ? (
        <p role="alert">Extension route unavailable.</p>
    ) : error ? (
        <p role="alert">Extension request failed.</p>
    ) : route.method !== 'GET' ? (
        <p role="alert">Block routes must use GET.</p>
    ) : !result ? (
        <p role="status">Loading extension…</p>
    ) : undefined;
    return (
        <section className="@container flex flex-col gap-4 min-w-0 overflow-auto" aria-label={contribution.title}>
            <SlotTitle level={headingLevel}>{result?.title ?? contribution.title}</SlotTitle>
            {state ?? result?.blocks.map((block, index) => <BlockRenderer key={index} block={block} headingLevel={headingLevel} />)}
        </section>
    );
}

function SlotTitle({ level, children }: { level: HeadingLevel; children: string }) {
    return (
        <Heading level={level} className="text-lg font-bold">
            {children}
        </Heading>
    );
}

export function ExtensionSlot(props: ExtensionSlotProps) {
    // An action keeps its state when the context changes, so a change of selection does not reset a running write.
    const key = JSON.stringify([props.extension.id, props.contribution.id, props.action ? null : props.context]);
    return (
        <ScreenErrorBoundary
            key={key}
            heading={props.action ? undefined : <SlotTitle level={props.headingLevel ?? 2}>{props.contribution.title}</SlotTitle>}
        >
            <SlotContent key={key} {...props} />
        </ScreenErrorBoundary>
    );
}
