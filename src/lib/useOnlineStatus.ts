"use client";

import { useState, useEffect, useCallback } from "react";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  const checkConnectivity = useCallback(async () => {
    try {
      const res = await fetch("/api/health", {
        method: "HEAD",
        cache: "no-store",
      });
      setIsOnline(res.ok);
    } catch {
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      window.dispatchEvent(new CustomEvent("app-online"));
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial active check
    checkConnectivity();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkConnectivity]);

  return { isOnline, checkConnectivity };
}
