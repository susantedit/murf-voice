'use client';

import { useCallback, useEffect, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

export interface LearnerMemory {
  found: boolean;
  name?: string;
  language_preference?: string;
  current_level?: string;
  learning_goal?: string;
  topics?: string[];
  last_interaction?: string;
}

// ── Hook ───────────────────────────────────────────────────────────────────

/**
 * Fetches and manages learner memory from the Memory REST API.
 *
 * @param userId - The stable anonymous UUID for this learner.
 */
export function useLearnerMemory(userId: string) {
  const [memory, setMemory] = useState<LearnerMemory | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve API base URL — falls back to localhost:8888 if env var is absent.
  const apiBase = process.env.NEXT_PUBLIC_MEMORY_API_URL ?? 'http://localhost:8888';

  // ── Fetch ──────────────────────────────────────────────────────────────

  const fetchMemory = useCallback(async () => {
    if (!userId || userId === 'server-side') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${apiBase}/memory/${encodeURIComponent(userId)}`);

      if (!res.ok) {
        throw new Error(`Memory API responded with status ${res.status}`);
      }

      const data: LearnerMemory = await res.json();
      setMemory(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const isOffline =
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('TypeError: Failed to fetch') ||
        msg === 'Failed to fetch';
      setError(
        isOffline
          ? 'Memory service is offline. Make sure the memory server is running: uv run python -m src.api.memory_server'
          : msg || 'Failed to load learning memory.'
      );
      setMemory(null);
    } finally {
      setLoading(false);
    }
  }, [userId, apiBase]);

  // Fetch on mount and whenever userId changes.
  useEffect(() => {
    void fetchMemory();
  }, [fetchMemory]);

  // ── Delete ─────────────────────────────────────────────────────────────

  const deleteMemory = useCallback(async (): Promise<void> => {
    if (!userId || userId === 'server-side') return;

    try {
      const res = await fetch(`${apiBase}/memory/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error(`Memory API responded with status ${res.status}`);
      }

      // Refresh state to reflect the deletion.
      await fetchMemory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete learning memory.');
    }
  }, [userId, apiBase, fetchMemory]);

  // ── Expose ─────────────────────────────────────────────────────────────

  return {
    /** The learner memory object returned by the API. */
    memory,
    /** True while a fetch or delete is in progress. */
    loading,
    /** Error message string if the last request failed, otherwise null. */
    error,
    /** Re-fetches memory from the API. */
    refresh: fetchMemory,
    /** Deletes all memory for this learner then refreshes. */
    deleteMemory,
  };
}
