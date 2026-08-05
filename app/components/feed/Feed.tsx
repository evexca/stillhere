'use client';
/**
 * Feed — client-side managed feed with 3 simplified tabs (Live, Most Discussed, Disappearing Soon),
 * pagination, and real-time background updates without requiring full page refresh.
 */
import { useState, useCallback, useEffect } from 'react';
import { PostCard, type PostData } from './PostCard';
import { PostComposer } from './PostComposer';
import { AdPlaceholder } from './AdPlaceholder';
import { SITE_CONFIG } from '../../config/site';

type FeedFilter = 'LIVE' | 'DISCUSSED' | 'DISAPPEARING';

const FILTER_LABELS: Record<FeedFilter, string> = {
  LIVE: 'Live',
  DISCUSSED: 'Most Discussed',
  DISAPPEARING: 'Disappearing Soon',
};

interface FeedProps {
  initialPosts: PostData[];
  initialCursor: string | null;
  todayTheme: string | null;
  generationExpiresAt: string;
}

interface FeedResponse {
  posts: PostData[];
  nextCursor: string | null;
}

function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div className="skeleton" style={{ width: 70, height: 14 }} />
        <div className="skeleton" style={{ width: 50, height: 14 }} />
      </div>
      <div className="skeleton" style={{ width: '100%', height: 16 }} />
      <div className="skeleton" style={{ width: '80%', height: 16 }} />
      <div className="skeleton" style={{ width: '60%', height: 16 }} />
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <div className="skeleton" style={{ width: 80, height: 28, borderRadius: 99 }} />
        <div className="skeleton" style={{ width: 80, height: 28, borderRadius: 99 }} />
      </div>
    </div>
  );
}

export function Feed({ initialPosts, initialCursor, todayTheme, generationExpiresAt }: FeedProps) {
  const [filter, setFilter] = useState<FeedFilter>('LIVE');
  const [posts, setPosts] = useState<PostData[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(!!initialCursor);

  const fetchPosts = useCallback(async (newFilter: FeedFilter, newCursor?: string) => {
    const params = new URLSearchParams({ filter: newFilter });
    if (newCursor) params.set('cursor', newCursor);

    const res = await fetch(`/api/posts?${params}`);
    if (!res.ok) throw new Error('Failed to load posts');
    return res.json() as Promise<FeedResponse & { generationExpiresAt: string }>;
  }, []);

  const handleFilterChange = useCallback(async (newFilter: FeedFilter) => {
    if (newFilter === filter || isLoading) return;
    setFilter(newFilter);
    setIsLoading(true);
    setCursor(null);
    try {
      const data = await fetchPosts(newFilter);
      setPosts(data.posts);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } catch {
      // keep current posts
    } finally {
      setIsLoading(false);
    }
  }, [filter, isLoading, fetchPosts]);

  // Periodic background refresh for Live feed auto-updates (reply counts, reaction counts, new posts)
  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const data = await fetchPosts(filter);
        if (!cancelled && data.posts) {
          setPosts((prev) => {
            // Retain user's optimistic posts if they haven't synced yet, update matching posts with fresh server stats
            const serverMap = new Map(data.posts.map((p) => [p.publicId, p]));
            const updated = prev.map((p) => serverMap.get(p.publicId) ?? p);
            // Append any brand new posts from server that weren't in local list
            const localIds = new Set(prev.map((p) => p.publicId));
            const brandNew = data.posts.filter((p) => !localIds.has(p.publicId));
            return [...brandNew, ...updated];
          });
        }
      } catch {
        // silent fail during background refresh
      }
    }, 8_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [filter, fetchPosts]);

  const handleLoadMore = useCallback(async () => {
    if (!cursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const data = await fetchPosts(filter, cursor);
      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.publicId));
        const newUnique = data.posts.filter((p) => !existingIds.has(p.publicId));
        return [...prev, ...newUnique];
      });
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } catch {
      // fail silently
    } finally {
      setIsLoadingMore(false);
    }
  }, [cursor, isLoadingMore, filter, fetchPosts]);

  const handlePostCreated = useCallback((newPost: PostData) => {
    setPosts((prev) => [newPost, ...prev]);
  }, []);

  return (
    <div>
      <PostComposer
        todayTheme={todayTheme}
        onPostCreated={handlePostCreated}
      />

      {/* Feed filters (Live, Most Discussed, Disappearing Soon) */}
      <div
        className="feed-filters"
        role="group"
        aria-label="Feed filter options"
      >
        {(Object.keys(FILTER_LABELS) as FeedFilter[]).map((f) => (
          <button
            key={f}
            className={`feed-filter-btn${filter === f ? ' feed-filter-btn--active' : ''}`}
            onClick={() => handleFilterChange(f)}
            aria-pressed={filter === f}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Post list */}
      {isLoading ? (
        <div className="feed-list" aria-busy="true" aria-label="Loading posts...">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon" aria-hidden="true">✦</div>
          <h2 className="empty-state__title">Nothing here yet</h2>
          <p className="empty-state__text">
            Be the first to post. It might save the website.
          </p>
        </div>
      ) : (
        <div className="feed-list" aria-label="Posts">
          {posts.map((post, index) => (
            <div key={post.publicId}>
              <PostCard post={post} />
              {/* Ad after every 20 posts */}
              {SITE_CONFIG.adsEnabled && (index + 1) % 20 === 0 && (
                <AdPlaceholder />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && !isLoading && (
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            className={`btn btn--secondary${isLoadingMore ? ' btn--loading' : ''}`}
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            aria-label="Load more posts"
          >
            {isLoadingMore ? <span className="visually-hidden">Loading...</span> : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
