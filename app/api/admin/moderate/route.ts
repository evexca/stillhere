/**
 * Admin content moderation API routes.
 * All routes require a valid admin session.
 *
 * GET  /api/admin/moderate?type=posts|reports — List posts or reports
 * PUT  /api/admin/moderate — Hide, restore, or delete content
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromSession } from '@/lib/auth';
import { logModerationAction } from '@/services/moderation';
import { z } from 'zod';

export const runtime = 'nodejs';

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const admin = await getAdminFromSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'posts';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  try {
    if (type === 'reports') {
      const statusFilter = searchParams.get('status') as 'PENDING' | 'REVIEWED' | 'ACTIONED' | 'DISMISSED' | null;
      const reports = await prisma.report.findMany({
        where: statusFilter ? { status: statusFilter } : {},
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          reason: true,
          note: true,
          status: true,
          createdAt: true,
          targetType: true,
          post: {
            select: {
              publicId: true,
              content: true,
              status: true,
            },
          },
          reply: {
            select: {
              publicId: true,
              content: true,
              status: true,
            },
          },
        },
      });

      const total = await prisma.report.count({
        where: statusFilter ? { status: statusFilter } : {},
      });

      return NextResponse.json({ reports, total, page, pageSize });
    }

    if (type === 'blocked-terms') {
      const terms = await prisma.blockedTerm.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ terms });
    }

    if (type === 'themes') {
      const themes = await prisma.dailyTheme.findMany({
        orderBy: { sortOrder: 'asc' },
      });
      return NextResponse.json({ themes });
    }

    // Default: posts
    const statusFilter = searchParams.get('status') as 'ACTIVE' | 'HIDDEN' | 'DELETED' | null;
    const search = searchParams.get('q');

    const posts = await prisma.post.findMany({
      where: {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(search ? { content: { contains: search } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        publicId: true,
        content: true,
        status: true,
        createdAt: true,
        replyCount: true,
        reactionCount: true,
        expiresAt: true,
        generation: { select: { generationNum: true } },
      },
    });

    const total = await prisma.post.count({
      where: {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(search ? { content: { contains: search } } : {}),
      },
    });

    return NextResponse.json({
      posts: posts.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        expiresAt: p.expiresAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('[admin/moderate] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch data.' }, { status: 500 });
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────

const ActionSchema = z.object({
  action: z.enum([
    'HIDE_POST', 'RESTORE_POST', 'DELETE_POST',
    'HIDE_REPLY', 'RESTORE_REPLY', 'DELETE_REPLY',
    'DISMISS_REPORT', 'ACTION_REPORT',
    'ADD_BLOCKED_TERM', 'TOGGLE_BLOCKED_TERM', 'DELETE_BLOCKED_TERM',
    'ADD_THEME', 'TOGGLE_THEME', 'DELETE_THEME',
  ]),
  targetId: z.string().optional().default(''),
  pattern: z.string().optional(),
  isRegex: z.boolean().optional(),
  themeText: z.string().optional(),
  reason: z.string().max(500).optional(),
});

export async function PUT(request: NextRequest) {
  const admin = await getAdminFromSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const parseResult = ActionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 422 });
    }

    const { action, targetId, pattern, isRegex, themeText, reason } = parseResult.data;

    if (action === 'HIDE_POST') {
      const post = await prisma.post.findUnique({ where: { publicId: targetId }, select: { id: true } });
      if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
      await prisma.post.update({ where: { id: post.id }, data: { status: 'HIDDEN' } });
      await logModerationAction(admin.id, 'HIDE_POST', 'POST', post.id, reason);
    } else if (action === 'RESTORE_POST') {
      const post = await prisma.post.findUnique({ where: { publicId: targetId }, select: { id: true, expiresAt: true } });
      if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
      if (post.expiresAt < new Date()) {
        return NextResponse.json({ error: 'This post has expired and cannot be restored.' }, { status: 409 });
      }
      await prisma.post.update({ where: { id: post.id }, data: { status: 'ACTIVE' } });
      await logModerationAction(admin.id, 'RESTORE_POST', 'POST', post.id, reason);
    } else if (action === 'DELETE_POST') {
      const post = await prisma.post.findUnique({ where: { publicId: targetId }, select: { id: true } });
      if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
      await prisma.post.update({
        where: { id: post.id },
        data: { status: 'DELETED', content: '' },
      });
      await prisma.reply.updateMany({
        where: { postId: post.id },
        data: { status: 'DELETED', content: '' },
      });
      await logModerationAction(admin.id, 'DELETE_POST', 'POST', post.id, reason);
    } else if (action === 'HIDE_REPLY') {
      const reply = await prisma.reply.findUnique({ where: { publicId: targetId }, select: { id: true } });
      if (!reply) return NextResponse.json({ error: 'Reply not found.' }, { status: 404 });
      await prisma.reply.update({ where: { id: reply.id }, data: { status: 'HIDDEN' } });
      await logModerationAction(admin.id, 'HIDE_REPLY', 'REPLY', reply.id, reason);
    } else if (action === 'RESTORE_REPLY') {
      const reply = await prisma.reply.findUnique({ where: { publicId: targetId }, select: { id: true } });
      if (!reply) return NextResponse.json({ error: 'Reply not found.' }, { status: 404 });
      await prisma.reply.update({ where: { id: reply.id }, data: { status: 'ACTIVE' } });
      await logModerationAction(admin.id, 'RESTORE_REPLY', 'REPLY', reply.id, reason);
    } else if (action === 'DELETE_REPLY') {
      const reply = await prisma.reply.findUnique({ where: { publicId: targetId }, select: { id: true } });
      if (!reply) return NextResponse.json({ error: 'Reply not found.' }, { status: 404 });
      await prisma.reply.update({ where: { id: reply.id }, data: { status: 'DELETED', content: '' } });
      await logModerationAction(admin.id, 'DELETE_REPLY', 'REPLY', reply.id, reason);
    } else if (action === 'DISMISS_REPORT' || action === 'ACTION_REPORT') {
      const report = await prisma.report.findUnique({ where: { id: targetId } });
      if (!report) return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
      await prisma.report.update({
        where: { id: targetId },
        data: {
          status: action === 'ACTION_REPORT' ? 'ACTIONED' : 'DISMISSED',
          reviewedAt: new Date(),
        },
      });
      await logModerationAction(admin.id, action, 'REPORT', targetId, reason);
    } else if (action === 'ADD_BLOCKED_TERM') {
      if (!pattern?.trim()) return NextResponse.json({ error: 'Pattern is required.' }, { status: 400 });
      await prisma.blockedTerm.create({
        data: { pattern: pattern.trim(), isRegex: !!isRegex, active: true },
      });
      await logModerationAction(admin.id, 'ADD_BLOCKED_TERM', 'BLOCKED_TERM', pattern);
    } else if (action === 'TOGGLE_BLOCKED_TERM') {
      const termId = parseInt(targetId, 10);
      const term = await prisma.blockedTerm.findUnique({ where: { id: termId } });
      if (!term) return NextResponse.json({ error: 'Term not found.' }, { status: 404 });
      await prisma.blockedTerm.update({ where: { id: termId }, data: { active: !term.active } });
      await logModerationAction(admin.id, 'TOGGLE_BLOCKED_TERM', 'BLOCKED_TERM', targetId);
    } else if (action === 'DELETE_BLOCKED_TERM') {
      await prisma.blockedTerm.delete({ where: { id: parseInt(targetId, 10) } });
      await logModerationAction(admin.id, 'DELETE_BLOCKED_TERM', 'BLOCKED_TERM', targetId);
    } else if (action === 'ADD_THEME') {
      if (!themeText?.trim()) return NextResponse.json({ error: 'Theme text is required.' }, { status: 400 });
      const count = await prisma.dailyTheme.count();
      await prisma.dailyTheme.create({
        data: { text: themeText.trim(), sortOrder: count + 1, active: true },
      });
      await logModerationAction(admin.id, 'ADD_THEME', 'DAILY_THEME', themeText);
    } else if (action === 'TOGGLE_THEME') {
      const themeId = parseInt(targetId, 10);
      const theme = await prisma.dailyTheme.findUnique({ where: { id: themeId } });
      if (!theme) return NextResponse.json({ error: 'Theme not found.' }, { status: 404 });
      await prisma.dailyTheme.update({ where: { id: themeId }, data: { active: !theme.active } });
      await logModerationAction(admin.id, 'TOGGLE_THEME', 'DAILY_THEME', targetId);
    } else if (action === 'DELETE_THEME') {
      await prisma.dailyTheme.delete({ where: { id: parseInt(targetId, 10) } });
      await logModerationAction(admin.id, 'DELETE_THEME', 'DAILY_THEME', targetId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/moderate] PUT error:', error);
    return NextResponse.json({ error: 'Action failed.' }, { status: 500 });
  }
}
