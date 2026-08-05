import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Community Guidelines — Stillhere',
  description: 'Community guidelines and code of conduct for Stillhere.',
};

export default function GuidelinesPage() {
  return (
    <div className="container page-body">
      <article className="legal-content">
        <h1>Community Guidelines</h1>
        <p>
          Stillhere is a safe space for raw, honest, and temporary human expression. Anonymity requires trust and responsibility from everyone in the community.
        </p>

        <h2>1. Zero Tolerance for Harm</h2>
        <p>
          We strictly prohibit content that incites, promotes, or details self-harm, suicide, violence against others, hate speech, or illegal acts.
        </p>

        <h2>2. Respect Personal Privacy (No Doxxing)</h2>
        <p>
          Never post personally identifiable information (PII) about yourself or anyone else. This includes full names, addresses, phone numbers, email addresses, social security numbers, workplace details, or social media handles.
        </p>

        <h2>3. No Harassment or Bullying</h2>
        <p>
          Targeting individuals or groups with malicious intent, harassment, threats, or intimidation is forbidden.
        </p>

        <h2>4. No Spam or Commercial Exploitation</h2>
        <p>
          Do not use Stillhere for commercial advertising, affiliate links, self-promotion, repetitive text, or automated spamming.
        </p>

        <h2>5. Reporting Violations</h2>
        <p>
          If you see content that violates these guidelines, use the <strong>Report</strong> button on any post or reply. Reports are reviewed by our moderation team.
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
