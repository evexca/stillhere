'use client';
/**
 * PostCard — displays a single post with reactions, metadata, and actions.
 */
import Link from 'next/link';
import { useState, useCallback } from 'react';
import { ReactionBar } from '../reactions/ReactionBar';
import { ReportModal } from '../moderation/ReportModal';
import { SITE_CONFIG } from '../../config/site';

export interface PostData {
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

interface PostCardProps {
  post: PostData;
  showFullContent?: boolean;
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatExpiresIn(isoString: string): { text: string; soon: boolean } {
  const ms = new Date(isoString).getTime() - Date.now();
  if (ms <= 0) return { text: 'Expired', soon: true };
  const totalMinutes = Math.floor(ms / 60_000);
  const soon = ms < 3_600_000; // less than 1 hour
  if (totalMinutes < 60) return { text: `Disappears in ${totalMinutes}m`, soon };
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours < 24) return { text: `Disappears in ${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim(), soon };
  const days = Math.floor(hours / 24);
  return { text: `Disappears in ${days}d`, soon: false };
}

export function PostCard({ post, showFullContent = false }: PostCardProps) {
  const [reactions, setReactions] = useState(post.reactions);
  const [showReport, setShowReport] = useState(false);
  const expiry = formatExpiresIn(post.expiresAt);

  const handleReactionChange = useCallback((updatedReactions: ReactionSummary[]) => {
    setReactions(updatedReactions);
  }, []);

  return (
    <>
      <article
        className={`post-card${post.savedWebsite ? ' post-card--saver' : ''}`}
        aria-label={`Post by ${post.isOwn ? 'you' : 'anonymous'}`}
      >
        {post.savedWebsite && (
          <div className="post-card__saver-label" aria-label="This post saved the website">
            <span aria-hidden="true">✦</span>
            This post saved the website.
          </div>
        )}

        <div className="post-card__meta">
          <span className={`post-card__author${post.isOwn ? ' post-card__author--own' : ''}`}>
            {post.isOwn ? 'You' : 'Anonymous'}
            <span className="category-tag" style={{ marginLeft: '0.5rem' }}>
              Today&apos;s Theme
            </span>
          </span>
          <time
            className="post-card__time"
            dateTime={post.createdAt}
            title={new Date(post.createdAt).toLocaleString()}
          >
            {formatRelativeTime(post.createdAt)}
          </time>
        </div>

        <div className="post-card__content">
          {showFullContent ? post.content : (
            post.content.length > 300
              ? post.content.slice(0, 300) + '…'
              : post.content
          )}
        </div>

        <p className={`post-card__expiry${expiry.soon ? ' post-card__expiry--soon' : ''}`}>
          {expiry.text}
        </p>

        <ReactionBar
          targetId={post.publicId}
          targetType="POST"
          reactions={reactions}
          onChanged={handleReactionChange}
        />

        <div className="post-card__actions">
          <Link
            href={`/post/${post.publicId}`}
            className="btn btn--ghost btn--sm"
            aria-label={`Reply to this post (${post.replyCount} repl${post.replyCount !== 1 ? 'ies' : 'y'})`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {post.replyCount > 0 ? `${post.replyCount} ${post.replyCount === 1 ? 'reply' : 'replies'}` : 'Reply'}
          </Link>

          <button
            className="btn btn--ghost btn--sm"
            onClick={() => setShowReport(true)}
            aria-label="Report this post"
            style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }}
          >
            Report
          </button>
        </div>
      </article>

      {showReport && (
        <ReportModal
          targetId={post.publicId}
          targetType="POST"
          onClose={() => setShowReport(false)}
        />
      )}
    </>
  );
}
