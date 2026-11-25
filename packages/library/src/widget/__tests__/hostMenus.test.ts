import { describe, expect, it, vi } from 'vitest';
import { pickHostItem, withHostItems } from '../hostMenus.js';

describe('host menu submenus', () => {
  it('dispatches only the chosen nested leaf, preserving native entries', () => {
    const parent = vi.fn(), first = vi.fn(), second = vi.fn(), flat = vi.fn();
    const items = [{ label: 'Buy', onSelect: parent, submenu: [
      { label: '1', onSelect: first }, { label: '2', onSelect: second },
    ] }, { label: 'Close', onSelect: flat }];
    expect(withHostItems([{ id: 'reset', label: 'Reset' }], items)).toMatchObject([
      { id: 'reset' }, 'separator', { id: 'host:0', submenu: [{ id: 'host:0:0' }, { id: 'host:0:1' }] }, { id: 'host:1' },
    ]);
    expect(pickHostItem('reset', items)).toBe(false);
    pickHostItem('host:0', items);
    pickHostItem('host:0:1', items);
    pickHostItem('host:1', items);
    expect(parent).not.toHaveBeenCalled();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(flat).toHaveBeenCalledTimes(1);
  });
});
