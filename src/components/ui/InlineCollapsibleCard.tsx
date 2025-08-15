import React from 'react';
import PanelContainer from './PanelContainer';

interface InlineCollapsibleCardProps {
  id: string;
  title: string;
  subtitle?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  helpTitle?: string;
  onHelpClick?: () => void;
  canFullscreen?: boolean;
  fullscreenActive?: boolean;
  onToggleFullscreen?: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  children: React.ReactNode;
}

/**
 * InlineCollapsibleCard
 * A unified card wrapper with a compact header and inline collapse control.
 * The parent is responsible for managing `collapsed` state (e.g. via useInlineMinimize).
 */
const InlineCollapsibleCard: React.FC<InlineCollapsibleCardProps> = ({
  id,
  title,
  subtitle,
  className = '',
  contentClassName = '',
  helpTitle,
  onHelpClick,
  canFullscreen = false,
  fullscreenActive = false,
  onToggleFullscreen,
  collapsed,
  onToggleCollapse,
  children,
}) => {
  const contentId = `${id}__content`;

  return (
    <PanelContainer className={`overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">{title}</div>
          {subtitle && (
            <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 truncate">{subtitle}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Help */}
          <button
            type="button"
            title={helpTitle || 'Help'}
            aria-label="Help"
            onClick={onHelpClick}
            className="px-2 py-1 rounded-md text-xs text-gray-800 dark:text-gray-200 bg-white/40 dark:bg-gray-700/60 hover:bg-white/60 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            ?
          </button>
          {/* Fullscreen (optional) */}
          {canFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              aria-label="Toggle fullscreen"
              aria-pressed={fullscreenActive}
              className={`px-2 py-1 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                fullscreenActive
                  ? 'text-white bg-violet-600'
                  : 'text-gray-800 dark:text-gray-200 bg-white/40 dark:bg-gray-700/60 hover:bg-white/60 dark:hover:bg-gray-700'
              }`}
              title="Fullscreen"
            >
              ⛶
            </button>
          )}
          {/* Collapse toggle */}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-controls={contentId}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand' : 'Collapse'}
            className="px-2 py-1 rounded-md text-xs text-gray-800 dark:text-gray-200 bg-white/40 dark:bg-gray-700/60 hover:bg-white/60 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '▸' : '▾'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div id={contentId} className={`${collapsed ? 'hidden' : ''} ${contentClassName}`}>
        {children}
      </div>
    </PanelContainer>
  );
};

export default InlineCollapsibleCard;
