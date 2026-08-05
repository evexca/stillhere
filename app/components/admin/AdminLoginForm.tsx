'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Login failed.');
        return;
      }

      router.push('/admin/dashboard');
      router.refresh();
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="admin-email" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
          Email
        </label>
        <input
          id="admin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
          disabled={isLoading}
        />
      </div>
      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="admin-password" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          disabled={isLoading}
        />
      </div>
      {error && (
        <p role="alert" style={{ fontSize: '0.875rem', color: 'var(--color-critical)', marginBottom: '1rem', fontWeight: 500 }}>
          {error}
        </p>
      )}
      <button
        type="submit"
        className={`btn btn--primary${isLoading ? ' btn--loading' : ''}`}
        disabled={isLoading}
        style={{ width: '100%' }}
      >
        {isLoading ? <span className="visually-hidden">Signing in...</span> : 'Sign In'}
      </button>
    </form>
  );
}
