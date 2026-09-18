"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SRC =
  "//cdn.carbonads.com/carbon.js?serve=CWBI423E&placement=wwwrareuicom&format=responsive";

// carbon's box: 100px image, 0.6em padding, border, and the "ads via carbon" line
const RESERVED = "min-h-34";

// carbon ids every ad wrapper carbonads, carbonads_1, ... whatever the format
const AD = '[id^="carbonads"]';

declare global {
  interface Window {
    _carbonads?: { init?: (where?: Element) => void };
  }
}

export default function CarbonAds({
  count = 1,
  className,
  ...props
}: React.ComponentProps<"div"> & { count?: 1 | 2 }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const slotsRef = useRef<(HTMLDivElement | null)[]>([]);
  const pathname = usePathname();
  const [blocked, setBlocked] = useState(false);

  // re-serving on pathname is what makes a client-side route change count as a pageview
  useEffect(() => {
    const container = containerRef.current;
    const slots = slotsRef.current;
    if (!container || !slots[0]) return;

    // carbon.js is a singleton: one #_carbonads_js script, one global _carbon_where target.
    // extra slots are served one at a time, each only once the previous ad has landed.
    let served = 1;
    const observer = new MutationObserver(() => {
      while (served < count && container.querySelectorAll(AD).length >= served) {
        const slot = slots[served];
        served += 1;
        if (slot) window._carbonads?.init?.(slot);
      }
      if (served >= count) observer.disconnect();
    });

    // deferring a tick collapses the strict-mode mount/unmount/mount into one injection
    const timer = setTimeout(() => {
      if (count > 1) {
        observer.observe(container, { childList: true, subtree: true });
      }

      const script = document.createElement("script");
      script.async = true;
      script.id = "_carbonads_js";
      script.src = SRC;
      script.onerror = () => setBlocked(true);
      slots[0]?.appendChild(script);
    }, 0);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      for (const slot of slots) slot?.replaceChildren();
    };
  }, [pathname, count]);

  if (blocked) return null;

  return (
    <div
      ref={containerRef}
      data-slot="carbon-ads-group"
      className={cn(count > 1 && "grid gap-4 sm:grid-cols-2", className)}
      {...props}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            slotsRef.current[i] = el;
          }}
          data-slot="carbon-ads"
          className={RESERVED}
        />
      ))}
    </div>
  );
}
