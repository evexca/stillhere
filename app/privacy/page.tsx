import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — Stillhere',
  description: 'Privacy Policy for Stillhere — how we handle anonymous identity and data deletion.',
};

export default function PrivacyPage() {
  return (
    <div className="container page-body">
      <article className="legal-content">
        <h1>Privacy Policy</h1>
        <p><em>Last updated: August 2026</em></p>

        <p>
          At Stillhere, privacy is not an afterthought — it is built into the architecture. We do not require accounts, usernames, email addresses, or phone numbers.
        </p>

        <h2>1. Information We Store</h2>
        <ul>
          <li>
            <strong>Anonymous Identity Token:</strong> A randomly generated token stored exclusively in an HttpOnly, Secure browser cookie. The server only stores a cryptographic SHA-256 hash of this token.
          </li>
          <li>
            <strong>Content Submissions:</strong> Posts, replies, and reactions you submit are linked to your device hash so you can view them in &quot;My Activity.&quot;
          </li>
          <li>
            <strong>Rate Limit Records:</strong> Temporary counters to prevent abuse, automatically purged after 48 hours.
          </li>
        </ul>

        <h2>2. Data Deletion and Ephemerality</h2>
        <p>
          Content on Stillhere is temporary by design. When a post expires or when a site generation ends:
        </p>
        <ul>
          <li>All content text is permanently nullified and purged from the database.</li>
          <li>Only anonymized, aggregate metrics (such as total post count and lifespan) are retained in the Graveyard log.</li>
        </ul>

        <h2>3. Cookies</h2>
        <p>
          We use a single essential cookie (<code>_sh_id</code>) strictly required for operating the anonymous identity system. We do not use tracking cookies or third-party behavioral advertising cookies.
        </p>

        <h2>4. Data Sharing</h2>
        <p>
          We do not sell, rent, or trade your data to third parties.
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
