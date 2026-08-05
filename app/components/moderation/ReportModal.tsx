'use client';
/**
 * ReportModal — accessible modal for reporting content.
 */
import { useState, useEffect, useRef } from 'react';
import { SITE_CONFIG } from '../../config/site';
import { useToast } from '../ui/ToastProvider';

interface ReportModalProps {
  targetId: string;
  targetType: 'POST' | 'REPLY';
  onClose: () => void;
}

export function ReportModal({ targetId, targetType, onClose }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { showToast } = useToast();
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Focus trap and escape key
  useEffect(() => {
    firstFocusRef.current?.focus();
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId, targetType, reason, note: note.trim() || undefined }),
      });

      if (res.ok || res.status === 409) {
        setSubmitted(true);
        setTimeout(onClose, 2000);
      } else {
        const data = await res.json() as { error?: string };
        showToast(data.error ?? 'Failed to submit report.', 'error');
        setIsSubmitting(false);
      }
    } catch {
      showToast('Connection error. Please try again.', 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      ref={backdropRef}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="modal">
        <div className="modal__header">
          <h2 className="modal__title" id="report-modal-title">
            Report Content
          </h2>
          <button
            ref={firstFocusRef}
            onClick={onClose}
            className="btn btn--ghost btn--sm"
            aria-label="Close report dialog"
          >
            ✕
          </button>
        </div>

        {submitted ? (
          <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '1rem 0' }}>
            Thank you. We&apos;ve received your report.
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <fieldset style={{ border: 'none', padding: 0, marginBottom: '1rem' }}>
              <legend style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', display: 'block' }}>
                Reason for reporting
              </legend>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {SITE_CONFIG.reportReasons.map(({ value, label }) => (
                  <label
                    key={value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      cursor: 'pointer',
                      fontSize: '0.9375rem',
                      padding: '0.375rem 0',
                    }}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={value}
                      checked={reason === value}
                      onChange={(e) => setReason(e.target.value)}
                      required
                      style={{ width: 'auto', accentColor: 'var(--color-accent)' }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="report-note"
                style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}
              >
                Additional details{' '}
                <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                id="report-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Briefly describe your concern..."
                maxLength={500}
                rows={2}
                style={{ minHeight: 60 }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn--secondary btn--sm" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className={`btn btn--primary btn--sm${isSubmitting ? ' btn--loading' : ''}`}
                disabled={!reason || isSubmitting}
              >
                {isSubmitting ? <span className="visually-hidden">Submitting...</span> : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
