"use client";

import {
  getCachedResponse,
  setCachedResponse,
  addToQueue,
  getQueue,
  removeFromQueue,
  updateQueueEntry,
  getQueueLength,
  type QueuedMutation,
} from "./offlineStore";

// --- Types ---

interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

type SyncStatus = "idle" | "syncing" | "error";
type SyncListener = (status: SyncStatus, queueLength: number) => void;

// --- State ---

const listeners = new Set<SyncListener>();
let isSyncing = false;

// --- Event System ---

export function onSyncStatusChange(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(status: SyncStatus, queueLen: number) {
  for (const listener of listeners) {
    listener(status, queueLen);
  }
}

// --- Cached Fetch (for GET requests) ---

export async function cachedFetch(url: string): Promise<unknown> {
  // Network-first: try fetch, fall back to cache
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Cache the successful response
    await setCachedResponse(url, data);
    return data;
  } catch {
    // Network failed — try cache
    const cached = await getCachedResponse(url);
    if (cached) {
      console.log(
        `[syncManager] Serving from cache: ${url} (cached at ${new Date(cached.timestamp).toLocaleTimeString()})`
      );
      return cached.data;
    }
    throw new Error(`Offline and no cached data for ${url}`);
  }
}

// --- Mutation Fetch (for POST/PATCH/DELETE) ---

export async function mutationFetch(
  url: string,
  options: FetchOptions
): Promise<Response> {
  try {
    const res = await fetch(url, options);
    // Return the response as-is (caller checks res.ok if needed)
    return res;
  } catch {
    // Network failed — queue the mutation
    console.log(
      `[syncManager] Queuing mutation: ${options.method} ${url}`
    );
    await addToQueue({
      url,
      method: (options.method || "POST") as QueuedMutation["method"],
      body: options.body ? JSON.parse(options.body) : undefined,
    });

    const queueLen = await getQueueLength();
    notifyListeners("idle", queueLen);

    // Return a synthetic 202 Accepted so existing catch blocks don't trigger rollback
    return new Response(JSON.stringify({ queued: true }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// --- Replay Queue (called when back online) ---

const MAX_RETRIES = 3;

export async function replayQueue(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;

  const queue = await getQueue();
  if (queue.length === 0) {
    isSyncing = false;
    notifyListeners("idle", 0);
    return;
  }

  notifyListeners("syncing", queue.length);

  let failCount = 0;

  for (const entry of queue) {
    try {
      const fetchOptions: RequestInit = {
        method: entry.method,
        headers: { "Content-Type": "application/json" },
      };
      if (entry.body) {
        fetchOptions.body = JSON.stringify(entry.body);
      }

      const res = await fetch(entry.url, fetchOptions);

      if (res.ok || res.status === 404) {
        // Success or resource already deleted — remove from queue
        await removeFromQueue(entry.id);
      } else {
        // Server error — increment retry
        entry.retries += 1;
        if (entry.retries >= MAX_RETRIES) {
          console.warn(
            `[syncManager] Dropping mutation after ${MAX_RETRIES} retries:`,
            entry
          );
          await removeFromQueue(entry.id);
        } else {
          await updateQueueEntry(entry);
        }
        failCount++;
      }
    } catch {
      // Network error again — stop trying
      failCount++;
      break;
    }
  }

  isSyncing = false;

  const remaining = await getQueueLength();
  notifyListeners(failCount > 0 ? "error" : "idle", remaining);
}

// --- Auto-replay on reconnect ---

export function initSyncManager(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("app-online", () => {
    replayQueue();
  });

  // Try to replay any queued mutations from previous session
  replayQueue();
}
