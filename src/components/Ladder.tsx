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
      {/* Vertical "space ladder" big picture */}
      <div className="relative min-h-[60vh] rounded-md border border-white/10 bg-gradient-to-b from-gray-900/60 to-gray-800/30 p-6">
        {/* Central spine */}
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-white/15" />

        {/* Rungs */}
        <div className="relative">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="relative flex items-center justify-center my-8">
              <div className="h-0.5 w-36 bg-white/55 dark:bg-white/45 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.18)]" />
            </div>
          ))}
        </div>

        {/* Extra spacing before Deck B to imply distance */}
        <div className="h-28" />
      </div>
    </InlineCollapsibleCard>
  );
};

export default Ladder;
