"use client";

import { get, set, del, keys, createStore } from "idb-keyval";

// Two separate IDB stores to avoid key collisions
const cacheStore = createStore("ghs-cache", "api-responses");
const queueStore = createStore("ghs-queue", "mutations");

// --- API Response Cache ---

export interface CachedResponse {
  data: unknown;
  timestamp: number;
  url: string;
}

export async function getCachedResponse(
  url: string
): Promise<CachedResponse | undefined> {
  return get<CachedResponse>(url, cacheStore);
}

export async function setCachedResponse(
  url: string,
  data: unknown
): Promise<void> {
  await set(url, { data, timestamp: Date.now(), url } as CachedResponse, cacheStore);
}

export async function clearCache(): Promise<void> {
  const allKeys = await keys(cacheStore);
  for (const key of allKeys) {
    await del(key, cacheStore);
  }
}

// --- Mutation Queue ---

export interface QueuedMutation {
  id: string;
  url: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: unknown;
  timestamp: number;
  retries: number;
}

export async function getQueue(): Promise<QueuedMutation[]> {
  const allKeys = await keys(queueStore);
  const entries: QueuedMutation[] = [];
  for (const key of allKeys) {
    const val = await get<QueuedMutation>(key, queueStore);
    if (val) entries.push(val);
  }
  return entries.sort((a, b) => a.timestamp - b.timestamp);
}

export async function addToQueue(
  mutation: Omit<QueuedMutation, "id" | "timestamp" | "retries">
): Promise<void> {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const entry: QueuedMutation = {
    ...mutation,
    id,
    timestamp: Date.now(),
    retries: 0,
  };
  await set(id, entry, queueStore);
}

export async function removeFromQueue(id: string): Promise<void> {
  await del(id, queueStore);
}

export async function updateQueueEntry(
  entry: QueuedMutation
): Promise<void> {
  await set(entry.id, entry, queueStore);
}

export async function getQueueLength(): Promise<number> {
  const allKeys = await keys(queueStore);
  return allKeys.length;
}

export async function clearQueue(): Promise<void> {
  const allKeys = await keys(queueStore);
  for (const key of allKeys) {
    await del(key, queueStore);
  }
}
