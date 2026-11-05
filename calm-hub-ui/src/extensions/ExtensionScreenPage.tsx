import { useParams } from 'react-router-dom';
import { useExtensions } from '../components/extensions/ExtensionsContext.js';
import { Navbar } from '../components/navbar/Navbar.js';
import { ExtensionSlot } from './ExtensionSlot.js';

export function ExtensionScreenPage() {
    const { extensionId, contributionId } = useParams();
    const extension = useExtensions().find((entry) => entry.id === extensionId);
    const contribution = extension?.contributes.screen?.find((entry) => entry.id === contributionId);
    return (
        <>
            <Navbar />
            <main className="p-6">
                {extension && contribution ? (
                    <ExtensionSlot extension={extension} contribution={contribution} />
                ) : (
                    <p>Extension screen unavailable.</p>
                )}
            </main>
        </>
    );
}
