'use client';
import { useTheme } from '../ThemeProvider';

const modes = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => setMode(m.value)}
          aria-pressed={mode === m.value}
          style={{
            fontSize: '0.75rem',
            padding: '3px 8px',
            borderRadius: '99px',
            border: mode === m.value ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border)',
            background: mode === m.value ? 'var(--color-accent-dim)' : 'transparent',
            color: mode === m.value ? 'var(--color-text)' : 'var(--color-text-muted)',
            fontWeight: mode === m.value ? 600 : 400,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 150ms ease',
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
