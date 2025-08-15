import React from 'react';
import InlineCollapsibleCard from './ui/InlineCollapsibleCard';
import { useInlineMinimize } from '../hooks/useInlineMinimize';

export const Ladder: React.FC = () => {
  const { collapsed, toggle } = useInlineMinimize('ladder', false);

  return (
    <InlineCollapsibleCard
      id="ladder"
      title="Ladder"
      subtitle={<span className="opacity-70">Progression • Placeholder</span>}
      helpTitle="Planned: goals ladder, milestones, badges"
      onHelpClick={() => {}}
      collapsed={collapsed}
      onToggleCollapse={toggle}
      className="p-0 rounded-2xl"
      contentClassName="p-3"
    >
      <div className="text-sm text-gray-700 dark:text-gray-300">
        <p className="mb-2">This is a placeholder for the Ladder section.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Milestone ladder UI</li>
          <li>Rank progression and XP thresholds</li>
          <li>Badge showcase</li>
        </ul>
      </div>
    </InlineCollapsibleCard>
  );
};

export default Ladder;
