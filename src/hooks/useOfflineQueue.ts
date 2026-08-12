import { useState, useEffect, useCallback } from "react";
import { get, set } from "idb-keyval";
import { logger } from "@/lib/logger";

/**
 * Hook for managing an offline queue of data using IndexedDB (idb-keyval).
 * Bypasses localStorage 5MB quota limits.
 *
 * Each item carries a small state machine so a submission that fails to sync
 * is never silently dropped or retried forever:
 *   _status: "pending" | "failed"   — failed items are surfaced in the UI
 *   _attempts: number               — incremented on each failed replay
 *   _error: string                  — human-readable reason for the last failure
 *
 * An item is removed from the queue ONLY on confirmed success (the caller
 * removes it); a failed item stays until the user retries it manually.
 */
export type OfflineQueueItem = { _id?: number };

export const MAX_QUEUE_ATTEMPTS = 3;

export const useOfflineQueue = <T extends OfflineQueueItem>(queueKey: string) => {
  const [queue, setQueueState] = useState<T[]>([]);

  // Load queue on mount and when custom event fires
  useEffect(() => {
    const loadQueue = async () => {
      try {
        const saved = await get(queueKey);
        if (saved) {
          setQueueState(saved);
        }
      } catch (e) {
        logger.error("Failed to load offline queue from IDB", e);
      }
    };

    loadQueue();

    const handleUpdate = () => loadQueue();
    window.addEventListener(`idb-update-${queueKey}`, handleUpdate);

    return () => {
      window.removeEventListener(`idb-update-${queueKey}`, handleUpdate);
    };
  }, [queueKey]);

  // Save to IDB whenever queue changes and notify other hooks
  const saveQueue = useCallback(async (newQueue: T[]) => {
    try {
      await set(queueKey, newQueue);
      setQueueState(newQueue);
      window.dispatchEvent(new Event(`idb-update-${queueKey}`));
    } catch (e) {
      logger.error("Failed to save offline queue to IDB", e);
    }
  }, [queueKey]);

  const addToQueue = useCallback(async (item: T) => {
    const currentQueue = (await get<T[]>(queueKey)) || [];
    const newQueue = [
      ...currentQueue,
      {
        ...item,
        // Preserve a caller-supplied _id so the caller can remove the item
        // after a confirmed success (FieldReports relies on this).
        _id: item._id ?? Date.now(),
        _queuedAt: new Date().toISOString(),
        _status: "pending",
        _attempts: 0,
      } as T,
    ];
    await saveQueue(newQueue);
  }, [queueKey, saveQueue]);

  const removeFromQueue = useCallback(async (queuedId: number) => {
    const currentQueue = (await get<T[]>(queueKey)) || [];
    const newQueue = currentQueue.filter((item) => item._id !== queuedId);
    await saveQueue(newQueue);
  }, [queueKey, saveQueue]);

  /**
   * Merge a partial patch into one queued item (e.g. mark failed, reset
   * attempts, store an error message).
   */
  const updateItem = useCallback(async (queuedId: number, patch: Partial<T>) => {
    const currentQueue = (await get<T[]>(queueKey)) || [];
    const newQueue = currentQueue.map((item) =>
      item._id === queuedId ? { ...item, ...patch } : item
    );
    await saveQueue(newQueue);
  }, [queueKey, saveQueue]);

  const clearQueue = useCallback(async () => {
    await saveQueue([]);
  }, [saveQueue]);

  const failedItems = queue.filter((item) => (item as T & { _status?: string })._status === "failed");
  const pendingItems = queue.filter((item) => (item as T & { _status?: string })._status !== "failed");

  return {
    queue,
    failedItems,
    pendingItems,
    addToQueue,
    removeFromQueue,
    updateItem,
    clearQueue,
    hasItems: queue.length > 0,
    failedCount: failedItems.length,
    pendingCount: pendingItems.length,
  };
};
