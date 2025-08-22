import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InlineCollapsibleCard from '../../src/components/ui/InlineCollapsibleCard';

function Wrapper() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <InlineCollapsibleCard
      id="test"
      title="Test Title"
      subtitle={<span>Sub</span>}
      variant="v2"
      className="panel--no-pad"
      contentClassName="p-3"
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed(c => !c)}
    >
      <div data-testid="content">Hello</div>
    </InlineCollapsibleCard>
  );
}

describe('InlineCollapsibleCard', () => {
  it('renders v2 panel with required classes and attributes', () => {
    render(<Wrapper />);
    const root = document.querySelector('[data-panel-id="test"]') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-panel-id')).toBe('test');
    expect(root.getAttribute('data-collapsed')).toBe('false');
    expect(root.getAttribute('aria-expanded')).toBe('true');
    expect(root.className).toContain('panel-v2');
    expect(root.className).toContain('panel--no-pad');

    const content = document.getElementById('test__content') as HTMLElement;
    expect(content).toBeTruthy();
    expect(content.className).not.toContain('hidden');
  });

  it('toggles collapsed state via header button', () => {
    render(<Wrapper />);

    const btn = screen.getByRole('button', { name: /collapse/i });
    fireEvent.click(btn);

    const root = document.querySelector('[data-panel-id="test"]') as HTMLElement;
    const content = document.getElementById('test__content') as HTMLElement;

    expect(root.getAttribute('data-collapsed')).toBe('true');
    expect(root.getAttribute('aria-expanded')).toBe('false');
    expect(content.className).toContain('hidden');

    // Expand again
    const expandBtn = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandBtn);

    expect(root.getAttribute('data-collapsed')).toBe('false');
    expect(root.getAttribute('aria-expanded')).toBe('true');
    expect(content.className).not.toContain('hidden');
  });
});
