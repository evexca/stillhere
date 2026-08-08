import { describe, it } from 'node:test';
import assert from 'node:assert';
import { shouldInsertAdAfter } from '../app/lib/ads';
import { ADS_ENABLED, ADSENSE_SLOTS } from '../app/components/ads/config';

describe('Ads Module', () => {
  it('ads are disabled and no slots configured when env vars are unset', () => {
    assert.strictEqual(ADS_ENABLED, false);
    assert.strictEqual(ADSENSE_SLOTS.sidebarLeft, '');
    assert.strictEqual(ADSENSE_SLOTS.sidebarRight, '');
    assert.strictEqual(ADSENSE_SLOTS.inFeed, '');
  });

  it('shouldInsertAdAfter is false before the first 20 items', () => {
    for (let i = 0; i < 19; i++) {
      assert.strictEqual(shouldInsertAdAfter(i), false, `index ${i} should not insert an ad`);
    }
  });

  it('shouldInsertAdAfter is true at the 20th and 40th item', () => {
    assert.strictEqual(shouldInsertAdAfter(19), true);
    assert.strictEqual(shouldInsertAdAfter(39), true);
  });

  it('shouldInsertAdAfter is false between multiples of 20', () => {
    assert.strictEqual(shouldInsertAdAfter(20), false);
    assert.strictEqual(shouldInsertAdAfter(21), false);
    assert.strictEqual(shouldInsertAdAfter(38), false);
  });

  it('shouldInsertAdAfter respects a custom interval', () => {
    assert.strictEqual(shouldInsertAdAfter(4, 5), true);
    assert.strictEqual(shouldInsertAdAfter(3, 5), false);
  });
});
