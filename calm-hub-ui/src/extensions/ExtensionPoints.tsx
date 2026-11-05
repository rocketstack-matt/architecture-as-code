import { Link } from 'react-router-dom';
import { useExtensions } from '../components/extensions/ExtensionsContext.js';
import { ExtensionContext, ExtensionPoint } from '../model/extensions.js';
import { ExtensionSlot } from './ExtensionSlot.js';

export function ExtensionPoints({ point, context }: { point: ExtensionPoint; context?: ExtensionContext }) {
    const extensions = useExtensions();
    return extensions.flatMap((extension) =>
        (extension.contributes[point] ?? []).map((contribution) => (
            <ExtensionSlot
                key={`${extension.id}/${contribution.id}`}
                extension={extension}
                contribution={contribution}
                context={context}
                action={point === 'action'}
            />
        ))
    );
}

export function ExtensionScreenLinks({ onNavigate }: { onNavigate?: () => void } = {}) {
    const extensions = useExtensions();
    return extensions.flatMap((extension) =>
        (extension.contributes.screen ?? []).map((contribution) => (
            <Link
                onClick={onNavigate}
                className="block px-4 py-3 hover:bg-base-200"
                key={`${extension.id}/${contribution.id}`}
                to={`/extensions/${encodeURIComponent(extension.id)}/${encodeURIComponent(contribution.id)}`}
            >
                {contribution.title}
            </Link>
        ))
    );
}
