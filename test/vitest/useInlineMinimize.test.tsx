import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useInlineMinimize } from '../../src/hooks/useInlineMinimize';

function TestComp({ id = 'test-panel', defaultCollapsed = false }) {
  const { collapsed, toggle } = useInlineMinimize(id, defaultCollapsed);
  return (
    <div>
      <div data-testid="state">{collapsed ? 'collapsed' : 'expanded'}</div>
      <button onClick={toggle}>toggle</button>
    </div>
  );
}

describe('useInlineMinimize', () => {
  beforeEach(() => {
    (window.localStorage.getItem as any).mockReset?.();
    (window.localStorage.setItem as any).mockReset?.();
  });

  it('initializes from defaultCollapsed when no storage', () => {
    (window.localStorage.getItem as any).mockImplementation(() => null);
    render(<TestComp defaultCollapsed={true} />);
    expect(screen.getByTestId('state').textContent).toBe('collapsed');
  });

  it('reads initial state from localStorage and persists on toggle', async () => {
    (window.localStorage.getItem as any).mockImplementation((key: string) => {
      return key === 'card-collapse:test-panel' ? '0' : null; // expanded
    });
    render(<TestComp />);

    // Initially expanded
    expect(screen.getByTestId('state').textContent).toBe('expanded');

    // Toggle -> collapsed
    fireEvent.click(screen.getByText('toggle'));

    await waitFor(() => {
      expect(screen.getByTestId('state').textContent).toBe('collapsed');
      expect(window.localStorage.setItem).toHaveBeenCalledWith('card-collapse:test-panel', '1');
    });

    // Toggle -> expanded
    fireEvent.click(screen.getByText('toggle'));

    await waitFor(() => {
      expect(screen.getByTestId('state').textContent).toBe('expanded');
      expect(window.localStorage.setItem).toHaveBeenLastCalledWith('card-collapse:test-panel', '0');
    });
  });

  it('responds to inline-collapse:all event', async () => {
    (window.localStorage.getItem as any).mockImplementation(() => null);
    render(<TestComp defaultCollapsed={false} />);

    // Ensure expanded first
    expect(screen.getByTestId('state').textContent).toBe('expanded');

    // Fire global collapse event
    window.dispatchEvent(new Event('inline-collapse:all'));

    await waitFor(() => {
      expect(screen.getByTestId('state').textContent).toBe('collapsed');
    });
  });

  it('responds to inline-collapse:set for the same panel id', async () => {
    (window.localStorage.getItem as any).mockImplementation(() => null);
    render(<TestComp defaultCollapsed={true} />);

    const el = document.createElement('div');
    el.setAttribute('data-panel-id', 'test-panel');
    document.body.appendChild(el);

    // Request expand
    const evt = new CustomEvent('inline-collapse:set', { detail: { collapsed: false }, bubbles: true });
    el.dispatchEvent(evt);

    await waitFor(() => {
      expect(screen.getByTestId('state').textContent).toBe('expanded');
    });
  });
});
