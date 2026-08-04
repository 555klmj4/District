"use client";
import { useEffect, useState } from "react";

// Measures env(safe-area-inset-top) as a plain px number via a detached probe
// element, so callers can use it in normal JS arithmetic (HEADER_PX + x)
// instead of rewriting every position calc into an env()-aware CSS string.
// Returns 0 in a normal browser tab / non-notched device.
export function useSafeAreaTop(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;top:0;left:0;width:1px;height:env(safe-area-inset-top,0px);pointer-events:none;visibility:hidden;";
    document.body.appendChild(probe);

    const update = () => setInset(probe.getBoundingClientRect().height);
    update();

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      probe.remove();
    };
  }, []);

  return inset;
}
