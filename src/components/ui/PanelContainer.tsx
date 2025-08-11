import React from 'react';

export interface PanelContainerProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * PanelContainer
 * Reusable wrapper that applies Flowship's premium glass cockpit styling.
 * - Uses existing .panel-glass tokens from theme.css for glassmorphism.
 * - Adds .panel-cockpit for 16px radius, subtle multi-layer glow, and micro-interactions.
 * - Does NOT enforce padding to preserve existing component spacing. Pass padding via className.
 */
export const PanelContainer: React.FC<PanelContainerProps> = ({
  className = '',
  children,
  ...rest
}) => {
  return (
    <div
      className={`panel-glass panel-cockpit ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export default PanelContainer;
