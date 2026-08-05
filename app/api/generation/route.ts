/**
 * GET /api/generation
 * Returns the current site generation state for the countdown widget.
 * Cached for a short time; the client re-syncs every 60 seconds.
 */
import { NextResponse } from 'next/server';
import { getGenerationSummary } from '@/services/generation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const summary = await getGenerationSummary();
    return NextResponse.json(summary, {
      headers: {
        'Cache-Control': 'public, max-age=10, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    console.error('[generation] Error fetching summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch generation data.' },
      { status: 500 }
    );
  }
}
