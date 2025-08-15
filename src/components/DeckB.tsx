import React from 'react';
import InlineCollapsibleCard from './ui/InlineCollapsibleCard';
import { useInlineMinimize } from '../hooks/useInlineMinimize';

export const DeckB: React.FC = () => {
  const { collapsed, toggle } = useInlineMinimize('deck-b', false);

  return (
    <InlineCollapsibleCard
      id="deck-b"
      title="Deck B"
      subtitle={<span className="opacity-70">Operations • Placeholder</span>}
      helpTitle="Planned: utilities, quick actions, and stats"
      onHelpClick={() => {}}
      collapsed={collapsed}
      onToggleCollapse={toggle}
      className="p-0 rounded-2xl"
      contentClassName="p-3"
    >
      <div className="text-sm text-gray-700 dark:text-gray-300">
        <p className="mb-2">This is a placeholder for the Deck B section.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Quick actions panel</li>
          <li>Mini stats and diagnostics</li>
          <li>Shortcuts and tips</li>
        </ul>
      </div>
    </InlineCollapsibleCard>
  );
};

export default DeckB;
