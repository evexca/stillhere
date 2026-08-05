import { describe, it } from 'node:test';
import assert from 'node:assert';
import { hashToken, generateToken } from '../app/lib/identity';

describe('Identity Module', () => {
  it('generateToken produces a 64-character hex string', () => {
    const token = generateToken();
    assert.strictEqual(token.length, 64);
    assert.strictEqual(/^[0-9a-f]{64}$/.test(token), true);
  });

  it('generateToken produces unique tokens', () => {
    const token1 = generateToken();
    const token2 = generateToken();
    assert.notStrictEqual(token1, token2);
  });

  it('hashToken produces a consistent SHA-256 HMAC hex string', () => {
    process.env.ANONYMOUS_IDENTITY_SECRET = 'test_secret_key_1234567890_test_secret_key_1234567890_test_secret';
    const rawToken = 'sample_raw_token_value_1234567890';
    const hash1 = hashToken(rawToken);
    const hash2 = hashToken(rawToken);

    assert.strictEqual(hash1.length, 64);
    assert.strictEqual(hash1, hash2);
  });

  it('hashToken produces different hashes for different tokens', () => {
    process.env.ANONYMOUS_IDENTITY_SECRET = 'test_secret_key_1234567890_test_secret_key_1234567890_test_secret';
    const hash1 = hashToken('token_a');
    const hash2 = hashToken('token_b');
    assert.notStrictEqual(hash1, hash2);
  });

  it('throws an error if ANONYMOUS_IDENTITY_SECRET is missing', () => {
    delete process.env.ANONYMOUS_IDENTITY_SECRET;
    assert.throws(() => hashToken('some_token'), /ANONYMOUS_IDENTITY_SECRET is not set/);
  });
});
