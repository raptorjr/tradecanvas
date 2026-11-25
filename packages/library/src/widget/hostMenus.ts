import type { ContextMenuEntry } from './WidgetContextMenu.js';
import type { WidgetMenuItem } from './types.js';

const HOST_PREFIX = 'host:';

function hostEntries(items: readonly WidgetMenuItem[], prefix = HOST_PREFIX): ContextMenuEntry[] {
  return items.map((item, i) => {
    const id = prefix + i;
    return { id, label: item.label, icon: item.icon, danger: item.danger, checked: item.checked,
      ...(item.submenu?.length ? { submenu: hostEntries(item.submenu, id + ':') } : {}) };
  });
}

/** A menu's entries with a host's own after them, a separator between. */
export function withHostItems(entries: readonly ContextMenuEntry[], items: readonly WidgetMenuItem[]): ContextMenuEntry[] {
  return [...entries, ...(entries.length > 0 && items.length > 0 ? ['separator' as const] : []), ...hostEntries(items)];
}

/** Runs the host entry picked; false when the entry is the widget's own. */
export function pickHostItem(id: string, items: readonly WidgetMenuItem[]): boolean {
  if (!id.startsWith(HOST_PREFIX)) return false;
  const indices = id.slice(HOST_PREFIX.length).split(':');
  let choices = items;
  let item: WidgetMenuItem | undefined;
  for (const index of indices) {
    if (!/^\d+$/.test(index)) return true;
    item = choices[Number(index)];
    if (!item) return true;
    choices = item.submenu ?? [];
  }
  if (!item?.submenu?.length) item?.onSelect();
  return true;
}
