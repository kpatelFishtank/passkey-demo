"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Keeps the server-data view current while you register a passkey in another
 * window. Handy when this page is parked on a second monitor during the demo.
 */
export function AutoRefresh({ intervalMs = 3000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs]);

  return null;
}
