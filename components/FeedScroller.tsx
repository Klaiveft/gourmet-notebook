"use client";

import { useLayoutEffect, useRef } from "react";

const SCROLL_KEY = "feed-scroll";

/** Le swipe est un simple scroll aimanté. Retenir la position évite de repartir du haut après avoir lu une recette. */
export function FeedScroller({ children }: { children: React.ReactNode }) {
  const list = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    if (list.current) list.current.scrollTop = Number(sessionStorage.getItem(SCROLL_KEY) ?? 0);
  }, []);

  return (
    <ul
      ref={list}
      onScroll={(event) => sessionStorage.setItem(SCROLL_KEY, String(event.currentTarget.scrollTop))}
      className="mx-auto h-full max-w-lg snap-y snap-mandatory overflow-y-scroll overscroll-contain [scrollbar-width:none]"
    >
      {children}
    </ul>
  );
}
