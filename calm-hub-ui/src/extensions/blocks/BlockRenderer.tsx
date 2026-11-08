import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScreenBlock } from '../../model/extensions.js';
import '../../hub/components/adr-renderer/AdrMarkdown.css';
import { safeHref } from '../ScreenLink.js';
import { ALERT_CLASS } from '../tone.js';
import { CardsBlock } from './CardsBlock.js';
import { KeyValueBlock } from './KeyValueBlock.js';
import { LinksBlock } from './LinksBlock.js';
import { StatsBlock } from './StatsBlock.js';
import { TableBlock } from './TableBlock.js';

export function BlockRenderer({ block }: { block: ScreenBlock }) {
    switch (block.type) {
        case 'markdown':
            return (
                <div className="adr-markdown">
                    <Markdown
                        remarkPlugins={[remarkGfm]}
                        skipHtml
                        components={{
                            a: ({ href, children }) =>
                                safeHref(href) ? (
                                    <a href={safeHref(href)} target="_blank" rel="noopener noreferrer">
                                        {children}
                                    </a>
                                ) : (
                                    <span>{children}</span>
                                ),
                            img: ({ alt }) => <span>{alt}</span>,
                        }}
                    >
                        {block.text}
                    </Markdown>
                </div>
            );
        case 'keyValue':
            return <KeyValueBlock items={block.items} />;
        case 'stats':
            return <StatsBlock items={block.items} />;
        case 'table':
            return <TableBlock columns={block.columns} rows={block.rows} />;
        case 'cards':
            return <CardsBlock items={block.items} />;
        case 'alert':
            return (
                <div role="alert" className={`alert ${ALERT_CLASS[block.tone ?? 'info']}`}>
                    <span>{block.text}</span>
                </div>
            );
        case 'links':
            return <LinksBlock items={block.items} />;
        default:
            return <p className="text-sm text-base-content/50 italic">This screen has a block type that this CALM Hub cannot show.</p>;
    }
}
