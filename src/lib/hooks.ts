import { useEffect } from 'react';
import { useUi } from '../ui/theme';

const SITE = 'Diamond Armory';

/** Sets the tab title for the current page. */
export function useTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : `${SITE} · Build your baseball player`;
  }, [title]);
}

/**
 * While a sticky `.actionbar` is showing on a page that isn't the armory: lifts the feedback button
 * above it and exposes its height as --bar-h.
 */
export function useActionBarSpacing(active: boolean) {
  useEffect(() => {
    const ui = useUi.getState();
    ui.setBottomBar(active);
    if (!active) return;
    const bar = document.querySelector<HTMLElement>('.actionbar');
    const root = document.documentElement;
    const ro = bar ? new ResizeObserver(() => root.style.setProperty('--bar-h', `${bar.offsetHeight}px`)) : null;
    if (bar && ro) ro.observe(bar);
    return () => {
      ro?.disconnect();
      root.style.removeProperty('--bar-h');
      useUi.getState().setBottomBar(false);
    };
  }, [active]);
}
