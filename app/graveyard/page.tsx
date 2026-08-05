import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Graveyard — Stillhere',
  description: 'A record of every generation that has lived and expired on Stillhere.',
};

export const dynamic = 'force-dynamic';

export default async function GraveyardPage() {
  const generations = await prisma.siteGeneration.findMany({
    where: { status: 'ENDED' },
    orderBy: { generationNum: 'desc' },
    take: 50,
    select: {
      id: true,
      generationNum: true,
      startedAt: true,
      endedAt: true,
      endReason: true,
      postCount: true,
      replyCount: true,
      reactionCount: true,
      saveCount: true,
      longestThreadMs: true,
      totalDurationMs: true,
    },
  });

  const active = await prisma.siteGeneration.findFirst({
    where: { status: 'ACTIVE' },
    select: { generationNum: true, expiresAt: true, postCount: true, saveCount: true },
  });

  function formatDuration(ms: bigint | null | undefined): string {
    if (!ms) return '—';
    const totalMinutes = Number(ms) / 60_000;
    if (totalMinutes < 60) return `${Math.floor(totalMinutes)}m`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.floor(totalMinutes % 60);
    return `${hours}h ${mins}m`;
  }

  function formatDate(d: Date | null): string {
    if (!d) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="container page-body">
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
          The Graveyard
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem', maxWidth: 420, margin: '0 auto' }}>
          Every generation that lived and disappeared. Statistics only — no content survives.
        </p>
      </div>

      {/* Active generation teaser */}
      {active && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-accent)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          gap: '2rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: '0.25rem' }}>
              Currently alive
            </p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
              Generation {active.generationNum}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <p className="graveyard-stat">{active.postCount}</p>
              <p className="graveyard-label">Posts so far</p>
            </div>
            <div>
              <p className="graveyard-stat">{active.saveCount}</p>
              <p className="graveyard-label">Times saved</p>
            </div>
          </div>
        </div>
      )}

      {/* Past generations */}
      {generations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon" aria-hidden="true">⚰</div>
          <h2 className="empty-state__title">No generations have died yet</h2>
          <p className="empty-state__text">
            The first generation is still alive. Keep posting to sustain it.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {generations.map((gen) => (
            <div key={gen.id} className="graveyard-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Generation {gen.generationNum}
                  </p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                    {formatDate(gen.startedAt)} → {formatDate(gen.endedAt)}
                  </p>
                </div>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  background: gen.endReason === 'ADMIN_RESET' ? 'rgba(153,27,27,0.1)' : 'var(--color-surface-2)',
                  color: gen.endReason === 'ADMIN_RESET' ? 'var(--color-critical)' : 'var(--color-text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}>
                  {gen.endReason === 'ADMIN_RESET' ? 'Admin Reset' : 'Expired'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <p className="graveyard-stat">{gen.postCount ?? 0}</p>
                  <p className="graveyard-label">Posts</p>
                </div>
                <div>
                  <p className="graveyard-stat">{gen.replyCount ?? 0}</p>
                  <p className="graveyard-label">Replies</p>
                </div>
                <div>
                  <p className="graveyard-stat">{gen.reactionCount ?? 0}</p>
                  <p className="graveyard-label">Reactions</p>
                </div>
                <div>
                  <p className="graveyard-stat">{gen.saveCount}</p>
                  <p className="graveyard-label">Times saved</p>
                </div>
                <div>
                  <p className="graveyard-stat">{formatDuration(gen.totalDurationMs)}</p>
                  <p className="graveyard-label">Total lifespan</p>
                </div>
                <div>
                  <p className="graveyard-stat">{formatDuration(gen.longestThreadMs)}</p>
                  <p className="graveyard-label">Longest thread</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
