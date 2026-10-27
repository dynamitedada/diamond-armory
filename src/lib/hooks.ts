import { useEffect } from 'react';

const SITE = 'Diamond Armory';

/** Sets the tab title for the current page. */
export function useTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : `${SITE} · Build your baseball player`;
  }, [title]);
}
