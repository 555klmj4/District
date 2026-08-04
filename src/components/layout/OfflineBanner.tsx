"use client";
import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

// navigator.onLine / the online-offline events are not trustworthy here —
// notably, iOS Safari in standalone (home-screen) PWA mode is known to get
// stuck reporting offline regardless of actual connectivity. Instead, probe
// a real same-origin request and use its success/failure as the source of
// truth; the browser events are kept only as a trigger to re-probe sooner.
const PROBE_INTERVAL_MS = 20000;

async function isReachable(): Promise<boolean> {
  try {
    const res = await fetch("/manifest.json", { method: "HEAD", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    let cancelled = false;

    const probe = () => {
      if (document.visibilityState !== "visible") return;
      void isReachable().then((online) => {
        if (!cancelled) setIsOffline(!online);
      });
    };

    probe();
    const interval = setInterval(probe, PROBE_INTERVAL_MS);
    document.addEventListener("visibilitychange", probe);
    window.addEventListener("online", probe);
    window.addEventListener("offline", probe);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", probe);
      window.removeEventListener("online", probe);
      window.removeEventListener("offline", probe);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[100] bg-destructive text-destructive-foreground text-xs font-medium text-center py-1.5 pt-safe flex items-center justify-center gap-1.5">
      <WifiOff className="w-3.5 h-3.5" />
      {t("offline_title")}
    </div>
  );
}
