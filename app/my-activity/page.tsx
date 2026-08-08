import type { Metadata } from 'next';
import { MyActivityClient } from '@/components/activity/MyActivityClient';
import { PageAdRail } from '@/components/ads/PageAdRail';

export const metadata: Metadata = {
  title: 'My Activity — Stillhere',
  robots: { index: false, follow: false },
};

export default function MyActivityPage() {
  return (
    <PageAdRail>
    <div className="container page-body">
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(1.5rem, 4vw, 2rem)',
        fontWeight: 700,
        letterSpacing: '-0.03em',
        marginBottom: '1.5rem',
      }}>
        My Activity
      </h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '2rem', marginTop: '-0.75rem' }}>
        Your posts, replies, and notifications in this generation. Only you see this.
      </p>
      <MyActivityClient />
    </div>
    </PageAdRail>
  );
}
