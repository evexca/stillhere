import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  CreatePostSchema,
  CreateReplySchema,
  ReactSchema,
  CreateReportSchema,
  AdminLoginSchema,
} from '../app/lib/validation';

describe('Validation Schemas', () => {
  describe('CreatePostSchema', () => {
    it('accepts valid post inputs', () => {
      const res = CreatePostSchema.safeParse({
        content: 'This is a valid post content with enough characters.',
      });
      assert.strictEqual(res.success, true);
    });

    it('rejects post content shorter than 3 characters', () => {
      const res = CreatePostSchema.safeParse({ content: 'hi' });
      assert.strictEqual(res.success, false);
    });

    it('rejects post content exceeding 1000 characters', () => {
      const res = CreatePostSchema.safeParse({ content: 'a'.repeat(1001) });
      assert.strictEqual(res.success, false);
    });
  });

  describe('CreateReplySchema', () => {
    it('accepts valid reply inputs', () => {
      const res = CreateReplySchema.safeParse({
        content: 'I agree with your point.',
        postId: 'post_123',
      });
      assert.strictEqual(res.success, true);
    });

    it('rejects reply content shorter than 2 characters', () => {
      const res = CreateReplySchema.safeParse({ content: 'x', postId: 'post_123' });
      assert.strictEqual(res.success, false);
    });
  });

  describe('ReactSchema', () => {
    it('accepts valid reaction inputs', () => {
      const res = ReactSchema.safeParse({
        targetType: 'POST',
        targetId: 'post_123',
        reactionType: 'UNDERSTAND',
        action: 'ADD',
      });
      assert.strictEqual(res.success, true);
    });

    it('rejects invalid reaction types', () => {
      const res = ReactSchema.safeParse({
        targetType: 'POST',
        targetId: 'post_123',
        reactionType: 'LIKE', // not in enum
        action: 'ADD',
      });
      assert.strictEqual(res.success, false);
    });
  });

  describe('CreateReportSchema', () => {
    it('accepts valid report inputs', () => {
      const res = CreateReportSchema.safeParse({
        targetType: 'POST',
        targetId: 'post_123',
        reason: 'HARASSMENT',
        note: 'Contains harassment',
      });
      assert.strictEqual(res.success, true);
    });
  });

  describe('AdminLoginSchema', () => {
    it('validates admin email and password', () => {
      const valid = AdminLoginSchema.safeParse({
        email: 'admin@stillhere.app',
        password: 'securepassword123',
      });
      assert.strictEqual(valid.success, true);

      const invalid = AdminLoginSchema.safeParse({
        email: 'invalid-email',
        password: '',
      });
      assert.strictEqual(invalid.success, false);
    });
  });
});
