import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function generateRoomKey(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export const ENVIRONMENTS = [
  { id: 'rainy-cafe',   label: 'Rainy Café',          emoji: '☕' },
  { id: 'library',      label: 'Library',              emoji: '📚' },
  { id: 'coding-den',   label: 'Late Night Code',      emoji: '💻' },
  { id: 'nature',       label: 'Forest',               emoji: '🌿' },
] as const

export type EnvironmentId = typeof ENVIRONMENTS[number]['id']

export const STATUS_LABELS: Record<string, string> = {
  active:  'Focused',
  away:    'Away',
  break:   'On Break',
}

export const STATUS_COLORS: Record<string, string> = {
  active: '#7d9e84',
  away:   '#c86452',
  break:  '#9b8dbc',
}

export const REACTIONS = [
  { id: 'locked',  emoji: '🔒', label: 'Locked In' },
  { id: 'fire',    emoji: '🔥', label: 'On Fire' },
  { id: 'coffee',  emoji: '☕', label: 'Need Coffee' },
  { id: 'check',   emoji: '✅', label: 'Task Done' },
  { id: 'wave',    emoji: '👋', label: 'Hey!' },
] as const
