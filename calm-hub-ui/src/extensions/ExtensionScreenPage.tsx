import { useParams } from 'react-router-dom';
import { useExtensions, useExtensionsStatus } from '../components/extensions/ExtensionsContext.js';
import { Navbar } from '../components/navbar/Navbar.js';
import { ExtensionSlot } from './ExtensionSlot.js';

function ScreenBody() {
    const { extensionId, contributionId } = useParams();
    const status = useExtensionsStatus();
    const extension = useExtensions().find((entry) => entry.id === extensionId);
    const contribution = extension?.contributes.screen?.find((entry) => entry.id === contributionId);
    if (status === 'loading') return <p role="status">Loading extension…</p>;
    if (status === 'failed') return <p role="alert">Extensions could not be loaded.</p>;
    if (!extension || !contribution) return <p>Extension screen unavailable.</p>;
    return <ExtensionSlot extension={extension} contribution={contribution} />;
}

export function ExtensionScreenPage() {
    return (
        <>
            <Navbar />
            <main className="p-6">
                <ScreenBody />
            </main>
        </>
    );
}
