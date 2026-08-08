'use client';
/**
 * GlobalCountdown — displays and manages the site countdown timer.
 * Syncs with server every 60 seconds to prevent drift.
 * Uses aria-live for accessible announcements every 5 minutes.
 */
import { useEffect, useRef, useState, useCallback } from 'react';

interface CountdownProps {
  initialExpiresAt: string; // ISO timestamp from server
}

interface GenerationData {
  expiresAt: string;
  generationNum: number;
  saveCount: number;
  activePostCount: number;
  activeReplyCount: number;
}

function formatTime(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((v) => String(v).padStart(2, '0'))
    .join(':');
}

function getUrgencyClass(ms: number): string {
  if (ms <= 60_000) return 'countdown-display--critical';
  if (ms <= 600_000) return 'countdown-display--urgent';
  if (ms <= 3_600_000) return 'countdown-display--warning';
  return '';
}

function formatAccessibleTime(ms: number): string {
  if (ms <= 0) return 'The website has expired.';
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 1) return 'Less than a minute remaining.';
  if (totalMinutes < 60) return `About ${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''} remaining.`;
  const hours = Math.floor(totalMinutes / 60);
  return `About ${hours} hour${hours !== 1 ? 's' : ''} remaining.`;
}

export function GlobalCountdown({ initialExpiresAt }: CountdownProps) {
  const [expiresAt, setExpiresAt] = useState(() => new Date(initialExpiresAt).getTime());
  const [remaining, setRemaining] = useState(0);
  const [genData, setGenData] = useState<Omit<GenerationData, 'expiresAt'> | null>(null);
  const [a11yAnnounce, setA11yAnnounce] = useState('');
  const lastAnnounceRef = useRef(0);

  // Sync with server
  const syncWithServer = useCallback(async () => {
    try {
      const res = await fetch('/api/generation', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json() as GenerationData;
      setExpiresAt(new Date(data.expiresAt).getTime());
      setGenData({
        generationNum: data.generationNum,
        saveCount: data.saveCount,
        activePostCount: data.activePostCount,
        activeReplyCount: data.activeReplyCount,
      });
    } catch {}
  }, []);

  // Initial sync
  useEffect(() => {
    syncWithServer();
    const interval = setInterval(syncWithServer, 60_000);
    return () => clearInterval(interval);
  }, [syncWithServer]);

  // Re-sync immediately when a new post resets the generation countdown
  useEffect(() => {
    window.addEventListener('stillhere:generation-refresh', syncWithServer);
    return () => window.removeEventListener('stillhere:generation-refresh', syncWithServer);
  }, [syncWithServer]);

  // Tick every second
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const ms = Math.max(0, expiresAt - now);
      setRemaining(ms);

      // Announce to screen readers every 5 minutes
      const now5min = Math.floor(now / 300_000);
      if (now5min !== lastAnnounceRef.current) {
        lastAnnounceRef.current = now5min;
        setA11yAnnounce(formatAccessibleTime(ms));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const urgencyClass = getUrgencyClass(remaining);

  return (
    <div className="countdown-wrapper">
      <p className="countdown-label" aria-hidden="true">
        Generation {genData?.generationNum ?? '—'} · Time remaining
      </p>

      {/* Visual countdown — aria-hidden to prevent second-by-second noise */}
      <div
        className={`countdown-display ${urgencyClass}`}
        aria-hidden="true"
      >
        {formatTime(remaining)}
      </div>

      {/* Accessible announcement — updated every 5 minutes */}
      <p
        aria-live="polite"
        aria-atomic="true"
        className="visually-hidden"
      >
        {a11yAnnounce}
      </p>

      {genData && (
        <div className="countdown-meta" aria-label="Current generation statistics">
          <span className="countdown-meta__item">
            <span aria-hidden="true">✍</span>
            <span>{genData.activePostCount} post{genData.activePostCount !== 1 ? 's' : ''}</span>
          </span>
          <span className="countdown-meta__item">
            <span aria-hidden="true">💬</span>
            <span>{genData.activeReplyCount} repl{genData.activeReplyCount !== 1 ? 'ies' : 'y'}</span>
          </span>
          <span className="countdown-meta__item">
            <span aria-hidden="true">🛡</span>
            <span>Saved {genData.saveCount} time{genData.saveCount !== 1 ? 's' : ''}</span>
          </span>
        </div>
      )}

      {remaining <= 600_000 && remaining > 0 && (
        <p
          style={{
            fontSize: '0.8125rem',
            color: 'var(--color-text-muted)',
            marginTop: '0.75rem',
            textAlign: 'center',
          }}
          aria-live="polite"
        >
          Respond or react to keep this conversation alive.
        </p>
      )}
    </div>
  );
}
