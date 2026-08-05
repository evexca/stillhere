import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAdminFromSession } from '@/lib/auth';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';

export const metadata: Metadata = {
  title: 'Admin — Stillhere',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const admin = await getAdminFromSession();
  if (admin) {
    redirect('/admin/dashboard');
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100dvh',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '380px',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.375rem',
          fontWeight: 700,
          marginBottom: '0.5rem',
        }}>
          Admin Login
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
          Stillhere moderation panel
        </p>
        <AdminLoginForm />
      </div>
    </div>
  );
}
