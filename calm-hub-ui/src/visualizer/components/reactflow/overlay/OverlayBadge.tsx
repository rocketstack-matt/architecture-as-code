import { THEME } from '../theme.js';
import { statusText } from '../../../overlay/overlayEngine.js';
import { OVERLAY_STYLES } from './overlayStyle.js';
import type { ShownOverlay } from '../../../context/DecoratorOverlayContext.js';

/** The badge a decorator view draws beside a node's label. */
export function OverlayBadge({ shown, presenting }: { shown: ShownOverlay; presenting: boolean }) {
    const { view, overlay } = shown;
    const style = OVERLAY_STYLES[overlay.status];
    const Icon = style.icon;
    const label = statusText(overlay.value);
    const icon = presenting ? '18px' : '12px';
    return (
        <div
            data-testid="overlay-badge"
            data-view={view.id}
            data-status={overlay.status}
            data-value={overlay.value}
            // role="img" so the label is announced: aria-label is not allowed on a plain div.
            role="img"
            aria-label={`${view.label}: ${label}`}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: presenting ? '3px 8px' : '2px 6px',
                borderRadius: '4px',
                fontSize: presenting ? '18px' : '12px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                background: `${style.accent}20`,
                color: style.text,
            }}
        >
            <Icon aria-hidden="true" style={{ width: icon, height: icon }} />
            <span>{label}</span>
        </div>
    );
}

/** An edge shows only the views that need attention: the edge itself is too thin to carry an ok badge. */
export function OverlayEdgeBadge({ shown, presenting }: { shown: ShownOverlay; presenting: boolean }) {
    const { view, overlay } = shown;
    const style = OVERLAY_STYLES[overlay.status];
    const label = statusText(overlay.value);
    return (
        <span
            data-testid="edge-overlay-badge"
            data-view={view.id}
            data-status={overlay.status}
            style={{
                fontSize: presenting ? '18px' : '11px',
                fontWeight: 600,
                padding: presenting ? '3px 8px' : '2px 4px',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
                background: THEME.colors.card,
                border: `1px solid ${style.accent}`,
                color: style.text,
            }}
        >
            <span aria-hidden="true">{style.glyph}</span> {label}
        </span>
    );
}
