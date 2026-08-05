'use client';
/**
 * ReactionBar — displays reaction buttons with optimistic updates.
 * Rolls back on server rejection.
 */
import { useState, useCallback, useRef } from 'react';
import { SITE_CONFIG } from '../../config/site';
import { useToast } from '../ui/ToastProvider';

interface ReactionSummary {
  type: string;
  label: string;
  emoji: string;
  count: number;
  myReaction: boolean;
}

interface ReactionBarProps {
  targetId: string;
  targetType: 'POST' | 'REPLY';
  reactions: ReactionSummary[];
  onChanged?: (reactions: ReactionSummary[]) => void;
}

export function ReactionBar({ targetId, targetType, reactions: initialReactions, onChanged }: ReactionBarProps) {
  const [reactions, setReactions] = useState(initialReactions);
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const debounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const { showToast } = useToast();

  const handleReact = useCallback(async (reactionType: string) => {
    if (loadingType) return;

    // Clear any pending debounce for this type
    const existing = debounceRef.current.get(reactionType);
    if (existing) clearTimeout(existing);

    const current = reactions.find((r) => r.type === reactionType);
    if (!current) return;

    const isAdding = !current.myReaction;
    const action = isAdding ? 'ADD' : 'REMOVE';

    // Optimistic update
    const optimistic = reactions.map((r) =>
      r.type === reactionType
        ? { ...r, count: r.count + (isAdding ? 1 : -1), myReaction: isAdding }
        : r
    );
    setReactions(optimistic);
    onChanged?.(optimistic);
    setLoadingType(reactionType);

    // Debounce the actual server call slightly
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/reactions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetId, targetType, reactionType, action }),
        });

        if (!res.ok) {
          const data = await res.json() as { error?: string };
          // Roll back optimistic update
          setReactions(initialReactions);
          onChanged?.(initialReactions);
          showToast(data.error ?? 'Your reaction could not be saved.', 'error');
        }
      } catch {
        setReactions(initialReactions);
        onChanged?.(initialReactions);
        showToast('Your reaction could not be saved. Please try again.', 'error');
      } finally {
        setLoadingType(null);
      }
    }, SITE_CONFIG.reactionDebounceMs);

    debounceRef.current.set(reactionType, timer);
  }, [reactions, loadingType, targetId, targetType, initialReactions, onChanged, showToast]);

  // Only show reactions with counts or all reactions
  const hasAnyReaction = reactions.some((r) => r.count > 0 || r.myReaction);

  return (
    <div className="reaction-bar" role="group" aria-label="Reactions">
      {reactions.map((reaction) => {
        // Hide zero-count reactions unless user has reacted or we want to show all
        if (!hasAnyReaction && !reaction.myReaction && reaction.count === 0) {
          // Still render but as a compact "+" trigger — show all on first interaction
        }

        return (
          <button
            key={reaction.type}
            className={`reaction-btn${reaction.myReaction ? ' reaction-btn--active' : ''}`}
            onClick={() => handleReact(reaction.type)}
            aria-pressed={reaction.myReaction}
            aria-label={`${reaction.label}${reaction.count > 0 ? ` — ${reaction.count}` : ''}`}
            disabled={!!loadingType && loadingType !== reaction.type}
          >
            <span className="reaction-btn__emoji" aria-hidden="true">
              {reaction.emoji}
            </span>
            <span className="reaction-btn__label" aria-hidden="true">
              {reaction.label}
            </span>
            {reaction.count > 0 && (
              <span className="reaction-btn__count" aria-hidden="true">
                {reaction.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
