import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — Stillhere',
  description: 'Terms of Service for using the Stillhere application.',
};

export default function TermsPage() {
  return (
    <div className="container page-body">
      <article className="legal-content">
        <h1>Terms of Service</h1>
        <p><em>Last updated: August 2026</em></p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using Stillhere, you agree to be bound by these Terms of Service and our Community Guidelines. If you do not agree, do not use the platform.
        </p>

        <h2>2. Ephemeral Nature of Content</h2>
        <p>
          You acknowledge and understand that Stillhere is an ephemeral platform. All posts, replies, reactions, and data are subject to automatic expiration and permanent deletion. Stillhere guarantees no data retention, backups, or retrieval of past content.
        </p>

        <h2>3. User Conduct</h2>
        <p>
          You agree not to post content that is illegal, harmful, threatening, harassing, defamatory, or infringing on intellectual property or personal privacy rights.
        </p>

        <h2>4. Moderation and Content Removal</h2>
        <p>
          Stillhere reserves the right to remove, hide, or restrict access to any content at any time, for any reason, without notice.
        </p>

        <h2>5. Disclaimer of Warranties</h2>
        <p>
          The service is provided &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; without warranties of any kind, express or implied.
        </p>

        <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
          <Link href="/" className="btn btn--primary">
            Return to Feed
          </Link>
        </div>
      </article>
    </div>
  );
}
