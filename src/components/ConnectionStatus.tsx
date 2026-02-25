"use client";

import { useState, useEffect } from "react";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { onSyncStatusChange } from "@/lib/syncManager";

export function ConnectionStatus() {
  const { isOnline } = useOnlineStatus();
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error">(
    "idle"
  );
  const [queueLength, setQueueLength] = useState(0);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const unsub = onSyncStatusChange((status, queueLen) => {
      setSyncStatus(status);
      setQueueLength(queueLen);
    });
    return unsub;
  }, []);

  // Show banner when offline or syncing
  useEffect(() => {
    if (!isOnline || syncStatus === "syncing" || queueLength > 0) {
      setShowBanner(true);
    } else {
      // Keep showing briefly after going back online
      const timer = setTimeout(() => setShowBanner(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, syncStatus, queueLength]);

  if (!showBanner) return null;

  let bgColor: string;
  let text: string;

  if (!isOnline) {
    bgColor = "#e74c3c";
    text =
      queueLength > 0
        ? `Offline \u2014 ${queueLength} \u00e4ndring${queueLength > 1 ? "ar" : ""} v\u00e4ntar`
        : "Offline \u2014 \u00e4ndringar sparas lokalt";
  } else if (syncStatus === "syncing") {
    bgColor = "#b8860b";
    text = `Synkar ${queueLength} \u00e4ndring${queueLength > 1 ? "ar" : ""}...`;
  } else if (queueLength > 0) {
    bgColor = "#b8860b";
    text = `${queueLength} \u00e4ndring${queueLength > 1 ? "ar" : ""} att synka`;
  } else {
    bgColor = "#27ae60";
    text = "Online \u2014 allt synkat";
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-semibold text-white shadow-md transition-all"
      style={{ backgroundColor: bgColor }}
    >
      <span>{!isOnline ? "\uD83D\uDCE1" : syncStatus === "syncing" ? "\uD83D\uDD04" : queueLength > 0 ? "\u23F3" : "\u2705"}</span>
      <span>{text}</span>
    </div>
  );
}
