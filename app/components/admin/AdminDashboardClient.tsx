'use client';

/**
 * AdminDashboardClient — Full admin interface for managing posts, reports,
 * moderation actions, and system cleanup.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../ui/ToastProvider';

interface StatsProps {
  totalPosts: number;
  pendingReports: number;
  blockedTerms: number;
  generation: {
    num: number;
    expiresAt: string;
    postCount: number;
    saveCount: number;
  } | null;
}

interface AdminDashboardClientProps {
  adminEmail: string;
  stats: StatsProps;
}

type TabType = 'overview' | 'posts' | 'reports' | 'terms' | 'themes';

interface PostItem {
  id: string;
  publicId: string;
  content: string;
  status: 'ACTIVE' | 'HIDDEN' | 'DELETED';
  createdAt: string;
  replyCount: number;
  reactionCount: number;
  expiresAt: string;
  generation: { generationNum: number };
}

interface ReportItem {
  id: string;
  reason: string;
  note: string | null;
  status: 'PENDING' | 'REVIEWED' | 'ACTIONED' | 'DISMISSED';
  createdAt: string;
  targetType: 'POST' | 'REPLY';
  post?: { publicId: string; content: string; status: string } | null;
  reply?: { publicId: string; content: string; status: string } | null;
}

export function AdminDashboardClient({ adminEmail, stats }: AdminDashboardClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Posts state
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [postsStatusFilter, setPostsStatusFilter] = useState<string>('');
  const [postsSearch, setPostsSearch] = useState<string>('');
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotal, setPostsTotal] = useState(0);

  // Reports state
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [reportsStatusFilter, setReportsStatusFilter] = useState<string>('PENDING');
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsTotal, setReportsTotal] = useState(0);

  // Action loading state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
      showToast('Logged out successfully.', 'info');
      router.push('/admin');
      router.refresh();
    } catch {
      showToast('Logout failed.', 'error');
    }
  };

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const params = new URLSearchParams({
        type: 'posts',
        page: String(postsPage),
      });
      if (postsStatusFilter) params.set('status', postsStatusFilter);
      if (postsSearch.trim()) params.set('q', postsSearch.trim());

      const res = await fetch(`/api/admin/moderate?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
        setPostsTotal(data.total || 0);
      } else {
        showToast('Failed to fetch posts.', 'error');
      }
    } catch {
      showToast('Connection error fetching posts.', 'error');
    } finally {
      setPostsLoading(false);
    }
  }, [postsPage, postsStatusFilter, postsSearch, showToast]);

  // Fetch reports
  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const params = new URLSearchParams({
        type: 'reports',
        page: String(reportsPage),
      });
      if (reportsStatusFilter) params.set('status', reportsStatusFilter);

      const res = await fetch(`/api/admin/moderate?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
        setReportsTotal(data.total || 0);
      } else {
        showToast('Failed to fetch reports.', 'error');
      }
    } catch {
      showToast('Connection error fetching reports.', 'error');
    } finally {
      setReportsLoading(false);
    }
  }, [reportsPage, reportsStatusFilter, showToast]);

  useEffect(() => {
    if (activeTab === 'posts') fetchPosts();
  }, [activeTab, fetchPosts]);

  useEffect(() => {
    if (activeTab === 'reports') fetchReports();
  }, [activeTab, fetchReports]);

  // Perform moderation action
  const handleAction = async (action: string, targetId: string, reason?: string) => {
    setActionLoadingId(targetId);
    try {
      const res = await fetch('/api/admin/moderate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetId, reason }),
      });

      if (res.ok) {
        showToast('Action executed successfully.', 'success');
        if (activeTab === 'posts') fetchPosts();
        if (activeTab === 'reports') fetchReports();
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || 'Moderation action failed.', 'error');
      }
    } catch {
      showToast('Connection error.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
            Stillhere
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            {adminEmail}
          </p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('overview')}
            className={`btn btn--ghost${activeTab === 'overview' ? ' btn--secondary' : ''}`}
            style={{ justifyContent: 'flex-start', width: '100%' }}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`btn btn--ghost${activeTab === 'posts' ? ' btn--secondary' : ''}`}
            style={{ justifyContent: 'flex-start', width: '100%' }}
          >
            📝 Moderation / Posts
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`btn btn--ghost${activeTab === 'reports' ? ' btn--secondary' : ''}`}
            style={{ justifyContent: 'flex-start', width: '100%' }}
          >
            🚩 Reports Queue {stats.pendingReports > 0 && `(${stats.pendingReports})`}
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`btn btn--ghost${activeTab === 'terms' ? ' btn--secondary' : ''}`}
            style={{ justifyContent: 'flex-start', width: '100%' }}
          >
            🛡 Blocked Terms
          </button>
          <button
            onClick={() => setActiveTab('themes')}
            className={`btn btn--ghost${activeTab === 'themes' ? ' btn--secondary' : ''}`}
            style={{ justifyContent: 'flex-start', width: '100%' }}
          >
            🎨 Daily Themes
          </button>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <button
            onClick={handleLogout}
            className="btn btn--danger btn--sm"
            style={{ width: '100%' }}
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-content">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>
              System Overview
            </h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Generation</p>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, marginTop: '0.25rem' }}>
                  Gen {stats.generation?.num ?? 1}
                </p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                  {stats.generation?.postCount ?? 0} posts · Saved {stats.generation?.saveCount ?? 0}x
                </p>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Pending Reports</p>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, marginTop: '0.25rem', color: stats.pendingReports > 0 ? 'var(--color-warning)' : 'inherit' }}>
                  {stats.pendingReports}
                </p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                  Awaiting review
                </p>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Posts Created</p>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, marginTop: '0.25rem' }}>
                  {stats.totalPosts}
                </p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                  Lifetime count
                </p>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Blocked Terms</p>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, marginTop: '0.25rem' }}>
                  {stats.blockedTerms}
                </p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                  Local filter rules
                </p>
              </div>
            </div>

            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Quick Actions & Tools</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                Manage content moderation, process reported items, or check community guidelines.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button onClick={() => setActiveTab('posts')} className="btn btn--secondary btn--sm">
                  View Content & Posts
                </button>
                <button onClick={() => setActiveTab('reports')} className="btn btn--secondary btn--sm">
                  View User Reports ({stats.pendingReports})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODERATION / POSTS TAB */}
        {activeTab === 'posts' && (
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>
              Content Moderation
            </h1>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search post content..."
                value={postsSearch}
                onChange={(e) => setPostsSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchPosts()}
                style={{ maxWidth: '280px' }}
              />
              <select
                value={postsStatusFilter}
                onChange={(e) => { setPostsStatusFilter(e.target.value); setPostsPage(1); }}
                style={{ width: 'auto' }}
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="HIDDEN">HIDDEN</option>
                <option value="DELETED">DELETED</option>
              </select>
              <button onClick={() => fetchPosts()} className="btn btn--secondary btn--sm">
                Search / Refresh
              </button>
            </div>

            {/* Posts List */}
            {postsLoading ? (
              <p style={{ color: 'var(--color-text-muted)' }}>Loading posts...</p>
            ) : posts.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No posts matching criteria.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {posts.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      <span>ID: {p.publicId} | Gen {p.generation.generationNum}</span>
                      <span style={{
                        fontWeight: 600,
                        color: p.status === 'ACTIVE' ? 'var(--color-accent)' : p.status === 'HIDDEN' ? 'var(--color-warning)' : 'var(--color-critical)'
                      }}>
                        {p.status}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.9375rem', marginBottom: '0.75rem', whiteSpace: 'pre-wrap' }}>
                      {p.content || '*(Content deleted)*'}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Created: {new Date(p.createdAt).toLocaleString()} | {p.replyCount} replies | {p.reactionCount} reactions
                      </span>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {p.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleAction('HIDE_POST', p.publicId, 'Admin action')}
                            disabled={actionLoadingId === p.publicId}
                            className="btn btn--secondary btn--sm"
                          >
                            Hide
                          </button>
                        )}
                        {p.status === 'HIDDEN' && (
                          <button
                            onClick={() => handleAction('RESTORE_POST', p.publicId, 'Admin action')}
                            disabled={actionLoadingId === p.publicId}
                            className="btn btn--secondary btn--sm"
                          >
                            Restore
                          </button>
                        )}
                        {p.status !== 'DELETED' && (
                          <button
                            onClick={() => handleAction('DELETE_POST', p.publicId, 'Admin action')}
                            disabled={actionLoadingId === p.publicId}
                            className="btn btn--danger btn--sm"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>
              User Reports Queue
            </h1>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center' }}>
              <select
                value={reportsStatusFilter}
                onChange={(e) => { setReportsStatusFilter(e.target.value); setReportsPage(1); }}
                style={{ width: 'auto' }}
              >
                <option value="PENDING">PENDING</option>
                <option value="REVIEWED">REVIEWED</option>
                <option value="ACTIONED">ACTIONED</option>
                <option value="DISMISSED">DISMISSED</option>
              </select>
              <button onClick={() => fetchReports()} className="btn btn--secondary btn--sm">
                Refresh
              </button>
            </div>

            {reportsLoading ? (
              <p style={{ color: 'var(--color-text-muted)' }}>Loading reports...</p>
            ) : reports.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No reports found with status: {reportsStatusFilter}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {reports.map((r) => {
                  const targetContent = r.post?.content || r.reply?.content || '(No content or deleted)';
                  const targetPublicId = r.post?.publicId || r.reply?.publicId;

                  return (
                    <div
                      key={r.id}
                      style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        <span>Target: {r.targetType} ({targetPublicId || 'Unknown'})</span>
                        <span style={{ fontWeight: 600, color: r.status === 'PENDING' ? 'var(--color-warning)' : 'inherit' }}>
                          Reason: {r.reason} | Status: {r.status}
                        </span>
                      </div>

                      <div style={{ background: 'var(--color-bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
                        <p style={{ fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
                          &quot;{targetContent}&quot;
                        </p>
                      </div>

                      {r.note && (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                          Reporter note: {r.note}
                        </p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          Reported: {new Date(r.createdAt).toLocaleString()}
                        </span>

                        {r.status === 'PENDING' && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleAction('DISMISS_REPORT', r.id)}
                              disabled={actionLoadingId === r.id}
                              className="btn btn--secondary btn--sm"
                            >
                              Dismiss
                            </button>

                            {targetPublicId && (
                              <button
                                onClick={async () => {
                                  // Action report AND hide target content
                                  await handleAction(r.targetType === 'POST' ? 'HIDE_POST' : 'HIDE_REPLY', targetPublicId, `Reported for ${r.reason}`);
                                  await handleAction('ACTION_REPORT', r.id);
                                }}
                                disabled={actionLoadingId === r.id}
                                className="btn btn--danger btn--sm"
                              >
                                Hide Content & Action
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
