/**
 * Zod validation schemas for all user-submitted data.
 */
import { z } from 'zod';
import { SITE_CONFIG } from '@/config/site';

// ─── Post ──────────────────────────────────────────────────────────────────

export const CreatePostSchema = z.object({
  content: z
    .string()
    .min(3, 'Your post needs at least 3 characters.')
    .max(1000, 'Your post is too long. Maximum 1,000 characters.')
    .refine((v) => v.trim().length >= 3, 'Your post needs at least 3 characters.'),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;

// ─── Reply ─────────────────────────────────────────────────────────────────

export const CreateReplySchema = z.object({
  content: z
    .string()
    .min(2, 'Your reply needs at least 2 characters.')
    .max(750, 'Your reply is too long. Maximum 750 characters.')
    .refine((v) => v.trim().length >= 2, 'Your reply needs at least 2 characters.'),
  postId: z.string().min(1),          // public ID of the root post
  parentReplyId: z.string().nullable().optional(), // public ID of parent reply (if nested)
});

export type CreateReplyInput = z.infer<typeof CreateReplySchema>;

// ─── Reaction ──────────────────────────────────────────────────────────────

export const ReactSchema = z.object({
  targetType: z.enum(['POST', 'REPLY']),
  targetId: z.string().min(1),        // public ID of the target
  reactionType: z.enum([
    'UNDERSTAND',
    'NOT_ALONE',
    'THAT_HURT',
    'NEED_CONTEXT',
    'TELL_MORE',
    'DISAGREE',
  ]),
  action: z.enum(['ADD', 'REMOVE']),
});

export type ReactInput = z.infer<typeof ReactSchema>;

// ─── Report ────────────────────────────────────────────────────────────────

export const CreateReportSchema = z.object({
  targetType: z.enum(['POST', 'REPLY']),
  targetId: z.string().min(1),
  reason: z.enum([
    'HARASSMENT',
    'THREATS',
    'PERSONAL_INFO',
    'SEXUAL',
    'HATE',
    'SPAM',
    'ILLEGAL',
    'SELF_HARM',
    'OTHER',
  ]),
  note: z
    .string()
    .max(500, 'Report note is too long.')
    .optional(),
});

export type CreateReportInput = z.infer<typeof CreateReportSchema>;

// ─── Admin ─────────────────────────────────────────────────────────────────

export const AdminLoginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export type AdminLoginInput = z.infer<typeof AdminLoginSchema>;

// ─── Feed Query ────────────────────────────────────────────────────────────

export const FeedQuerySchema = z.object({
  filter: z
    .enum(['LIVE', 'DISCUSSED', 'DISAPPEARING'])
    .default('LIVE'),
  cursor: z.string().optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(SITE_CONFIG.feedPageSize),
});

export type FeedQuery = z.infer<typeof FeedQuerySchema>;
