import { useEffect, useState } from 'react';
import { ExtensionContext, ExtensionContribution, ExtensionScreen, ExtensionSummary } from '../model/extensions.js';
import { ExtensionActionButton } from './ExtensionActionButton.js';
import { ScreenErrorBoundary } from './ScreenErrorBoundary.js';
import { BlockRenderer } from './blocks/BlockRenderer.js';
import { isBlocksReply } from './blocks/reply.js';
import { useExtensionService } from './ExtensionsContext.js';

export interface ExtensionSlotProps {
    extension: ExtensionSummary;
    contribution: ExtensionContribution;
    context?: ExtensionContext;
    action?: boolean;
}

function SlotContent({ extension, contribution, context = {}, action }: ExtensionSlotProps) {
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
    if (!route) return <p role="alert">Extension route unavailable.</p>;
    if (action) return <ExtensionActionButton service={service} extension={extension} contribution={contribution} route={route} context={context} />;
    if (error) return <p role="alert">Extension request failed.</p>;
    if (route.method !== 'GET') return <p role="alert">Block routes must use GET.</p>;
    if (!result) return <p role="status">Loading extension…</p>;
    return (
        <section className="flex flex-col gap-4 min-w-0 overflow-auto" aria-label={contribution.title}>
            <h2 className="text-lg font-bold">{result.title ?? contribution.title}</h2>
            {result.blocks.map((block, index) => (
                <BlockRenderer key={index} block={block} />
            ))}
        </section>
    );
}

export function ExtensionSlot(props: ExtensionSlotProps) {
    // An action keeps its state when the context changes, so a change of selection does not reset a running write.
    const key = JSON.stringify([props.extension.id, props.contribution.id, props.action ? null : props.context]);
    return (
        <ScreenErrorBoundary key={key}>
            <SlotContent key={key} {...props} />
        </ScreenErrorBoundary>
    );
}
