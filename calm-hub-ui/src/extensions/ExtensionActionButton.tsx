import { useEffect, useRef, useState } from 'react';
import { ExtensionContext, ExtensionContribution, ExtensionRoute, ExtensionSummary } from '../model/extensions.js';
import { ExtensionService } from '../service/extension-service.js';
import { ConfirmActionDialog } from './ConfirmActionDialog.js';

interface ExtensionActionButtonProps {
    service: ExtensionService;
    extension: ExtensionSummary;
    contribution: ExtensionContribution;
    route: ExtensionRoute;
    context: ExtensionContext;
}

export function ExtensionActionButton({ service, extension, contribution, route, context }: ExtensionActionButtonProps) {
    const [error, setError] = useState(false);
    const [busy, setBusy] = useState(false);
    const [pending, setPending] = useState<ExtensionContext>();
    const readRequest = useRef<AbortController | null>(null);
    useEffect(() => () => readRequest.current?.abort(), []);

    const run = async (target: ExtensionContext) => {
        // A write the user confirmed is never aborted: the backend can still finish it, so a retry could write twice.
        const controller = route.readOnly ? new AbortController() : undefined;
        readRequest.current = controller ?? null;
        setBusy(true);
        setError(false);
        try {
            await service.call(extension.id, route, target, controller?.signal);
        } catch {
            if (!controller?.signal.aborted) setError(true);
        } finally {
            if (!controller?.signal.aborted) setBusy(false);
        }
    };

    return (
        <div>
            <button className="btn btn-sm" disabled={busy} onClick={() => (route.readOnly ? run(context) : setPending(context))}>
                {contribution.title}
            </button>
            <ConfirmActionDialog
                open={!!pending}
                title={contribution.title}
                onConfirm={() => {
                    const target = pending;
                    setPending(undefined);
                    if (target) run(target);
                }}
                onCancel={() => setPending(undefined)}
            />
            {error && <p role="alert">Extension request failed.</p>}
        </div>
    );
}
