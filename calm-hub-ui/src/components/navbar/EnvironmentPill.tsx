import { CSSProperties, useEffect, useId, useRef, useState } from 'react';
import { EnvironmentColourToken, UiEnvironment } from '../../model/ui-config.js';
import { textColourFor } from './text-colour.js';

// Literal class names, because Tailwind does not find class names built at runtime.
const TOKEN_CLASSES: Record<EnvironmentColourToken, string> = {
    info: 'badge-info',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    neutral: 'badge-neutral',
};

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;

/** A long name is truncated, and a touch screen has no hover, so a tap or a key press shows the full name. */
export function EnvironmentPill({ environment }: { environment: UiEnvironment }) {
    const [open, setOpen] = useState(false);
    const fullNameId = useId();
    const root = useRef<HTMLSpanElement>(null);
    const tokenClass = TOKEN_CLASSES[environment.colour as EnvironmentColourToken];
    const style: CSSProperties | undefined =
        !tokenClass && HEX_COLOUR.test(environment.colour)
            ? { backgroundColor: environment.colour, borderColor: environment.colour, color: textColourFor(environment.colour) }
            : undefined;

    useEffect(() => {
        if (!open) return;
        // Safari does not focus a tapped button, so a blur cannot close it.
        const onPointerDown = (event: PointerEvent) => {
            if (!root.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [open]);

    return (
        <span ref={root} className="relative inline-flex shrink min-w-0">
            <button
                type="button"
                className={`badge badge-sm lg:badge-md font-semibold uppercase shrink min-w-0 max-w-[4.25rem] sm:max-w-32 lg:max-w-48 cursor-pointer ${tokenClass ?? ''}`}
                style={style}
                title={environment.name}
                aria-expanded={open}
                aria-controls={open ? fullNameId : undefined}
                onClick={() => setOpen((shown) => !shown)}
                onKeyDown={(event) => {
                    if (event.key === 'Escape') setOpen(false);
                }}
                data-testid="environment-pill"
            >
                <span className="truncate">{environment.name}</span>
            </button>
            {open && (
                <span
                    id={fullNameId}
                    className={`badge badge-sm lg:badge-md font-semibold uppercase whitespace-nowrap absolute left-0 top-full mt-1 z-50 ${tokenClass ?? ''}`}
                    style={style}
                    data-testid="environment-pill-full-name"
                >
                    {environment.name}
                </span>
            )}
        </span>
    );
}
