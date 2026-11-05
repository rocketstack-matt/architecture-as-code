import { useEffect, useMemo, useRef, useState } from 'react';
import { ExtensionContext, ExtensionContribution, ExtensionScreen, ExtensionSummary } from '../model/extensions.js';
import { ExtensionService } from '../service/extension-service.js';
import { ScreenErrorBoundary } from './ScreenErrorBoundary.js';
import { BlockRenderer } from './blocks/BlockRenderer.js';

export interface ExtensionSlotProps {
    extension: ExtensionSummary;
    contribution: ExtensionContribution;
    context?: ExtensionContext;
    action?: boolean;
}

function SlotContent({ extension, contribution, context = {}, action }: ExtensionSlotProps) {
    const service = useMemo(() => new ExtensionService(), []);
    const route = extension.routes.find((entry) => entry.id === contribution.route);
    const [result, setResult] = useState<ExtensionScreen>();
    const [error, setError] = useState(false);
    const [busy, setBusy] = useState(false);
    const actionRequest = useRef<AbortController | null>(null);
    useEffect(() => () => actionRequest.current?.abort(), []);
    const { namespace, resource, version, selectedElement } = context;
    useEffect(() => {
        if (action || !route) return;
        if (route.method !== 'GET') return;
        const controller = new AbortController();
        service
            .call(extension.id, route, { namespace, resource, version, selectedElement }, controller.signal)
            .then((data) => {
                const reply = data as ExtensionScreen | null;
                if (!reply || reply.hubApi !== extension.hubApi || !Array.isArray(reply.blocks)) {
                    throw new Error('Invalid blocks reply');
                }
                if (!controller.signal.aborted) setResult(reply);
            })
            .catch(() => {
                if (!controller.signal.aborted) setError(true);
            });
        return () => controller.abort();
    }, [service, extension.id, extension.hubApi, route, action, namespace, resource, version, selectedElement]);
    if (!route) return <p role="alert">Extension route unavailable.</p>;
    if (action)
        return (
            <div>
                <button
                    className="btn btn-sm"
                    disabled={busy}
                    onClick={async () => {
                        if (!route.readOnly && !window.confirm(`Run ${contribution.title}?`)) return;
                        const controller = new AbortController();
                        actionRequest.current = controller;
                        setBusy(true);
                        setError(false);
                        try {
                            await service.call(extension.id, route, context, controller.signal);
                        } catch {
                            if (!controller.signal.aborted) setError(true);
                        } finally {
                            if (!controller.signal.aborted) setBusy(false);
                        }
                    }}
                >
                    {contribution.title}
                </button>
                {error && <p role="alert">Extension request failed.</p>}
            </div>
        );
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
    const key = JSON.stringify([props.extension.id, props.contribution.id, props.context]);
    return (
        <ScreenErrorBoundary key={key}>
            <SlotContent key={key} {...props} />
        </ScreenErrorBoundary>
    );
}
