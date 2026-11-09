import { useEffect, useRef, useState } from 'react';
import { ExtensionContext, ExtensionContribution, ExtensionRoute, ExtensionSummary } from '../model/extensions.js';
import { ExtensionService } from '../service/extension-service.js';
import { actionRunKey, useActionOutcome, useActionRunning, useActionRuns } from './actionRuns.js';
import { ConfirmActionDialog } from './ConfirmActionDialog.js';

interface ExtensionActionButtonProps {
    service: ExtensionService;
    extension: ExtensionSummary;
    contribution: ExtensionContribution;
    route: ExtensionRoute;
    context: ExtensionContext;
}

const contextKey = ({ namespace, resource, resourceType, resourceId, version, selectedElement }: ExtensionContext) =>
    JSON.stringify([namespace, resource, resourceType, resourceId, version, selectedElement]);

export function ExtensionActionButton({ service, extension, contribution, route, context }: ExtensionActionButtonProps) {
    const runs = useActionRuns();
    const runKey = actionRunKey(extension.id, contribution.id);
    const busy = useActionRunning(runs, runKey);
    const outcome = useActionOutcome(runs, runKey);
    const [pending, setPending] = useState<ExtensionContext>();
    const readRequest = useRef<AbortController | null>(null);
    const button = useRef<HTMLButtonElement>(null);
    useEffect(() => () => readRequest.current?.abort(), []);

    const key = contextKey(context);
    // A result is for one context: a change of context clears it, so it cannot show again on a return to that context.
    useEffect(() => {
        if (outcome && outcome.for !== key) runs.clearOutcome(runKey);
    }, [outcome, key, runs, runKey]);

    const run = async (target: ExtensionContext) => {
        if (runs.isRunning(runKey)) return;
        // A write the user confirmed is never aborted: the backend can still finish it, so a retry could write twice.
        const controller = route.readOnly ? new AbortController() : undefined;
        readRequest.current = controller ?? null;
        runs.start(runKey);
        let ok = false;
        try {
            await service.call(extension.id, route, target, controller?.signal);
            ok = true;
        } catch {
            ok = false;
        } finally {
            runs.finish(runKey, controller?.signal.aborted ? undefined : { for: contextKey(target), ok });
        }
    };

    const closeDialog = () => {
        setPending(undefined);
        // The dialog unmounts, so the browser does not give focus back to the button.
        button.current?.focus();
    };

    const shown = outcome?.for === key ? outcome : undefined;
    return (
        <div>
            {/* aria-disabled, not disabled: a disabled button loses focus, and focus goes back to it after the dialog. */}
            <button
                ref={button}
                className={`btn btn-sm${busy ? ' btn-disabled' : ''}`}
                aria-disabled={busy}
                onClick={() => {
                    if (busy) return;
                    if (route.readOnly) run(context);
                    else setPending(context);
                }}
            >
                {contribution.title}
            </button>
            {pending && (
                <ConfirmActionDialog
                    title={contribution.title}
                    target={pending}
                    onConfirm={() => {
                        closeDialog();
                        run(pending);
                    }}
                    onCancel={closeDialog}
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
