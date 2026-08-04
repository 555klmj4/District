"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function NavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const pathRef = useRef(pathname);

  useEffect(() => {
    if (pathRef.current !== pathname) {
      setActive(false);
      pathRef.current = pathname;
    }
  }, [pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin === window.location.origin && url.pathname !== window.location.pathname) {
          setActive(true);
        }
      } catch {
        // ignore
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  if (!active) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[9999] h-0.5 overflow-hidden pointer-events-none">
      <div className="loading-bar h-full bg-primary" />
    </div>
  );
}
