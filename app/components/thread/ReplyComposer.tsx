'use client';
/**
 * ReplyComposer — compact reply input with character count and cooldown.
 */
import { useState, useRef, useCallback } from 'react';
import { useToast } from '../ui/ToastProvider';
import { SITE_CONFIG } from '../../config/site';

interface ReplyComposerProps {
  postPublicId: string;
  parentReplyPublicId: string | null;
  placeholder?: string;
  onReplyCreated?: (reply: NewReply) => void;
  onCancel?: () => void;
}

interface NewReply {
  publicId: string;
  content: string;
  createdAt: string;
  reactionCount: number;
  isOwn: boolean;
  isPostOwner: boolean;
  reactions: { type: string; label: string; emoji: string; count: number; myReaction: boolean }[];
  children: NewReply[];
  parentReplyPublicId: string | null;
}

const MAX_LENGTH = 750;

export function ReplyComposer({
  postPublicId,
  parentReplyPublicId,
  placeholder = 'Reply...',
  onReplyCreated,
  onCancel,
}: ReplyComposerProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { showToast } = useToast();

  const startCooldown = useCallback((seconds: number) => {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || cooldown > 0) return;

    const trimmed = content.trim();
    if (trimmed.length < 2) {
      setError('Your reply needs at least 2 characters.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: trimmed,
          postId: postPublicId,
          parentReplyId: parentReplyPublicId,
        }),
      });

      const data = await res.json() as {
        reply?: {
          publicId: string;
          content: string;
          createdAt: string;
          reactionCount: number;
          reactions: { type: string; label: string; emoji: string; count: number; myReaction: boolean }[];
          parentReplyPublicId: string | null;
        };
        error?: string;
        cooldownSeconds?: number;
      };

      if (!res.ok) {
        setError(data.error ?? 'Failed to post reply.');
        if (data.cooldownSeconds) startCooldown(data.cooldownSeconds);
        return;
      }

      setContent('');
      if (data.cooldownSeconds) startCooldown(data.cooldownSeconds);

      if (data.reply && onReplyCreated) {
        onReplyCreated({
          ...data.reply,
          isOwn: true,
          isPostOwner: false,
          children: [],
        });
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const charCount = content.length;
  const isOver = charCount > MAX_LENGTH;
  const isNear = charCount > MAX_LENGTH * 0.85;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label className="visually-hidden" htmlFor={`reply-${parentReplyPublicId ?? 'root'}`}>
            {placeholder}
          </label>
          <textarea
            id={`reply-${parentReplyPublicId ?? 'root'}`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            rows={2}
            maxLength={MAX_LENGTH + 50}
            disabled={isSubmitting}
            style={{
              minHeight: 56,
              fontSize: '0.9375rem',
              resize: 'vertical',
            }}
            aria-describedby={`reply-error-${parentReplyPublicId ?? 'root'}`}
            aria-invalid={!!error}
          />
        </div>
        <button
          type="submit"
          className={`btn btn--primary btn--sm${isSubmitting ? ' btn--loading' : ''}`}
          disabled={!content.trim() || isOver || isSubmitting || cooldown > 0}
          style={{ flexShrink: 0, alignSelf: 'flex-end', marginBottom: '2px' }}
        >
          {isSubmitting ? <span className="visually-hidden">Sending...</span> : 'Send'}
        </button>
        {onCancel && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={onCancel}
            style={{ flexShrink: 0, alignSelf: 'flex-end', marginBottom: '2px' }}
          >
            Cancel
          </button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.375rem' }}>
        <div id={`reply-error-${parentReplyPublicId ?? 'root'}`}>
          {error && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-critical)', fontWeight: 500 }} role="alert">
              {error}
            </p>
          )}
          {cooldown > 0 && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }} aria-live="polite">
              Wait {cooldown}s before replying again.
            </p>
          )}
        </div>
        {charCount > 0 && (
          <span
            style={{
              fontSize: '0.75rem',
              color: isOver ? 'var(--color-critical)' : isNear ? 'var(--color-warning)' : 'var(--color-text-muted)',
              fontWeight: isOver ? 600 : 400,
              fontVariantNumeric: 'tabular-nums',
              marginLeft: 'auto',
            }}
            aria-label={`${charCount} of ${MAX_LENGTH} characters`}
          >
            {charCount}/{MAX_LENGTH}
          </span>
        )}
      </div>
    </form>
  );
}
