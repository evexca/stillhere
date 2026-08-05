/**
 * Daily theme service.
 * Rotates themes by UTC day — consistent for all users on the same day.
 */
import { prisma } from '@/lib/prisma';

/**
 * Get the theme for today (UTC day).
 * Returns null if no themes are active.
 */
export async function getTodayTheme(): Promise<{ id: number; text: string } | null> {
  const themes = await prisma.dailyTheme.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, text: true },
  });

  if (themes.length === 0) return null;

  // Rotate by UTC day
  const dayIndex = Math.floor(Date.now() / (86400 * 1000));
  const theme = themes[dayIndex % themes.length];
  return theme;
}
