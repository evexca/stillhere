'use client';
/**
 * PostComposer — the main post creation form.
 * Handles character counting, cooldown display,
 * and optimistic UI updates. Every post automatically belongs to today's theme.
 */
import { useState, useRef, useCallback } from 'react';
import { useToast } from '../ui/ToastProvider';
import { SITE_CONFIG } from '../../config/site';

interface PostComposerProps {
  todayTheme: string | null;
  onPostCreated?: (post: NewPost) => void;
}

interface NewPost {
  publicId: string;
  content: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  savedWebsite: boolean;
  replyCount: number;
  reactionCount: number;
  isOwn: boolean;
  reactions: ReactionSummary[];
}

interface ReactionSummary {
  type: string;
  label: string;
  emoji: string;
  count: number;
  myReaction: boolean;
}

const MAX_LENGTH = 1000;

export function PostComposer({ todayTheme, onPostCreated }: PostComposerProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { showToast } = useToast();

  const startCooldown = useCallback((seconds: number) => {
    setCooldownRemaining(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || cooldownRemaining > 0) return;

    const trimmed = content.trim();
    if (trimmed.length < 3) {
      setError('Your post needs at least 3 characters.');
      return;
    }
    if (trimmed.length > MAX_LENGTH) {
      setError(`Your post is too long. Maximum ${MAX_LENGTH} characters.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });

      const data = await res.json() as {
        post?: NewPost;
        error?: string;
        cooldownSeconds?: number;
      };

      if (!res.ok) {
        setError(data.error ?? 'Failed to post. Please try again.');
        if (data.cooldownSeconds) startCooldown(data.cooldownSeconds);
        return;
      }

      // Success
      setContent('');
      setError(null);
      if (data.cooldownSeconds) startCooldown(data.cooldownSeconds);
      if (data.post && onPostCreated) {
        onPostCreated(data.post);
      }
      showToast('Your post is live. It saved the website. ✦', 'success');
      textareaRef.current?.focus();
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const charCount = content.length;
  const isOverLimit = charCount > MAX_LENGTH;
  const isNearLimit = charCount > MAX_LENGTH * 0.85;
  const canSubmit = !isSubmitting && !isOverLimit && cooldownRemaining === 0 && charCount >= 3;

  return (
    <form
      className="composer"
      onSubmit={handleSubmit}
      aria-label="Create a new post"
      noValidate
    >
      {/* Textarea */}
      <label htmlFor="post-composer-input" className="visually-hidden">
        Write a post
      </label>
      <textarea
        id="post-composer-input"
        ref={textareaRef}
        className="composer__textarea"
        placeholder="A confession, a thought, a secret, a question..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={MAX_LENGTH + 50} // allow slight overrun for UI feedback
        rows={3}
        aria-describedby="composer-char-count composer-error"
        aria-invalid={!!error}
        disabled={isSubmitting}
      />

      <div className="composer__footer">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
          {error && (
            <p
              id="composer-error"
              style={{
                fontSize: '0.8125rem',
                color: 'var(--color-critical)',
                fontWeight: 500,
              }}
              role="alert"
            >
              {error}
            </p>
          )}
          {cooldownRemaining > 0 && (
            <p
              style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}
              aria-live="polite"
            >
              You can post again in {cooldownRemaining} second{cooldownRemaining !== 1 ? 's' : ''}.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <span
            id="composer-char-count"
            className={`composer__char-count${isOverLimit ? ' composer__char-count--over' : isNearLimit ? ' composer__char-count--warning' : ''}`}
            aria-live="polite"
            aria-label={`${charCount} of ${MAX_LENGTH} characters`}
          >
            {charCount}/{MAX_LENGTH}
          </span>
          <button
            type="submit"
            className={`btn btn--primary${isSubmitting ? ' btn--loading' : ''}`}
            disabled={!canSubmit}
            aria-disabled={!canSubmit}
          >
            {isSubmitting ? <span className="visually-hidden">Posting...</span> : 'Post'}
          </button>
        </div>
      </div>
    </form>
  );
}
