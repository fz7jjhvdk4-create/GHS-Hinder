"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="ml-auto shrink-0 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/25 hover:text-white active:bg-white/10 disabled:opacity-50"
      title="Logga ut"
    >
      {loading ? "..." : "Logga ut"}
    </button>
  );
}
