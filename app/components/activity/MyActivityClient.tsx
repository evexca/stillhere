'use client';
/**
 * My Activity — client component that fetches and displays the visitor's activity.
 * Organized across tabs: My Posts, My Replies, Notifications, Threads Reacted.
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';

type ActivityTab = 'posts' | 'replies' | 'notifications' | 'reactions' | 'disappearing';

const TABS: { id: ActivityTab; label: string }[] = [
  { id: 'posts', label: 'My Posts' },
  { id: 'replies', label: 'My Replies' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'reactions', label: 'Reacted' },
  { id: 'disappearing', label: 'Disappearing' },
];

interface ActivityData {
  authenticated: boolean;
  myPosts: {
    publicId: string;
    content: string;
    createdAt: string;
    expiresAt: string;
    replyCount: number;
    reactionCount: number;
    savedWebsite: boolean;
  }[];
  myReplies: {
    publicId: string;
    content: string;
    createdAt: string;
    postPublicId: string;
    postExpiresAt: string;
  }[];
  repliesToMyPosts: {
    publicId: string;
    content: string;
    createdAt: string;
    postPublicId: string;
  }[];
  repliesToMyReplies: {
    notifId: string;
    postPublicId: string;
    replyPublicId: string;
    replyContent: string | null;
    createdAt: string;
    viewed: boolean;
  }[];
  reactionsReceived: {
    notifId: string;
    type: string;
    postPublicId: string;
    postContent: string | null;
    createdAt: string;
    viewed: boolean;
  }[];
  threadsReacted: {
    publicId: string;
    content: string | null;
    expiresAt: string;
    replyCount: number;
  }[];
  disappearingSoon: {
    publicId: string;
    content: string;
    expiresAt: string;
  }[];
  unreadCount: number;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatExpiresIn(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m left`;
  const h = Math.floor(m / 60);
  return `${h}h left`;
}

function EmptyTab({ message }: { message: string }) {
  return (
    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem', padding: '2rem 0', textAlign: 'center' }}>
      {message}
    </p>
  );
}

function ContentPreview({ content, link }: { content: string; link: string }) {
  return (
    <Link
      href={link}
      style={{
        display: 'block',
        padding: '0.875rem 1rem',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '0.75rem',
        transition: 'border-color 150ms ease',
      }}
    >
      <p style={{ fontSize: '0.9375rem', color: 'var(--color-text)', marginBottom: '0.25rem', wordBreak: 'break-word' }}>
        {content.slice(0, 200)}{content.length > 200 ? '…' : ''}
      </p>
    </Link>
  );
}

export function MyActivityClient() {
  const [tab, setTab] = useState<ActivityTab>('posts');
  const [data, setData] = useState<ActivityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/activity')
      .then((r) => r.json())
      .then((d: ActivityData) => { if (!cancelled) { setData(d); setIsLoading(false); } })
      .catch(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (isLoading) {
    return (
      <div aria-busy="true" aria-label="Loading activity...">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-lg)', marginBottom: '0.75rem' }} />
        ))}
      </div>
    );
  }

  if (!data || !data.authenticated) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon" aria-hidden="true">◌</div>
        <h2 className="empty-state__title">Nothing here yet</h2>
        <p className="empty-state__text">
          Post or reply on the home page and your activity will appear here.
        </p>
      </div>
    );
  }

  const notifCount = data.repliesToMyPosts.length + data.repliesToMyReplies.filter((n) => !n.viewed).length + data.reactionsReceived.filter((n) => !n.viewed).length;

  return (
    <div>
      {/* Tabs */}
      <div className="activity-tabs" role="tablist" aria-label="Activity categories">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            aria-controls={`tab-panel-${id}`}
            id={`tab-${id}`}
            className={`activity-tab${tab === id ? ' activity-tab--active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
            {id === 'notifications' && notifCount > 0 && (
              <span className="badge" style={{ marginLeft: '0.375rem' }} aria-label={`${notifCount} unread`}>
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
            {id === 'disappearing' && data.disappearingSoon.length > 0 && (
              <span className="badge" style={{ marginLeft: '0.375rem', background: 'var(--color-warning)' }}>
                {data.disappearingSoon.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div id="tab-panel-posts" role="tabpanel" aria-labelledby="tab-posts" hidden={tab !== 'posts'}>
        {data.myPosts.length === 0 ? (
          <EmptyTab message="You haven't posted in this generation yet." />
        ) : data.myPosts.map((post) => (
          <div key={post.publicId} style={{ marginBottom: '0.75rem' }}>
            <ContentPreview content={post.content} link={`/post/${post.publicId}`} />
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '-0.5rem', marginBottom: '0.75rem', paddingLeft: '0.25rem' }}>
              {post.savedWebsite && <span style={{ color: 'var(--color-accent)' }}>✦ Saved the website</span>}
              <span>{post.replyCount} {post.replyCount === 1 ? 'reply' : 'replies'}</span>
              <span>{post.reactionCount} reactions</span>
              <span>{formatExpiresIn(post.expiresAt)}</span>
            </div>
          </div>
        ))}
      </div>

      <div id="tab-panel-replies" role="tabpanel" aria-labelledby="tab-replies" hidden={tab !== 'replies'}>
        {data.myReplies.length === 0 ? (
          <EmptyTab message="You haven't replied to anything yet." />
        ) : data.myReplies.map((reply) => (
          <ContentPreview key={reply.publicId} content={reply.content} link={`/post/${reply.postPublicId}`} />
        ))}
      </div>

      <div id="tab-panel-notifications" role="tabpanel" aria-labelledby="tab-notifications" hidden={tab !== 'notifications'}>
        {data.repliesToMyPosts.length === 0 && data.repliesToMyReplies.length === 0 && data.reactionsReceived.length === 0 ? (
          <EmptyTab message="No activity on your posts or replies yet." />
        ) : (
          <>
            {data.repliesToMyPosts.slice(0, 10).map((n) => (
              <Link key={n.publicId} href={`/post/${n.postPublicId}`} style={{ display: 'block', padding: '0.875rem 1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', marginBottom: '0.75rem' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                  Someone replied to your post · {formatRelativeTime(n.createdAt)}
                </p>
                <p style={{ fontSize: '0.9375rem', color: 'var(--color-text)', wordBreak: 'break-word' }}>
                  {n.content.slice(0, 200)}{n.content.length > 200 ? '…' : ''}
                </p>
              </Link>
            ))}
            {data.reactionsReceived.slice(0, 10).map((n) => (
              <Link key={n.notifId} href={`/post/${n.postPublicId}`} style={{ display: 'block', padding: '0.875rem 1rem', background: 'var(--color-surface)', border: `1px solid ${n.viewed ? 'var(--color-border)' : 'var(--color-accent)'}`, borderRadius: 'var(--radius-lg)', marginBottom: '0.75rem' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                  Someone reacted to your {n.type.includes('REPLY') ? 'reply' : 'post'} · {formatRelativeTime(n.createdAt)}
                </p>
                {n.postContent && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    {n.postContent.slice(0, 100)}{n.postContent.length > 100 ? '…' : ''}
                  </p>
                )}
              </Link>
            ))}
          </>
        )}
      </div>

      <div id="tab-panel-reactions" role="tabpanel" aria-labelledby="tab-reactions" hidden={tab !== 'reactions'}>
        {data.threadsReacted.length === 0 ? (
          <EmptyTab message="You haven't reacted to any posts yet." />
        ) : data.threadsReacted.map((t) => (
          t.publicId && (
            <ContentPreview key={t.publicId} content={t.content ?? '(content removed)'} link={`/post/${t.publicId}`} />
          )
        ))}
      </div>

      <div id="tab-panel-disappearing" role="tabpanel" aria-labelledby="tab-disappearing" hidden={tab !== 'disappearing'}>
        {data.disappearingSoon.length === 0 ? (
          <EmptyTab message="None of your posts are disappearing soon." />
        ) : data.disappearingSoon.map((p) => (
          <div key={p.publicId} style={{ marginBottom: '0.75rem' }}>
            <ContentPreview content={p.content} link={`/post/${p.publicId}`} />
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-warning)', fontWeight: 600, marginTop: '-0.5rem', marginBottom: '0.75rem', paddingLeft: '0.25rem' }}>
              ⚠ {formatExpiresIn(p.expiresAt)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
