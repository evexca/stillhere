'use client';
/**
 * ThreadView — the full thread page with replies, composer, and reaction bar.
 * Handles identity resolution and reply nesting.
 */
import { useState, useEffect, useCallback } from 'react';
import { PostCard, type PostData } from '../feed/PostCard';
import { ReplyComposer } from './ReplyComposer';
import { ReplyCard } from './ReplyCard';
import { AdSlot } from '../ads/AdSlot';
import { shouldInsertAdAfter } from '../../lib/ads';

export interface ReplyData {
  publicId: string;
  content: string;
  createdAt: string;
  reactionCount: number;
  isOwn: boolean;
  isPostOwner: boolean;
  reactions: {
    type: string;
    label: string;
    emoji: string;
    count: number;
    myReaction: boolean;
  }[];
  children: ReplyData[];
}

interface RepliesResponse {
  replies: ReplyData[];
}

interface ThreadViewProps {
  post: PostData;
}

export function ThreadView({ post }: ThreadViewProps) {
  const [replies, setReplies] = useState<ReplyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null); // publicId of parent reply

  const fetchReplies = useCallback(async () => {
    try {
      const res = await fetch(`/api/replies?postId=${post.publicId}`);
      if (res.ok) {
        const data = await res.json() as RepliesResponse;
        setReplies(data.replies);
      }
    } catch {}
    setIsLoading(false);
  }, [post.publicId]);

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  const handleReplyCreated = useCallback((newReply: ReplyData & { parentReplyPublicId: string | null }) => {
    setReplies((prev) => {
      if (!newReply.parentReplyPublicId) {
        // Top-level reply
        return [...prev, { ...newReply, children: [] }];
      }
      // Nested reply — find parent and append
      return prev.map((r) => {
        if (r.publicId === newReply.parentReplyPublicId) {
          return { ...r, children: [...r.children, { ...newReply, children: [] }] };
        }
        return r;
      });
    });
    setReplyingTo(null);
  }, []);

  return (
    <div>
      {/* Back link */}
      <a
        href="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          color: 'var(--color-text-muted)',
          marginBottom: '1.5rem',
        }}
        aria-label="Back to home"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back
      </a>

      {/* Post */}
      <PostCard post={post} showFullContent />

      {/* Reply composer (top-level) */}
      <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        <ReplyComposer
          postPublicId={post.publicId}
          parentReplyPublicId={null}
          placeholder="Add to this conversation..."
          onReplyCreated={handleReplyCreated}
        />
      </div>

      {/* Replies */}
      {isLoading ? (
        <div aria-busy="true" aria-label="Loading replies...">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="reply-card" style={{ marginBottom: '0.75rem' }}>
              <div className="skeleton" style={{ width: '90%', height: 14, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: '70%', height: 14 }} />
            </div>
          ))}
        </div>
      ) : replies.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem', textAlign: 'center', padding: '2rem 0' }}>
          No replies yet. Be the first to respond.
        </p>
      ) : (
        <div aria-label={`${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}>
          {replies.map((reply, index) => (
            <div key={reply.publicId}>
              <ReplyCard
                reply={reply}
                postPublicId={post.publicId}
                onReply={setReplyingTo}
                replyingTo={replyingTo}
                onReplyCreated={handleReplyCreated}
              />
              {shouldInsertAdAfter(index) && <AdSlot variant="inFeed" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
