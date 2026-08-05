import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About — Stillhere',
  description: 'Learn about Stillhere — an anonymous, ephemeral social network built on borrowed time.',
};

export default function AboutPage() {
  return (
    <div className="container page-body">
      <article className="legal-content">
        <h1>About Stillhere</h1>
        <p>
          Stillhere is an experiment in digital ephemerality. In a world where every post, image, and message is recorded forever, Stillhere asks a simple question: <em>What happens when nothing lasts?</em>
        </p>

        <h2>The Borrowed Time Concept</h2>
        <p>
          The website itself exists on borrowed time. A global 24-hour countdown clock is constantly ticking. Every time someone posts a new top-level thought, confession, or question, the global countdown resets to 24 hours. The post that reset the clock is designated as the post that <strong>saved the website</strong>.
        </p>
        <p>
          If the clock reaches zero, the current generation ends. All posts, replies, and reactions from that generation are permanently purged. The site then begins anew as Generation N+1.
        </p>

        <h2>Individual Thread Lifespans</h2>
        <p>
          In addition to the global countdown, every individual post has its own lifetime:
        </p>
        <ul>
          <li><strong>Initial Expiration:</strong> Every new post starts with a 24-hour expiration timer.</li>
          <li><strong>Extension through Interaction:</strong> Each valid reply or new reaction extends the post&apos;s life by 24 hours.</li>
          <li><strong>Absolute Cap:</strong> No post can live longer than 7 days, regardless of activity.</li>
        </ul>

        <h2>Anonymous Identity</h2>
        <p>
          Stillhere requires no account registration, no email address, and no password. You are completely anonymous. An encrypted device hash stored in an HttpOnly cookie keeps track of your posts and replies locally on your browser so you can follow your activity in <strong>My Activity</strong>.
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
