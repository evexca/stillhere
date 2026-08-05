import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact Us — Stillhere',
  description: 'Get in touch with the Stillhere team for support or legal inquiries.',
};

export default function ContactPage() {
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@stillhere.app';

  return (
    <div className="container page-body">
      <article className="legal-content">
        <h1>Contact Us</h1>
        <p>
          Have questions, security concerns, or feedback? Reach out to our team below.
        </p>

        <h2>Support & Inquiries</h2>
        <p>
          Email us directly at:{' '}
          <a href={`mailto:${supportEmail}`} style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
            {supportEmail}
          </a>
        </p>

        <h2>Content & Moderation Reports</h2>
        <p>
          To report inappropriate or harmful content, please use the in-app <strong>Report</strong> button located on each post or reply. For urgent legal or copyright notices, contact us via email with relevant details.
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
