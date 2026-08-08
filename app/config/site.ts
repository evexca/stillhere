/**
 * Central configuration for Stillhere.
 * Change branding, timing, and feature flags here.
 */

export const SITE_CONFIG = {
  name: 'Stillhere',
  tagline: 'Nothing here is permanent. Post, respond, or let it disappear.',
  logoText: 'STILLHERE',
  supportEmail: process.env.SUPPORT_EMAIL ?? 'support@stillhere.app',
  appUrl: process.env.APP_URL ?? 'http://localhost:3000',

  // Social / SEO
  socialDescription:
    'An anonymous space where nothing lasts forever. Share confessions, secrets, and thoughts — before they disappear.',

  // Countdown & expiration (read from env at runtime)
  globalCountdownHours: parseInt(process.env.GLOBAL_COUNTDOWN_HOURS ?? '24', 10),
  threadExpirationHours: parseInt(process.env.THREAD_EXPIRATION_HOURS ?? '24', 10),
  threadMaxLifetimeDays: parseInt(process.env.THREAD_MAX_LIFETIME_DAYS ?? '7', 10),

  // Cooldowns (seconds)
  postCooldownSeconds: parseInt(process.env.POST_COOLDOWN_SECONDS ?? '10', 10),
  replyCooldownSeconds: parseInt(process.env.REPLY_COOLDOWN_SECONDS ?? '5', 10),

  // Rate limits
  maxPostsPerHour: parseInt(process.env.MAX_POSTS_PER_HOUR ?? '5', 10),
  maxRepliesPerHour: parseInt(process.env.MAX_REPLIES_PER_HOUR ?? '20', 10),
  maxReportsPerHour: parseInt(process.env.MAX_REPORTS_PER_HOUR ?? '10', 10),
  maxReactionChangesPerMinute: parseInt(process.env.MAX_REACTION_CHANGES_PER_MINUTE ?? '10', 10),

  // Night mode (24h clock hours, local browser time)
  nightModeStartHour: parseInt(process.env.NIGHT_MODE_START_HOUR ?? '19', 10),
  nightModeEndHour: parseInt(process.env.NIGHT_MODE_END_HOUR ?? '7', 10),

  // Pagination
  feedPageSize: 20,

  // Reaction debounce (ms)
  reactionDebounceMs: 500,

  // Reaction labels (displayed in UI)
  reactions: [
    { type: 'UNDERSTAND', label: 'I understand', emoji: '🫂' },
    { type: 'NOT_ALONE', label: "You're not alone", emoji: '💙' },
    { type: 'THAT_HURT', label: 'That hurt', emoji: '💔' },
    { type: 'NEED_CONTEXT', label: 'I need context', emoji: '🤔' },
    { type: 'TELL_MORE', label: 'Tell us more', emoji: '👂' },
    { type: 'DISAGREE', label: 'I disagree', emoji: '🙅' },
  ] as const,

  // Report reasons
  reportReasons: [
    { value: 'HARASSMENT', label: 'Harassment or bullying' },
    { value: 'THREATS', label: 'Threats or violence' },
    { value: 'PERSONAL_INFO', label: 'Personal information' },
    { value: 'SEXUAL', label: 'Sexual content' },
    { value: 'HATE', label: 'Hate or discrimination' },
    { value: 'SPAM', label: 'Spam' },
    { value: 'ILLEGAL', label: 'Illegal content' },
    { value: 'SELF_HARM', label: 'Self-harm concern' },
    { value: 'OTHER', label: 'Other' },
  ] as const,
} as const;

export type ReactionType = typeof SITE_CONFIG.reactions[number]['type'];
export type ReportReason = typeof SITE_CONFIG.reportReasons[number]['value'];
