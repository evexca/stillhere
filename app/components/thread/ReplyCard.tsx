'use client';
/**
 * ReplyCard — renders a single reply with reactions, nested reply support, and report button.
 */
import { useState } from 'react';
import { ReactionBar } from '../reactions/ReactionBar';
import { ReplyComposer } from './ReplyComposer';
import { ReportModal } from '../moderation/ReportModal';
import type { ReplyData } from './ThreadView';

interface ReplyCardProps {
  reply: ReplyData;
  postPublicId: string;
  nested?: boolean;
  onReply: (publicId: string | null) => void;
  replyingTo: string | null;
  onReplyCreated: (reply: ReplyData & { parentReplyPublicId: string | null }) => void;
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ReplyCard({
  reply,
  postPublicId,
  nested = false,
  onReply,
  replyingTo,
  onReplyCreated,
}: ReplyCardProps) {
  const [reactions, setReactions] = useState(reply.reactions);
  const [showReport, setShowReport] = useState(false);
  const isReplyingHere = replyingTo === reply.publicId;

  return (
    <>
      <article
        className={`reply-card${nested ? ' reply-card--nested' : ''}`}
        aria-label={`Reply by ${reply.isOwn ? 'you' : reply.isPostOwner ? 'post author' : 'anonymous'}`}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: reply.isOwn ? 'var(--color-accent)' : reply.isPostOwner ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>
            {reply.isOwn ? 'You' : reply.isPostOwner ? 'OP' : 'Anonymous'}
          </span>
          <time style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }} dateTime={reply.createdAt}>
            {formatRelativeTime(reply.createdAt)}
          </time>
        </div>

        <p className="reply-card__content">
          {reply.content}
        </p>

        <ReactionBar
          targetId={reply.publicId}
          targetType="REPLY"
          reactions={reactions}
          onChanged={setReactions}
        />

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
          {!nested && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => onReply(isReplyingHere ? null : reply.publicId)}
              aria-label={isReplyingHere ? 'Cancel reply' : `Reply to this comment`}
              aria-expanded={isReplyingHere}
            >
              {isReplyingHere ? 'Cancel' : 'Reply'}
            </button>
          )}
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => setShowReport(true)}
            aria-label="Report this reply"
            style={{ color: 'var(--color-text-muted)', marginLeft: 'auto' }}
          >
            Report
          </button>
        </div>

        {/* Nested reply composer */}
        {isReplyingHere && (
          <div style={{ marginTop: '0.75rem' }}>
            <ReplyComposer
              postPublicId={postPublicId}
              parentReplyPublicId={reply.publicId}
              placeholder="Reply to this comment..."
              onReplyCreated={onReplyCreated}
              onCancel={() => onReply(null)}
            />
          </div>
        )}
      </article>

      {/* Child replies */}
      {reply.children.map((child) => (
        <ReplyCard
          key={child.publicId}
          reply={child}
          postPublicId={postPublicId}
          nested
          onReply={onReply}
          replyingTo={replyingTo}
          onReplyCreated={onReplyCreated}
        />
      ))}

      {showReport && (
        <ReportModal
          targetId={reply.publicId}
          targetType="REPLY"
          onClose={() => setShowReport(false)}
        />
      )}
    </>
  );
}
