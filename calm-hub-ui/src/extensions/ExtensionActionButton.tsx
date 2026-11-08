import { useEffect, useRef, useState } from 'react';
import { ExtensionContext, ExtensionContribution, ExtensionRoute, ExtensionSummary } from '../model/extensions.js';
import { ExtensionService } from '../service/extension-service.js';
import { actionRunKey, useActionRunning, useActionRuns } from './actionRuns.js';
import { ConfirmActionDialog } from './ConfirmActionDialog.js';

interface ExtensionActionButtonProps {
    service: ExtensionService;
    extension: ExtensionSummary;
    contribution: ExtensionContribution;
    route: ExtensionRoute;
    context: ExtensionContext;
}

interface Outcome {
    /** The context the call was for: the message shows only while that context is on screen. */
    for: string;
    ok: boolean;
}

const contextKey = ({ namespace, resource, resourceType, resourceId, version, selectedElement }: ExtensionContext) =>
    JSON.stringify([namespace, resource, resourceType, resourceId, version, selectedElement]);

export function ExtensionActionButton({ service, extension, contribution, route, context }: ExtensionActionButtonProps) {
    const runs = useActionRuns();
    const runKey = actionRunKey(extension.id, contribution.id);
    const busy = useActionRunning(runs, runKey);
    const [outcome, setOutcome] = useState<Outcome>();
    const [pending, setPending] = useState<ExtensionContext>();
    const readRequest = useRef<AbortController | null>(null);
    useEffect(() => () => readRequest.current?.abort(), []);

    const run = async (target: ExtensionContext) => {
        if (runs.isRunning(runKey)) return;
        // A write the user confirmed is never aborted: the backend can still finish it, so a retry could write twice.
        const controller = route.readOnly ? new AbortController() : undefined;
        readRequest.current = controller ?? null;
        runs.start(runKey);
        setOutcome(undefined);
        try {
            await service.call(extension.id, route, target, controller?.signal);
            if (!controller?.signal.aborted) setOutcome({ for: contextKey(target), ok: true });
        } catch {
            if (!controller?.signal.aborted) setOutcome({ for: contextKey(target), ok: false });
        } finally {
            runs.finish(runKey);
        }
    };

    const shown = outcome?.for === contextKey(context) ? outcome : undefined;
    return (
        <div>
            <button className="btn btn-sm" disabled={busy} onClick={() => (route.readOnly ? run(context) : setPending(context))}>
                {contribution.title}
            </button>
            {pending && (
                <ConfirmActionDialog
                    title={contribution.title}
                    target={pending}
                    onConfirm={() => {
                        setPending(undefined);
                        run(pending);
                    }}
                    onCancel={() => setPending(undefined)}
                />
            )}
            {shown?.ok === false && <p role="alert">Extension request failed.</p>}
            {shown?.ok && (
                <p role="status" className="text-xs text-success">
                    {contribution.title}: done.
                </p>
            )}
        </div>
    );
}
