import { useState, useEffect } from "react";
import { get, set } from "idb-keyval";

/**
 * Hook for managing an offline queue of data using IndexedDB (idb-keyval).
 * Bypasses localStorage 5MB quota limits.
 */
export const useOfflineQueue = <T extends { _id?: number }>(queueKey: string) => {
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
        console.error("Failed to load offline queue from IDB", e);
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
  const saveQueue = async (newQueue: T[]) => {
    try {
      await set(queueKey, newQueue);
      setQueueState(newQueue);
      window.dispatchEvent(new Event(`idb-update-${queueKey}`));
    } catch (e) {
      console.error("Failed to save offline queue to IDB", e);
    }
  };

  const addToQueue = async (item: T) => {
    const currentQueue = (await get<T[]>(queueKey)) || [];
    const newQueue = [...currentQueue, { ...item, _id: Date.now(), _queuedAt: new Date().toISOString() }];
    await saveQueue(newQueue);
  };

  const removeFromQueue = async (queuedId: number) => {
    const currentQueue = (await get<T[]>(queueKey)) || [];
    const newQueue = currentQueue.filter((item: any) => item._id !== queuedId);
    await saveQueue(newQueue);
  };

  const clearQueue = async () => {
    await saveQueue([]);
  };

  return {
    queue,
    addToQueue,
    removeFromQueue,
    clearQueue,
    hasItems: queue.length > 0
  };
};
