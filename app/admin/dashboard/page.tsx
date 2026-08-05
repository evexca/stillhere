import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAdminFromSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient';

export const metadata: Metadata = {
  title: 'Admin Dashboard — Stillhere',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const admin = await getAdminFromSession();
  if (!admin) {
    redirect('/admin');
  }

  const [totalPosts, pendingReports, activeGeneration, blockedTerms] = await Promise.all([
    prisma.post.count(),
    prisma.report.count({ where: { status: 'PENDING' } }),
    prisma.siteGeneration.findFirst({ where: { status: 'ACTIVE' }, select: { generationNum: true, expiresAt: true, postCount: true, saveCount: true } }),
    prisma.blockedTerm.count({ where: { active: true } }),
  ]);

  return (
    <AdminDashboardClient
      adminEmail={admin.email}
      stats={{
        totalPosts,
        pendingReports,
        blockedTerms,
        generation: activeGeneration ? {
          num: activeGeneration.generationNum,
          expiresAt: activeGeneration.expiresAt.toISOString(),
          postCount: activeGeneration.postCount,
          saveCount: activeGeneration.saveCount,
        } : null,
      }}
    />
  );
}
