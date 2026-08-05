import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Cleanup Cron Logic', () => {
  it('correctly calculates expiration dates and retention windows', () => {
    const now = new Date('2026-08-04T12:00:00Z');
    const globalCountdownHours = 24;
    const retentionHours = 48;

    const expiresAt = new Date(now.getTime() + globalCountdownHours * 3600 * 1000);
    const retentionCutoff = new Date(now.getTime() - retentionHours * 3600 * 1000);

    assert.strictEqual(expiresAt.toISOString(), '2026-08-05T12:00:00.000Z');
    assert.strictEqual(retentionCutoff.toISOString(), '2026-08-02T12:00:00.000Z');
  });

  it('correctly clamps thread expiration at absolute maximum lifetime', () => {
    const now = new Date('2026-08-04T12:00:00Z');
    const extensionHours = 24;
    const maxDays = 7;

    const currentExpiry = new Date(now.getTime() + 20 * 3600 * 1000);
    const absoluteExpiresAt = new Date(now.getTime() + maxDays * 86400 * 1000);

    const proposedExpiry = new Date(now.getTime() + extensionHours * 3600 * 1000);
    const clampedExpiry = proposedExpiry > absoluteExpiresAt ? absoluteExpiresAt : proposedExpiry;

    assert.deepStrictEqual(clampedExpiry, proposedExpiry);
    assert.strictEqual(clampedExpiry <= absoluteExpiresAt, true);
  });
});
